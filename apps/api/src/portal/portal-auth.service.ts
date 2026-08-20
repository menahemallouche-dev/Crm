import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { PortalLoginDto } from "./dto/portal.dto";
import { PortalJwtPayload } from "./types";

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get secret(): string {
    return this.config.get<string>("PORTAL_JWT_SECRET") ?? this.config.get<string>("JWT_SECRET") ?? "change-me-in-production";
  }

  async login(dto: PortalLoginDto) {
    const portalUser = await this.prisma.portalUser.findUnique({
      where: { email: dto.email },
      include: { company: { select: { id: true, name: true, logoUrl: true } } },
    });
    if (!portalUser || !portalUser.isActive) throw new UnauthorizedException("Identifiants invalides");

    const valid = await argon2.verify(portalUser.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException("Identifiants invalides");

    await this.prisma.portalUser.update({ where: { id: portalUser.id }, data: { lastLoginAt: new Date() } });

    const payload: PortalJwtPayload = {
      sub: portalUser.id,
      companyId: portalUser.companyId,
      email: portalUser.email,
      scope: "portal",
    };
    const accessToken = this.jwt.sign(payload, { secret: this.secret, expiresIn: "8h" });

    return {
      accessToken,
      user: { id: portalUser.id, email: portalUser.email, companyId: portalUser.companyId },
      company: portalUser.company,
    };
  }
}
