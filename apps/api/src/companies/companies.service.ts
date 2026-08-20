import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QUEUE_ENRICHMENT } from "../queue/queue.module";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { ElasticsearchService } from "../search/elasticsearch.service";
import { WebhookDispatcherService } from "../webhooks/webhook-dispatcher.service";
import { PaginatedResult, paginate } from "../common/dto/pagination.dto";
import { AddRealEstateAssetDto, CreateCompanyDto, QueryCompaniesDto, UpdateCompanyDto } from "./dto/company.dto";

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrichmentService: EnrichmentService,
    private readonly elasticsearch: ElasticsearchService,
    private readonly webhooks: WebhookDispatcherService,
    @InjectQueue(QUEUE_ENRICHMENT) private readonly enrichmentQueue: Queue,
  ) {}

  async create(dto: CreateCompanyDto, actingUserId?: string) {
    const { skipAutoEnrichment, foundedAt, ...rest } = dto;
    const company = await this.prisma.company.create({
      data: {
        ...rest,
        foundedAt: foundedAt ? new Date(foundedAt) : undefined,
        ownerUserId: dto.ownerUserId ?? actingUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: { userId: actingUserId, companyId: company.id, action: "CREATE", entityType: "Company", entityId: company.id },
    });
    await this.elasticsearch.indexCompany(company);
    // Syncs the new customer master data to the connected billing/ERP software, if configured.
    await this.webhooks.dispatch("billing", "company.created", {
      companyId: company.id,
      name: company.name,
      siren: company.siren,
      address: company.address,
      city: company.city,
      postalCode: company.postalCode,
      email: company.email,
      vatNumber: company.vatNumber,
    });

    if (!skipAutoEnrichment) {
      await this.triggerEnrichment(company.id);
    }

    return company;
  }

  /** Enqueues the enrichment pipeline; falls back to an inline synchronous run if Redis is unreachable. */
  async triggerEnrichment(companyId: string) {
    try {
      await this.enrichmentQueue.add("enrich", { companyId }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
    } catch (error) {
      this.logger.warn(`File d'attente Redis indisponible, enrichissement synchrone: ${(error as Error).message}`);
      this.enrichmentService.enrichCompany(companyId).catch((e) => this.logger.error(e));
    }
  }

  async findAll(query: QueryCompaniesDto): Promise<PaginatedResult<any>> {
    const where: Prisma.CompanyWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: "insensitive" } },
                { siren: { contains: query.search } },
                { city: { contains: query.search, mode: "insensitive" } },
                { nafCode: { contains: query.search } },
              ],
            }
          : {},
        query.city ? { city: { equals: query.city, mode: "insensitive" } } : {},
        query.department ? { department: query.department } : {},
        query.nafCode ? { nafCode: { startsWith: query.nafCode } } : {},
        query.potential ? { potential: query.potential } : {},
        query.commercialPriority ? { commercialPriority: query.commercialPriority } : {},
        query.propertyStatus ? { propertyStatus: query.propertyStatus } : {},
        query.hasWarehouse !== undefined ? { hasWarehouse: query.hasWarehouse } : {},
        query.minRevenue !== undefined ? { revenue: { gte: query.minRevenue } } : {},
        query.maxRevenue !== undefined ? { revenue: { lte: query.maxRevenue } } : {},
        query.minEmployees !== undefined ? { employeeCount: { gte: query.minEmployees } } : {},
        query.maxEmployees !== undefined ? { employeeCount: { lte: query.maxEmployees } } : {},
        query.minNeedTransport ? { needScoreTransport: { gte: Number(query.minNeedTransport) } } : {},
        query.minNeedLogistique ? { needScoreLogistique: { gte: Number(query.minNeedLogistique) } } : {},
        query.minNeedStockage ? { needScoreStockage: { gte: Number(query.minNeedStockage) } } : {},
      ],
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const sortBy = query.sortBy ?? "createdAt";
    const sortDir = query.sortDir ?? "desc";

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { contacts: true, deals: true, activities: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return paginate(data, total, page, pageSize);
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { aiDecisionPower: "desc" } },
        deals: { orderBy: { updatedAt: "desc" }, include: { stageHistory: { orderBy: { enteredAt: "desc" }, take: 5 } } },
        activities: { orderBy: { occurredAt: "desc" }, take: 20 },
        quotes: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { issuedAt: "desc" } },
        profitabilityRecords: { orderBy: { period: "desc" } },
        contracts: { orderBy: { createdAt: "desc" } },
        realEstateAssets: true,
        documents: { orderBy: { createdAt: "desc" } },
        enrichmentLogs: { orderBy: { createdAt: "desc" }, take: 20 },
        ownerUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!company) throw new NotFoundException("Entreprise introuvable");
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actingUserId?: string) {
    await this.findOne(id);
    const { skipAutoEnrichment, foundedAt, ...rest } = dto;
    const company = await this.prisma.company.update({
      where: { id },
      data: { ...rest, foundedAt: foundedAt ? new Date(foundedAt) : undefined },
    });
    await this.prisma.auditLog.create({
      data: { userId: actingUserId, companyId: id, action: "UPDATE", entityType: "Company", entityId: id },
    });
    // Manual edits can change NAF/activity/revenue — refresh AI scoring to stay consistent.
    // rescoreCompany() re-indexes into Elasticsearch itself once the refreshed record is saved.
    await this.enrichmentService.rescoreCompany(id);
    return company;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.company.delete({ where: { id } });
    await this.elasticsearch.deleteCompany(id);
    return { success: true };
  }

  async addRealEstateAsset(companyId: string, dto: AddRealEstateAssetDto) {
    await this.findOne(companyId);
    const asset = await this.prisma.companyRealEstateAsset.create({
      data: { ...dto, companyId, type: dto.type as any },
    });
    // Keep the summary boolean flags on Company in sync with the detailed asset list.
    const assets = await this.prisma.companyRealEstateAsset.findMany({ where: { companyId } });
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        hasWarehouse: assets.some((a) => a.type === "ENTREPOT" || a.type === "PLUSIEURS_ENTREPOTS"),
        hasMultipleWarehouses: assets.filter((a) => a.type === "ENTREPOT").length > 1 || assets.some((a) => a.type === "PLUSIEURS_ENTREPOTS"),
        hasIndustrialBuilding: assets.some((a) => a.type === "BATIMENT_INDUSTRIEL"),
        hasStore: assets.some((a) => a.type === "MAGASIN"),
        hasLogisticsPlatform: assets.some((a) => a.type === "PLATEFORME_LOGISTIQUE"),
      },
    });
    return asset;
  }

  async stats() {
    const [total, byPriority, byPotential] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.groupBy({ by: ["commercialPriority"], _count: true }),
      this.prisma.company.groupBy({ by: ["potential"], _count: true }),
    ]);
    return { total, byPriority, byPotential };
  }
}
