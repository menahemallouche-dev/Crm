import { BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";

function buildDeps() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
      create: jest.fn((args: any) => Promise.resolve({ id: "new-user-id", ...args.data })),
    },
  };
  const jwt = { sign: jest.fn().mockReturnValue("signed.jwt.token"), verify: jest.fn() };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const googleLinkTickets = { issue: jest.fn(), consume: jest.fn() };

  const service = new AuthService(prisma as any, jwt as any, config as any, googleLinkTickets as any);
  return { service, prisma, jwt, config, googleLinkTickets };
}

const googleProfile = { googleId: "g-123", email: "alex@gecodis.fr", firstName: "Alex", lastName: "Moreau" };

describe("AuthService.loginWithGoogle", () => {
  it("logs straight in when the googleId is already linked to a user", async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user-1", email: googleProfile.email, role: "COMMERCIAL", firstName: "Alex", lastName: "Moreau" });

    const result = await service.loginWithGoogle(googleProfile);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { googleId: googleProfile.googleId } });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(result.accessToken).toBe("signed.jwt.token");
  });

  it("automatically links to an existing password account with the same (Google-verified) email", async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // no user with this googleId yet
      .mockResolvedValueOnce({ id: "user-1", email: googleProfile.email, role: "COMMERCIAL", firstName: "Alex", lastName: "Moreau", avatarUrl: null });

    await service.loginWithGoogle(googleProfile);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" }, data: expect.objectContaining({ googleId: googleProfile.googleId }) }),
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("provisions a brand new account when neither googleId nor email match anything", async () => {
    const { service, prisma } = buildDeps();
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await service.loginWithGoogle(googleProfile);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: googleProfile.email, googleId: googleProfile.googleId }) }),
    );
  });

  it("rejects a Google profile without an email", async () => {
    const { service } = buildDeps();
    await expect(service.loginWithGoogle({ ...googleProfile, email: "" })).rejects.toThrow(BadRequestException);
  });

  describe("with an explicit link ticket (authenticated 'Lier mon compte Google' flow)", () => {
    it("links the Google identity to the ticket's user, ignoring email matching entirely", async () => {
      const { service, prisma, googleLinkTickets } = buildDeps();
      googleLinkTickets.consume.mockReturnValue("current-staff-user-id");
      prisma.user.findUnique.mockResolvedValueOnce(null); // no account already has this googleId

      await service.loginWithGoogle({ ...googleProfile, email: "totally-different@else.fr" }, "ticket-abc");

      expect(googleLinkTickets.consume).toHaveBeenCalledWith("ticket-abc");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "current-staff-user-id" }, data: expect.objectContaining({ googleId: googleProfile.googleId }) }),
      );
    });

    it("rejects an expired or unknown ticket", async () => {
      const { service, googleLinkTickets } = buildDeps();
      googleLinkTickets.consume.mockReturnValue(null);

      await expect(service.loginWithGoogle(googleProfile, "expired-ticket")).rejects.toThrow(BadRequestException);
    });

    it("refuses to link a Google account already linked to a different user", async () => {
      const { service, prisma, googleLinkTickets } = buildDeps();
      googleLinkTickets.consume.mockReturnValue("current-staff-user-id");
      prisma.user.findUnique.mockResolvedValueOnce({ id: "someone-else-id", googleId: googleProfile.googleId });

      await expect(service.loginWithGoogle(googleProfile, "ticket-abc")).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
