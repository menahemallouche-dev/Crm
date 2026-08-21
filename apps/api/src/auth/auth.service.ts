import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { authenticator } from "otplib";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { JwtPayload } from "./types";
import { GoogleProfile } from "./strategies/google.strategy";
import { GoogleLinkTicketService } from "./google-link-ticket.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly googleLinkTickets: GoogleLinkTicketService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Un compte existe déjà avec cet email");

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? "COMMERCIAL",
      },
    });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Identifiants invalides");

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException("Identifiants invalides");

    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return { mfaRequired: true };
      }
      const validMfa = user.mfaSecret
        ? authenticator.verify({ token: dto.mfaCode, secret: user.mfaSecret })
        : false;
      if (!validMfa) throw new UnauthorizedException("Code MFA invalide");
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException("Refresh token invalide ou expiré");
    }
  }

  /**
   * Finds, links, or provisions a User from a verified Google profile, then
   * issues normal JWT tokens. Three cases, in order:
   *
   * 1. `linkTicket` present (from an authenticated "Lier mon compte Google"
   *    click — see google-link-ticket.service.ts): attach this Google
   *    identity to that specific, already-logged-in account. Explicit and
   *    unambiguous — doesn't rely on email matching.
   * 2. No ticket, but `googleId` already linked to a User: plain login.
   * 3. No ticket, no existing link, but the Google email matches an
   *    existing password account: link automatically (Google verifies the
   *    email, so this is safe) and log in — this is what makes "sign in
   *    with Google" work transparently for staff who registered with a
   *    password first.
   * 4. Nothing matches: provision a brand new account.
   */
  async loginWithGoogle(profile: GoogleProfile, linkTicket?: string) {
    if (!profile.email) throw new BadRequestException("Le compte Google ne fournit pas d'adresse email");

    if (linkTicket) {
      const userId = this.googleLinkTickets.consume(linkTicket);
      if (!userId) throw new BadRequestException("Ce lien d'association a expiré, réessayez depuis vos paramètres.");

      const alreadyLinkedElsewhere = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
      if (alreadyLinkedElsewhere && alreadyLinkedElsewhere.id !== userId) {
        throw new BadRequestException("Ce compte Google est déjà lié à un autre utilisateur Gecodis.");
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { googleId: profile.googleId, avatarUrl: profile.avatarUrl, lastLoginAt: new Date() },
      });
      return this.buildAuthResponse(user);
    }

    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        // Automatic linking: Google has verified this email, and it already belongs to a staff account.
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: profile.googleId, avatarUrl: byEmail.avatarUrl ?? profile.avatarUrl },
        });
      } else {
        // No password is ever set for Google-provisioned accounts — a random hash blocks password login for them.
        const randomPasswordHash = await argon2.hash(`${Date.now()}-${Math.random()}`);
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.googleId,
            passwordHash: randomPasswordHash,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
            role: "COMMERCIAL",
          },
        });
      }
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.buildAuthResponse(user);
  }

  /** Mints a one-time ticket an already-authenticated user can use to explicitly link their Google account (see loginWithGoogle case 1). */
  createGoogleLinkTicket(userId: string): string {
    return this.googleLinkTickets.issue(userId);
  }

  async unlinkGoogle(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { googleId: null } });
    return { linked: false };
  }

  async generateMfaSecret(userId: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otpauth = authenticator.keyuri(
      user.email,
      this.config.get<string>("MFA_ISSUER") ?? "Gecodis CRM",
      secret,
    );
    return { secret, otpauth };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret) throw new BadRequestException("Aucun secret MFA généré");
    const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!valid) throw new BadRequestException("Code invalide");
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    return { mfaEnabled: true };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    role: any;
    firstName: string;
    lastName: string;
  }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("JWT_SECRET"),
      expiresIn: this.config.get<string>("JWT_EXPIRES_IN") ?? "15m",
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "30d",
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
