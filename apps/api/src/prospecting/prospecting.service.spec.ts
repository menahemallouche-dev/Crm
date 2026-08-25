import { ProspectingService } from "./prospecting.service";

function buildDeps(env: Record<string, string | undefined> = {}) {
  const config = { get: jest.fn((key: string) => env[key]) };
  const prisma = { company: { findFirst: jest.fn() } };
  const companiesService = { create: jest.fn(async (dto: any) => ({ id: "new-co", ...dto })) };
  return { config, prisma, companiesService };
}

describe("ProspectingService.search — demo fallback (no API keys configured)", () => {
  it("returns the demo dataset, clearly flagged, when neither Pappers nor INSEE is configured", async () => {
    const { config, prisma, companiesService } = buildDeps();
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const { provider, results } = await service.search({});

    expect(provider).toBe("demo");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.source === "demo")).toBe(true);
  });

  it("filters the demo dataset by NAF prefix", async () => {
    const { config, prisma, companiesService } = buildDeps();
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const { results } = await service.search({ nafCode: "49" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.nafCode?.startsWith("49"))).toBe(true);
  });

  it("filters the demo dataset by city", async () => {
    const { config, prisma, companiesService } = buildDeps();
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const { results } = await service.search({ city: "Nantes" });
    expect(results).toHaveLength(1);
    expect(results[0].city).toBe("Nantes");
  });

  it("attaches a sector tag, a needs preview, and a logistics-mode guess to every result", async () => {
    const { config, prisma, companiesService } = buildDeps();
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const { results } = await service.search({ nafCode: "52" }); // entreposage
    const warehouse = results.find((r) => r.nafCode?.startsWith("5210"));
    expect(warehouse?.sector?.key).toBe("entreposage");
    expect(warehouse?.needsPreview.stockage).toBeGreaterThan(0);
    expect(warehouse?.logistics.logisticsMode).toBeDefined();
  });
});

describe("ProspectingService.search — real provider selection", () => {
  it("prefers Pappers over INSEE when both are configured", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resultats: [{ siren: "123456789", nom_entreprise: "Test Co", siege: { ville: "Paris" } }] }),
    });
    (global as any).fetch = fetchMock;

    const { config, prisma, companiesService } = buildDeps({ PAPPERS_API_KEY: "key", INSEE_SIRENE_CONSUMER_KEY: "key2" });
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const { provider, results } = await service.search({ nafCode: "4941A" });

    expect(provider).toBe("pappers");
    expect(results[0].name).toBe("Test Co");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("api.pappers.fr"));
  });

  it("falls back to demo when the configured provider errors out", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("network down"));

    const { config, prisma, companiesService } = buildDeps({ PAPPERS_API_KEY: "key" });
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const { provider, results } = await service.search({});
    expect(provider).toBe("demo");
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("ProspectingService.importAsCompany", () => {
  it("creates a new company via CompaniesService when no match exists", async () => {
    const { config, prisma, companiesService } = buildDeps();
    prisma.company.findFirst.mockResolvedValue(null);
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const result = await service.importAsCompany({ name: "Nouvelle Prospect SARL", siren: "111222333" }, "user-1");

    expect(result.alreadyExisted).toBe(false);
    expect(companiesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Nouvelle Prospect SARL", siren: "111222333", ownerUserId: "user-1" }),
      "user-1",
    );
  });

  it("returns the existing company instead of creating a duplicate when the SIREN already exists", async () => {
    const { config, prisma, companiesService } = buildDeps();
    prisma.company.findFirst.mockResolvedValue({ id: "existing-co", name: "Déjà Là" });
    const service = new ProspectingService(config as any, prisma as any, companiesService as any);

    const result = await service.importAsCompany({ name: "Déjà Là", siren: "999888777" });

    expect(result.alreadyExisted).toBe(true);
    expect(result.company.id).toBe("existing-co");
    expect(companiesService.create).not.toHaveBeenCalled();
  });
});
