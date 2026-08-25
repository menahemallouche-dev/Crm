import * as zlib from "zlib";
import { BackupStatus, BackupStorage, BackupType } from "@prisma/client";
import { BackupService } from "./backup.service";
import { computeModelOrder, toClientPropertyName, BACKUP_EXCLUDED_MODELS } from "./backup-model-order.util";

function buildPrismaMock() {
  const backupRecord = {
    create: jest.fn(async ({ data }: any) => ({ id: "bkp_1", createdAt: new Date(), ...data })),
    update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  };

  const dynamicModels: Record<string, any> = {};
  const base: any = { backupRecord };

  const proxy: any = new Proxy(base, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (!dynamicModels[prop]) {
        dynamicModels[prop] = {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        };
      }
      return dynamicModels[prop];
    },
  });
  proxy.$transaction = jest.fn(async (fn: any) => fn(proxy));
  proxy.$executeRawUnsafe = jest.fn().mockResolvedValue(0);

  return { prisma: proxy, dynamicModels, backupRecord };
}

function buildStorageMock() {
  return {
    isS3Enabled: false,
    save: jest.fn(async (filename: string, data: Buffer) => ({ storage: BackupStorage.LOCAL, location: `/tmp/${filename}` })),
    load: jest.fn(),
    delete: jest.fn(),
    existsLocally: jest.fn().mockReturnValue(true),
  };
}

describe("computeModelOrder", () => {
  it("never includes BackupRecord (would recursively back up backup metadata)", () => {
    expect(computeModelOrder()).not.toContain("BackupRecord");
    expect(BACKUP_EXCLUDED_MODELS.has("BackupRecord")).toBe(true);
  });

  it("orders a model before any model that holds a foreign key to it", () => {
    const order = computeModelOrder();
    expect(order.indexOf("User")).toBeLessThan(order.indexOf("Company"));
    expect(order.indexOf("Company")).toBeLessThan(order.indexOf("Contact"));
    expect(order.indexOf("Company")).toBeLessThan(order.indexOf("Deal"));
    expect(order.indexOf("Deal")).toBeLessThan(order.indexOf("DealStageEvent"));
  });

  it("returns every model exactly once", () => {
    const order = computeModelOrder();
    expect(new Set(order).size).toBe(order.length);
  });
});

describe("toClientPropertyName", () => {
  it("lowercases only the first character", () => {
    expect(toClientPropertyName("CompanyRealEstateAsset")).toBe("companyRealEstateAsset");
    expect(toClientPropertyName("Company")).toBe("company");
  });
});

describe("BackupService.createBackup", () => {
  it("exports every model, gzips the payload, and marks the record COMPLETED", async () => {
    const { prisma, backupRecord } = buildPrismaMock();
    const storage = buildStorageMock();
    const service = new BackupService(prisma, storage as any);

    const result = await service.createBackup(BackupType.MANUAL, "user-1");

    expect(backupRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: BackupType.MANUAL, status: BackupStatus.IN_PROGRESS, triggeredByUserId: "user-1" }) }),
    );
    expect(storage.save).toHaveBeenCalledTimes(1);
    const [filename, buffer] = storage.save.mock.calls[0];
    expect(filename).toMatch(/^backup-manual-.*\.json\.gz$/);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    // The buffer really is a valid gzip of the expected envelope shape.
    const decoded = JSON.parse(zlib.gunzipSync(buffer).toString("utf-8"));
    expect(decoded.kind).toBe("MODEL");
    expect(decoded.models).toHaveProperty("Company");

    expect(backupRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: BackupStatus.COMPLETED }) }),
    );
    expect(result.status).toBe(BackupStatus.COMPLETED);
  });

  it("marks the record FAILED (without throwing) when the export blows up", async () => {
    const { prisma, dynamicModels, backupRecord } = buildPrismaMock();
    const storage = buildStorageMock();
    const service = new BackupService(prisma, storage as any);

    // Force the very first model queried to explode.
    dynamicModels["user"] = { findMany: jest.fn().mockRejectedValue(new Error("DB unreachable")) };

    const result = await service.createBackup(BackupType.WEEKLY);

    expect(result.status).toBe(BackupStatus.FAILED);
    expect(backupRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: BackupStatus.FAILED, errorMessage: "DB unreachable" }) }),
    );
  });
});

