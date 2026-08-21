import { ProfitabilityService } from "./profitability.service";

function buildPrismaMock() {
  return {
    invoice: { findMany: jest.fn() },
    costEntry: { findMany: jest.fn() },
    profitabilityRecord: { upsert: jest.fn((args: any) => ({ ...args.create })), findMany: jest.fn() },
  };
}

describe("ProfitabilityService.recompute", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ProfitabilityService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ProfitabilityService(prisma as any);
  });

  it("computes margin € and % from invoice revenue minus cost entries", async () => {
    prisma.invoice.findMany.mockResolvedValue([{ amountHt: 10_000 }, { amountHt: 5_000 }]);
    prisma.costEntry.findMany.mockResolvedValue([
      { category: "TRANSPORT", amount: 3_000 },
      { category: "STOCKAGE", amount: 2_000 },
    ]);

    const result = await service.recompute("company-1", new Date(2026, 5, 15));

    expect(result.revenue).toBe(15_000);
    expect(result.transportCost).toBe(3_000);
    expect(result.storageCost).toBe(2_000);
    expect(result.marginAmount).toBe(10_000); // 15000 - 5000
    expect(result.marginPercent).toBeCloseTo((10_000 / 15_000) * 100);
  });

  it.each([
    [30, "EXCELLENT"],
    [15, "BON"],
    [5, "FAIBLE"],
    [-10, "A_RISQUE"],
  ])("rates a %d%% margin as %s", async (marginPercent, expectedRating) => {
    // revenue=1000, cost chosen so margin% matches the parametrized value
    const revenue = 1000;
    const cost = revenue - (marginPercent / 100) * revenue;
    prisma.invoice.findMany.mockResolvedValue([{ amountHt: revenue }]);
    prisma.costEntry.findMany.mockResolvedValue([{ category: "TRANSPORT", amount: cost }]);

    const result = await service.recompute("company-1", new Date(2026, 0, 1));
    expect(result.rating).toBe(expectedRating);
  });

  it("returns a zero margin percent (not NaN/Infinity) when there is no revenue", async () => {
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.costEntry.findMany.mockResolvedValue([{ category: "TRANSPORT", amount: 500 }]);

    const result = await service.recompute("company-1", new Date(2026, 0, 1));
    expect(result.marginPercent).toBe(0);
    expect(result.marginAmount).toBe(-500);
  });

  it("normalizes the period to the first day of the month", async () => {
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.costEntry.findMany.mockResolvedValue([]);

    await service.recompute("company-1", new Date(2026, 5, 27));
    const callArg = prisma.invoice.findMany.mock.calls[0][0];
    expect(callArg.where.issuedAt.gte).toEqual(new Date(2026, 5, 1));
    expect(callArg.where.issuedAt.lt).toEqual(new Date(2026, 6, 1));
  });
});

describe("ProfitabilityService.rankings", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ProfitabilityService;

  const records = [
    { companyId: "a", period: new Date(2026, 5, 1), revenue: 100, marginAmount: 10, marginPercent: 10, company: { id: "a", name: "A" } },
    { companyId: "a", period: new Date(2026, 4, 1), revenue: 999, marginAmount: 999, marginPercent: 999, company: { id: "a", name: "A" } }, // older period — must be ignored
    { companyId: "b", period: new Date(2026, 5, 1), revenue: 500, marginAmount: -50, marginPercent: -10, company: { id: "b", name: "B" } },
    { companyId: "c", period: new Date(2026, 5, 1), revenue: 300, marginAmount: 90, marginPercent: 30, company: { id: "c", name: "C" } },
  ];

  beforeEach(() => {
    prisma = buildPrismaMock();
    // Service queries orderBy period desc — pre-sort like Postgres would.
    prisma.profitabilityRecord.findMany.mockResolvedValue(
      [...records].sort((a, b) => b.period.getTime() - a.period.getTime()),
    );
    service = new ProfitabilityService(prisma as any);
  });

  it("keeps only the latest period per company", async () => {
    const result = await service.rankings("top-ca");
    expect(result).toHaveLength(3);
    expect(result.find((r) => r.companyId === "a")?.revenue).toBe(100); // not 999 (the stale period)
  });

  it("sorts top-ca by revenue descending", async () => {
    const result = await service.rankings("top-ca");
    expect(result.map((r) => r.companyId)).toEqual(["b", "c", "a"]);
  });

  it("sorts top-margin by margin percent descending", async () => {
    const result = await service.rankings("top-margin");
    expect(result.map((r) => r.companyId)).toEqual(["c", "a", "b"]);
  });

  it("sorts top-loss by margin amount ascending (biggest loss first)", async () => {
    const result = await service.rankings("top-loss");
    expect(result.map((r) => r.companyId)).toEqual(["b", "a", "c"]);
  });

  it("respects the limit parameter", async () => {
    const result = await service.rankings("top-ca", 1);
    expect(result).toHaveLength(1);
  });
});
