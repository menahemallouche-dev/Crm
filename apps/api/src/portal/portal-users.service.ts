import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePortalUserDto } from "./dto/portal.dto";

const PUBLIC_SELECT = {
  id: true,
  email: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  companyId: true,
  contact: { select: { firstName: true, lastName: true } },
} as const;

/** Staff-facing management of client portal accounts (invite/list/deactivate) — one company's worth at a time. */
@Injectable()
export class PortalUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreatePortalUserDto) {
    const existing = await this.prisma.portalUser.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Un compte portail existe déjà avec cet email");

    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.portalUser.create({
      data: { companyId, email: dto.email, passwordHash, contactId: dto.contactId },
      select: PUBLIC_SELECT,
    });
  }

  findAllForCompany(companyId: string) {
    return this.prisma.portalUser.findMany({
      where: { companyId },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async setActive(id: string, isActive: boolean) {
    const portalUser = await this.prisma.portalUser.findUnique({ where: { id } });
    if (!portalUser) throw new NotFoundException("Compte portail introuvable");
    return this.prisma.portalUser.update({ where: { id }, data: { isActive }, select: PUBLIC_SELECT });
  }

  async remove(id: string) {
    const portalUser = await this.prisma.portalUser.findUnique({ where: { id } });
    if (!portalUser) throw new NotFoundException("Compte portail introuvable");
    await this.prisma.portalUser.delete({ where: { id } });
    return { success: true };
  }
}
