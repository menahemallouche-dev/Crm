import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ElasticsearchService } from "./elasticsearch.service";

/**
 * Instant/global search across companies, contacts and deals.
 *
 * SEARCH_PROVIDER=postgres (default) uses PostgreSQL ILIKE queries — zero
 * extra infrastructure, good for tens of thousands of records.
 * SEARCH_PROVIDER=elasticsearch routes through ElasticsearchService
 * instead (typo-tolerance, faceting, sub-100ms search over millions of
 * rows); if the ES node is unreachable at query time this transparently
 * falls back to the PostgreSQL path below rather than erroring.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
  ) {}

  async globalSearch(query: string) {
    if (!query || query.length < 2) return { companies: [], contacts: [], deals: [] };

    if (this.elasticsearch.isEnabled) {
      try {
        const result = await this.elasticsearch.search(query);
        return {
          companies: result.companies.map((c) => ({ id: c.id, name: c.name, city: c.city, logoUrl: c.logoUrl, commercialPriority: c.commercialPriority })),
          contacts: result.contacts.map((c) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            jobTitle: c.jobTitle,
            company: { id: c.companyId, name: c.companyName },
          })),
          deals: result.deals.map((d) => ({ id: d.id, title: d.title, stage: d.stage, company: { id: d.companyId, name: d.companyName } })),
        };
      } catch (error) {
        this.logger.warn(`Recherche Elasticsearch indisponible (${(error as Error).message}) — repli PostgreSQL.`);
      }
    }

    return this.postgresSearch(query);
  }

  /** Bulk-reindexes every company/contact/deal into Elasticsearch — run after enabling SEARCH_PROVIDER=elasticsearch on an existing database. No-op if ES isn't configured. */
  async reindexAll() {
    if (!this.elasticsearch.isEnabled) return { indexed: 0, message: "SEARCH_PROVIDER n'est pas 'elasticsearch' — rien à faire." };

    const [companies, contacts, deals] = await Promise.all([
      this.prisma.company.findMany(),
      this.prisma.contact.findMany({ include: { company: { select: { name: true } } } }),
      this.prisma.deal.findMany({ include: { company: { select: { name: true } } } }),
    ]);

    await Promise.all(companies.map((c) => this.elasticsearch.indexCompany(c)));
    await Promise.all(contacts.map((c) => this.elasticsearch.indexContact(c, c.company.name)));
    await Promise.all(deals.map((d) => this.elasticsearch.indexDeal(d, d.company.name)));

    const indexed = companies.length + contacts.length + deals.length;
    this.logger.log(`Réindexation Elasticsearch terminée : ${indexed} documents.`);
    return { indexed, companies: companies.length, contacts: contacts.length, deals: deals.length };
  }

  private async postgresSearch(query: string) {
    const [companies, contacts, deals] = await Promise.all([
      this.prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { siren: { contains: query } },
            { city: { contains: query, mode: "insensitive" } },
            { nafCode: { contains: query } },
          ],
        },
        take: 10,
        select: { id: true, name: true, city: true, logoUrl: true, commercialPriority: true },
      }),
      this.prisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, firstName: true, lastName: true, jobTitle: true, company: { select: { id: true, name: true } } },
      }),
      this.prisma.deal.findMany({
        where: { title: { contains: query, mode: "insensitive" } },
        take: 10,
        select: { id: true, title: true, stage: true, company: { select: { id: true, name: true } } },
      }),
    ]);

    return { companies, contacts, deals };
  }
}
