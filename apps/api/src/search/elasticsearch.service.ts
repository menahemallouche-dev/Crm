import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@elastic/elasticsearch";

const COMPANY_INDEX = "gecodis_companies";
const CONTACT_INDEX = "gecodis_contacts";
const DEAL_INDEX = "gecodis_deals";

export interface EsSearchResult {
  companies: any[];
  contacts: any[];
  deals: any[];
}

/**
 * Elasticsearch-backed indexing/search. Only active when
 * SEARCH_PROVIDER=elasticsearch — every public method below is a no-op
 * (or transparently reports itself unavailable) otherwise, so callers
 * never need to branch on configuration themselves.
 *
 * `docker-compose up --profile search` provisions a local node matching
 * ELASTICSEARCH_NODE (see docker-compose.yml `elasticsearch` service).
 */
@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client | null = null;

  constructor(private readonly config: ConfigService) {
    if (this.isEnabled) {
      this.client = new Client({ node: this.config.get<string>("ELASTICSEARCH_NODE") ?? "http://localhost:9200" });
    }
  }

  get isEnabled(): boolean {
    return (this.config.get<string>("SEARCH_PROVIDER") ?? "postgres") === "elasticsearch";
  }

  async onModuleInit() {
    if (!this.client) return;
    try {
      await this.ensureIndices();
      this.logger.log("Index Elasticsearch prêts (companies/contacts/deals)");
    } catch (error) {
      this.logger.warn(
        `Elasticsearch indisponible au démarrage (${(error as Error).message}) — repli automatique sur la recherche PostgreSQL.`,
      );
    }
  }

  private async ensureIndices() {
    if (!this.client) return;
    const indices: [string, Record<string, unknown>][] = [
      [
        COMPANY_INDEX,
        {
          name: { type: "text" },
          city: { type: "keyword" },
          department: { type: "keyword" },
          nafCode: { type: "keyword" },
          siren: { type: "keyword" },
          activity: { type: "text" },
          potential: { type: "keyword" },
          commercialPriority: { type: "keyword" },
          revenue: { type: "double" },
          employeeCount: { type: "integer" },
        },
      ],
      [
        CONTACT_INDEX,
        {
          firstName: { type: "text" },
          lastName: { type: "text" },
          email: { type: "keyword" },
          jobTitle: { type: "text" },
          companyId: { type: "keyword" },
          companyName: { type: "text" },
        },
      ],
      [
        DEAL_INDEX,
        {
          title: { type: "text" },
          stage: { type: "keyword" },
          companyId: { type: "keyword" },
          companyName: { type: "text" },
        },
      ],
    ];

    for (const [index, properties] of indices) {
      const exists = await this.client.indices.exists({ index });
      if (!exists) {
        await this.client.indices.create({ index, mappings: { properties: properties as any } });
      }
    }
  }

  async indexCompany(company: Record<string, any>) {
    if (!this.client) return;
    await this.client
      .index({
        index: COMPANY_INDEX,
        id: company.id,
        document: {
          name: company.name,
          city: company.city,
          department: company.department,
          nafCode: company.nafCode,
          siren: company.siren,
          activity: company.activity,
          potential: company.potential,
          commercialPriority: company.commercialPriority,
          revenue: company.revenue,
          employeeCount: company.employeeCount,
          logoUrl: company.logoUrl,
        },
      })
      .catch((e) => this.logger.warn(`Indexation ES (company) échouée: ${e.message}`));
  }

  async deleteCompany(id: string) {
    if (!this.client) return;
    await this.client.delete({ index: COMPANY_INDEX, id }).catch(() => undefined);
  }

  async indexContact(contact: Record<string, any>, companyName?: string) {
    if (!this.client) return;
    await this.client
      .index({
        index: CONTACT_INDEX,
        id: contact.id,
        document: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          jobTitle: contact.jobTitle,
          companyId: contact.companyId,
          companyName,
        },
      })
      .catch((e) => this.logger.warn(`Indexation ES (contact) échouée: ${e.message}`));
  }

  async deleteContact(id: string) {
    if (!this.client) return;
    await this.client.delete({ index: CONTACT_INDEX, id }).catch(() => undefined);
  }

  async indexDeal(deal: Record<string, any>, companyName?: string) {
    if (!this.client) return;
    await this.client
      .index({
        index: DEAL_INDEX,
        id: deal.id,
        document: { title: deal.title, stage: deal.stage, companyId: deal.companyId, companyName },
      })
      .catch((e) => this.logger.warn(`Indexation ES (deal) échouée: ${e.message}`));
  }

  async search(query: string): Promise<EsSearchResult> {
    if (!this.client) return { companies: [], contacts: [], deals: [] };

    const multiMatch = (fields: string[]) => ({
      multi_match: { query, fields, fuzziness: "AUTO" },
    });

    const [companies, contacts, deals] = await Promise.all([
      this.client.search({ index: COMPANY_INDEX, query: multiMatch(["name^3", "city", "siren", "nafCode", "activity"]), size: 10 }),
      this.client.search({ index: CONTACT_INDEX, query: multiMatch(["firstName^2", "lastName^2", "email", "jobTitle"]), size: 10 }),
      this.client.search({ index: DEAL_INDEX, query: multiMatch(["title^2", "companyName"]), size: 10 }),
    ]);

    const unwrap = (res: any) => res.hits.hits.map((h: any) => ({ id: h._id, ...h._source }));
    return { companies: unwrap(companies), contacts: unwrap(contacts), deals: unwrap(deals) };
  }
}
