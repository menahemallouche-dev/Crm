import { ContactsService } from "./contacts.service";

function buildPrismaMock() {
  return {
    campaignRecipient: { findMany: jest.fn() },
    contact: { findMany: jest.fn() },
  };
}

describe("ContactsService.mailingEngagement", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ContactsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ContactsService(prisma as any, {} as any, {} as any);
  });

  it("computes sent/opened counts and an open rate for one contact", async () => {
    prisma.campaignRecipient.findMany.mockResolvedValue([
      { sentAt: new Date(2026, 0, 1), openedAt: new Date(2026, 0, 2), clickedAt: null },
      { sentAt: new Date(2026, 0, 5), openedAt: null, clickedAt: null },
      { sentAt: new Date(2026, 0, 10), openedAt: new Date(2026, 0, 11), clickedAt: new Date(2026, 0, 11) },
    ]);

    const result = await service.mailingEngagement("contact-1");

    expect(result.sentCount).toBe(3);
    expect(result.openedCount).toBe(2);
    expect(result.clickedCount).toBe(1);
    expect(result.openRate).toBe(67); // round(2/3 * 100)
    expect(result.lastOpenedAt).toEqual(new Date(2026, 0, 11));
  });

  it("returns a zero rate (not NaN) for a contact never sent anything", async () => {
    prisma.campaignRecipient.findMany.mockResolvedValue([]);
    const result = await service.mailingEngagement("contact-2");
    expect(result.sentCount).toBe(0);
    expect(result.openedCount).toBe(0);
    expect(result.openRate).toBe(0);
    expect(result.lastOpenedAt).toBeNull();
  });
});

describe("ContactsService.engagedContacts", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: ContactsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new ContactsService(prisma as any, {} as any, {} as any);
  });

  it("ranks contacts by number of opens, excluding contacts who never opened anything", async () => {
    prisma.campaignRecipient.findMany.mockResolvedValue([
      { contactId: "a", sentAt: new Date(2026, 0, 1), openedAt: new Date(2026, 0, 2) },
      { contactId: "a", sentAt: new Date(2026, 0, 3), openedAt: new Date(2026, 0, 4) },
      { contactId: "b", sentAt: new Date(2026, 0, 1), openedAt: new Date(2026, 0, 2) },
      { contactId: "c", sentAt: new Date(2026, 0, 1), openedAt: null }, // never opened — must be excluded
      { contactId: null, sentAt: new Date(2026, 0, 1), openedAt: new Date(2026, 0, 2) }, // no linked contact — ignored
    ]);
    prisma.contact.findMany.mockResolvedValue([
      { id: "a", firstName: "Alice", company: { id: "co1", name: "Acme" } },
      { id: "b", firstName: "Bob", company: { id: "co2", name: "Beta" } },
    ]);

    const result = await service.engagedContacts();

    expect(result.map((c: any) => c.id)).toEqual(["a", "b"]); // a has 2 opens, b has 1 — c excluded entirely
    expect(result[0].mailingEngagement).toEqual(
      expect.objectContaining({ sentCount: 2, openedCount: 2, openRate: 100 }),
    );
  });

  it("respects the limit parameter", async () => {
    prisma.campaignRecipient.findMany.mockResolvedValue([
      { contactId: "a", sentAt: new Date(), openedAt: new Date() },
      { contactId: "b", sentAt: new Date(), openedAt: new Date() },
    ]);
    prisma.contact.findMany.mockResolvedValue([
      { id: "a", company: { id: "co1", name: "Acme" } },
      { id: "b", company: { id: "co2", name: "Beta" } },
    ]);

    const result = await service.engagedContacts(1);
    expect(result).toHaveLength(1);
  });

  it("returns an empty list (short-circuiting before any contact lookup) when nothing was ever opened", async () => {
    prisma.campaignRecipient.findMany.mockResolvedValue([{ contactId: "a", sentAt: new Date(), openedAt: null }]);
    const result = await service.engagedContacts();
    expect(result).toEqual([]);
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
  });
});
