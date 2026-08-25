import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma, BackupType, BackupStatus } from "@prisma/client";
import * as zlib from "zlib";
import { PrismaService } from "../prisma/prisma.service";
import { BackupStorageService } from "./backup-storage.service";
import { BACKUP_EXCLUDED_MODELS, computeModelOrder, toClientPropertyName } from "./backup-model-order.util";

interface ModelBackupPayload {
  version: 1;
  kind: "MODEL";
  exportedAt: string;
  models: Record<string, unknown[]>;
}

interface RawBackupPayload {
  version: 1;
  kind: "PRE_MIGRATION_RAW";
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

type BackupPayload = ModelBackupPayload | RawBackupPayload;

// Precompute, per model, which fields are DateTime — used to turn the ISO strings that
// survive a JSON round-trip back into real Date objects before handing rows to Prisma.
const DATETIME_FIELDS_BY_MODEL = new Map<string, Set<string>>(
  Prisma.dmmf.datamodel.models.map((model) => [
    model.name,
    new Set(model.fields.filter((f) => f.type === "DateTime").map((f) => f.name)),
  ]),
);

function reviveDates(modelName: string, record: Record<string, unknown>): Record<string, unknown> {
  const dateFields = DATETIME_FIELDS_BY_MODEL.get(modelName);
  if (!dateFields || dateFields.size === 0) return record;
  const copy = { ...record };
  for (const field of dateFields) {
    if (typeof copy[field] === "string") copy[field] = new Date(copy[field] as string);
  }
  return copy;
}

/**
 * Sauvegardes/restaurations complètes de la base — voir le module pour le
 * détail de la stratégie (export Prisma pur, pas de dépendance à pg_dump,
 * stockage local + S3 optionnel). Trois façons dont un backup existe:
 *  - WEEKLY: cron hebdomadaire automatique (dimanche 3h)
 *  - MANUAL: déclenché depuis Paramètres → Sauvegardes par un ADMIN
 *  - PRE_MIGRATION: écrit par le script `pre-migration-snapshot.script.ts`
 *    juste avant `prisma migrate deploy` dans la chaîne de déploiement —
 *    voir ce fichier pour pourquoi celui-là dump en SQL brut plutôt que
 *    via le client Prisma typé.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BackupStorageService,
  ) {}

  /** Every Sunday at 03:00 — automatic full backup, kept alongside manual/pre-migration ones. */
  @Cron("0 3 * * 0")
  async weeklyBackup() {
    try {
      await this.createBackup(BackupType.WEEKLY);
    } catch (error) {
      this.logger.error(`Échec de la sauvegarde hebdomadaire automatique: ${(error as Error).message}`);
    }
  }

  async list(limit = 50) {
    return this.prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }

  async createBackup(type: BackupType, triggeredByUserId?: string) {
    const record = await this.prisma.backupRecord.create({
      data: { type, status: BackupStatus.IN_PROGRESS, storage: "LOCAL", location: "", triggeredByUserId },
    });

    try {
      const order = computeModelOrder();
      const models: Record<string, unknown[]> = {};
      const modelCounts: Record<string, number> = {};

      for (const modelName of order) {
        const prop = toClientPropertyName(modelName);
        const rows = await (this.prisma as any)[prop].findMany();
        models[modelName] = rows;
        modelCounts[modelName] = rows.length;
      }

      const payload: ModelBackupPayload = { version: 1, kind: "MODEL", exportedAt: new Date().toISOString(), models };
      const buffer = zlib.gzipSync(Buffer.from(JSON.stringify(payload), "utf-8"));

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup-${type.toLowerCase()}-${timestamp}.json.gz`;
      const { storage, location } = await this.storage.save(filename, buffer);

      return await this.prisma.backupRecord.update({
        where: { id: record.id },
        data: {
          status: BackupStatus.COMPLETED,
          storage,
          location,
          sizeBytes: buffer.byteLength,
          modelCounts,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Échec de la sauvegarde ${record.id}: ${(error as Error).message}`);
      return this.prisma.backupRecord.update({
        where: { id: record.id },
        data: { status: BackupStatus.FAILED, errorMessage: (error as Error).message, completedAt: new Date() },
      });
    }
  }

  async download(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const record = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("Sauvegarde introuvable");
    if (record.status !== BackupStatus.COMPLETED) throw new BadRequestException("Cette sauvegarde n'est pas disponible");
    const buffer = await this.storage.load(record.storage, record.location);
    const filename = `gecodis-backup-${record.type.toLowerCase()}-${record.id}.json.gz`;
    return { buffer, filename };
  }

  /**
   * Destructive: wipes every backed-up table and reloads it from the archive.
   * Requires an explicit confirmation from the caller (enforced in the controller)
   * — this is the "récupérer l'ancienne version en cas de souci" escape hatch, not
   * something that should ever fire from an accidental click.
   */
  async restore(id: string): Promise<{ restoredModels: number; restoredRows: number }> {
    const record = await this.prisma.backupRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("Sauvegarde introuvable");
    if (record.status !== BackupStatus.COMPLETED) throw new BadRequestException("Cette sauvegarde n'est pas restaurable");

    const raw = await this.storage.load(record.storage, record.location);
    const payload = JSON.parse(zlib.gunzipSync(raw).toString("utf-8")) as BackupPayload;

    if (payload.kind === "PRE_MIGRATION_RAW") {
      return this.restoreRaw(payload);
    }
    return this.restoreModels(payload);
  }

  private async restoreModels(payload: ModelBackupPayload): Promise<{ restoredModels: number; restoredRows: number }> {
    const order = computeModelOrder();
    let restoredRows = 0;

    await this.prisma.$transaction(
      async (tx) => {
        // Wipe children before parents so FK constraints never trip.
        for (const modelName of [...order].reverse()) {
          if (!(modelName in payload.models)) continue;
          await (tx as any)[toClientPropertyName(modelName)].deleteMany({});
        }
        // Reload parents before children.
        for (const modelName of order) {
          const rows = payload.models[modelName];
          if (!rows || rows.length === 0) continue;
          const revived = rows.map((r) => reviveDates(modelName, r as Record<string, unknown>));
          await (tx as any)[toClientPropertyName(modelName)].createMany({ data: revived, skipDuplicates: true });
          restoredRows += revived.length;
        }
      },
      { timeout: 120_000, maxWait: 30_000 },
    );

    return { restoredModels: Object.keys(payload.models).length, restoredRows };
  }

  private async restoreRaw(payload: RawBackupPayload): Promise<{ restoredModels: number; restoredRows: number }> {
    const order = computeModelOrder().filter((m) => payload.tables[m] !== undefined);
    let restoredRows = 0;

    for (const tableName of [...order].reverse()) {
      await this.prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
    }
    for (const tableName of order) {
      const rows = payload.tables[tableName] as Record<string, unknown>[];
      if (!rows || rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      for (const row of rows) {
        const values = columns.map((c) => {
          const v = row[c];
          if (v !== null && typeof v === "object" && !(v instanceof Date)) return JSON.stringify(v);
          return v;
        });
        await this.prisma.$executeRawUnsafe(`INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`, ...values);
        restoredRows += 1;
      }
    }

    return { restoredModels: order.length, restoredRows };
  }
}

// Re-exported so callers only need to import this file, not both.
export { BACKUP_EXCLUDED_MODELS };
