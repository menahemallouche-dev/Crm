import { DealsService } from "./deals.service";

function buildDeps(dealOverrides: Record<string, any> = {}) {
  const baseDeal = {
    id: "deal-1",
    companyId: "company-1",
    ownerUserId: "user-1",
    title: "Contrat cadre transport",
    stage: "NEGOCIATION",
    estimatedValue: 100_000,
    nextActionLabel: null,
    nextActionDate: null,
    nextFollowUpAt: null,
    lostReason: null,
    wonAt: null,
    lostAt: null,
    autoReminderEnabled: true,
    company: { name: "Fresh Logistique SAS" },
    ...dealOverrides,
  };

  const prisma = {
    deal: {
      findUnique: jest.fn().mockResolvedValue(baseDeal),
      update: jest.fn((args: any) => Promise.resolve({ ...baseDeal, ...args.data })),
    },
    dealStageEvent: { create: jest.fn().mockResolvedValue({}) },
    taskItem: { create: jest.fn().mockResolvedValue({}) },
  };
  const elasticsearch = { indexDeal: jest.fn().mockResolvedValue(undefined) };
  const webhooks = { dispatch: jest.fn().mockResolvedValue(undefined) };

  const service = new DealsService(prisma as any, elasticsearch as any, webhooks as any);
  return { service, prisma, elasticsearch, webhooks, baseDeal };
}

describe("DealsService.moveStage", () => {
  it("dispatches a wms 'deal.won' webhook when a deal newly transitions to GAGNE", async () => {
    const { service, webhooks } = buildDeps({ stage: "NEGOCIATION" });
    await service.moveStage("deal-1", { stage: "GAGNE" as any });

    expect(webhooks.dispatch).toHaveBeenCalledWith(
      "wms",
      "deal.won",
      expect.objectContaining({ dealId: "deal-1", companyId: "company-1" }),
    );
  });

  it("does not dispatch a webhook when moving to a non-GAGNE stage", async () => {
    const { service, webhooks } = buildDeps({ stage: "DEVIS" });
    await service.moveStage("deal-1", { stage: "NEGOCIATION" as any });
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("does not re-dispatch when a deal already at GAGNE is moved to GAGNE again", async () => {
    const { service, webhooks } = buildDeps({ stage: "GAGNE" });
    await service.moveStage("deal-1", { stage: "GAGNE" as any, comment: "no-op update" });
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("sets lostReason and lostAt when moving to PERDU", async () => {
    const { service, prisma } = buildDeps({ stage: "NEGOCIATION" });
    await service.moveStage("deal-1", { stage: "PERDU" as any, lostReason: "Budget insuffisant" });

    const updateData = prisma.deal.update.mock.calls[0][0].data;
    expect(updateData.lostReason).toBe("Budget insuffisant");
    expect(updateData.lostAt).toBeInstanceOf(Date);
  });

  it("creates an automatic reminder task when a next action date is given and reminders are enabled", async () => {
    const { service, prisma } = buildDeps({ autoReminderEnabled: true });
    await service.moveStage("deal-1", { stage: "RDV" as any, nextAction: "Appeler le client", nextActionDate: "2026-09-01" });

    expect(prisma.taskItem.create).toHaveBeenCalledTimes(1);
    const taskData = prisma.taskItem.create.mock.calls[0][0].data;
    expect(taskData.title).toBe("Appeler le client");
    expect(taskData.isAutomatic).toBe(true);
    expect(taskData.companyId).toBe("company-1");
  });

  it("does not create a reminder task when autoReminderEnabled is false", async () => {
    const { service, prisma } = buildDeps({ autoReminderEnabled: false });
    await service.moveStage("deal-1", { stage: "RDV" as any, nextActionDate: "2026-09-01" });
    expect(prisma.taskItem.create).not.toHaveBeenCalled();
  });

  it("does not create a reminder task when no next action date is given", async () => {
    const { service, prisma } = buildDeps({ autoReminderEnabled: true });
    await service.moveStage("deal-1", { stage: "RDV" as any });
    expect(prisma.taskItem.create).not.toHaveBeenCalled();
  });

  it("always records a stage-history event with the comment/summary/next action", async () => {
    const { service, prisma } = buildDeps();
    await service.moveStage("deal-1", { stage: "DEVIS" as any, comment: "Devis en préparation", summary: "RDV positif" });

    expect(prisma.dealStageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dealId: "deal-1", stage: "DEVIS", comment: "Devis en préparation", summary: "RDV positif" }),
    });
  });

  it("re-indexes the deal into search after moving stage", async () => {
    const { service, elasticsearch } = buildDeps();
    await service.moveStage("deal-1", { stage: "DEVIS" as any });
    expect(elasticsearch.indexDeal).toHaveBeenCalledTimes(1);
  });
});