describe("BackupService.restore", () => {
  it("round-trips a MODEL-kind archive: wipes then reloads only the models present", async () => {
    const { prisma, dynamicModels } = buildPrismaMock();
    const storage = buildStorageMock();
    const service = new BackupService(prisma, storage as any);

    const payload = {
      version: 1,
      kind: "MODEL",
      exportedAt: new Date().toISOString(),
      models: {
        User: [{ id: "u1", email: "a@b.fr", createdAt: new Date().toISOString() }],
        Company: [{ id: "c1", name: "Acme", ownerUserId: "u1" }],
      },
    };
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload)));

    prisma.backupRecord.findUnique.mockResolvedValue({ id: "bkp_1", status: BackupStatus.COMPLETED, storage: BackupStorage.LOCAL, location: "/tmp/x.gz" });
    storage.load.mockResolvedValue(gz);

    const result = await service.restore("bkp_1");

    expect(result).toEqual({ restoredModels: 2, restoredRows: 2 });
    expect(dynamicModels.user.deleteMany).toHaveBeenCalled();
    expect(dynamicModels.company.deleteMany).toHaveBeenCalled();
    expect(dynamicModels.user.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [expect.objectContaining({ id: "u1", createdAt: expect.any(Date) })] }),
    );
    expect(dynamicModels.company.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [expect.objectContaining({ id: "c1" })] }),
    );
  });

  it("round-trips a PRE_MIGRATION_RAW archive via raw SQL, respecting FK-safe order", async () => {
    const { prisma } = buildPrismaMock();
    const storage = buildStorageMock();
    const service = new BackupService(prisma, storage as any);

    const payload = {
      version: 1,
      kind: "PRE_MIGRATION_RAW",
      exportedAt: new Date().toISOString(),
      tables: {
        User: [{ id: "u1", email: "a@b.fr" }],
        Company: [{ id: "c1", name: "Acme", ownerUserId: "u1" }],
      },
    };
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload)));

    prisma.backupRecord.findUnique.mockResolvedValue({ id: "bkp_2", status: BackupStatus.COMPLETED, storage: BackupStorage.LOCAL, location: "/tmp/y.gz" });
    storage.load.mockResolvedValue(gz);

    const result = await service.restore("bkp_2");

    expect(result).toEqual({ restoredModels: 2, restoredRows: 2 });
    // Deletes must happen children-first: Company (has the FK) before User.
    const deleteCalls = prisma.$executeRawUnsafe.mock.calls.filter((c: any[]) => String(c[0]).startsWith("DELETE"));
    const companyDeleteIdx = deleteCalls.findIndex((c: any[]) => c[0].includes('"Company"'));
    const userDeleteIdx = deleteCalls.findIndex((c: any[]) => c[0].includes('"User"'));
    expect(companyDeleteIdx).toBeLessThan(userDeleteIdx);
    // Inserts must happen parent-first: User before Company.
    const insertCalls = prisma.$executeRawUnsafe.mock.calls.filter((c: any[]) => String(c[0]).startsWith("INSERT"));
    const userInsertIdx = insertCalls.findIndex((c: any[]) => c[0].includes('"User"'));
    const companyInsertIdx = insertCalls.findIndex((c: any[]) => c[0].includes('"Company"'));
    expect(userInsertIdx).toBeLessThan(companyInsertIdx);
  });

  it("refuses to restore a backup that isn't COMPLETED", async () => {
    const { prisma } = buildPrismaMock();
    const storage = buildStorageMock();
    const service = new BackupService(prisma, storage as any);
    prisma.backupRecord.findUnique.mockResolvedValue({ id: "bkp_3", status: BackupStatus.FAILED });

    await expect(service.restore("bkp_3")).rejects.toThrow();
  });
});
