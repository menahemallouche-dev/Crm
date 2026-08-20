import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedPortalUser, PortalJwtPayload } from "../types";

/**
 * Named "portal-jwt" — a distinct Passport strategy (and secret) from the
 * staff "jwt" strategy, so a client portal token is structurally incapable
 * of authenticating against internal CRM routes and vice versa.
 */
@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, "portal-jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("PORTAL_JWT_SECRET") ?? config.get<string>("JWT_SECRET") ?? "change-me-in-production",
    });
  }

  async validate(payload: PortalJwtPayload): Promise<AuthenticatedPortalUser> {
    if (payload.scope !== "portal") throw new UnauthorizedException("Jeton invalide pour le portail client");

    const portalUser = await this.prisma.portalUser.findUnique({
      where: { id: payload.sub },
      include: { company: { select: { name: true } } },
    });
    if (!portalUser || !portalUser.isActive) throw new UnauthorizedException("Compte portail introuvable ou désactivé");

    return {
      id: portalUser.id,
      email: portalUser.email,
      companyId: portalUser.companyId,
      companyName: portalUser.company.name,
    };
  }
}
