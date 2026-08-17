import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Instant/global search across companies, contacts and deals.
 *
 * SEARCH_PROVIDER=postgres (default) uses PostgreSQL ILIKE queries — zero
 * extra infrastructure, good for tens of thousands of records. Switching
 * SEARCH_PROVIDER=elasticsearch is intended for scale (typo-tolerance,
 * faceting, sub-100ms search over millions of rows); the `elasticsearch`
 * profile in docker-compose.yml provisions the node, but the ES-backed
 * provider itself is left as a documented extension point (see README §
 * Roadmap) so this ships without forcing a hard dependency on it.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    if ((this.config.get<string>("SEARCH_PROVIDER") ?? "postgres") === "elasticsearch") {
      this.logger.warn(
        "SEARCH_PROVIDER=elasticsearch demandé mais non implémenté dans cette version — utilisation de PostgreSQL en repli.",
      );
    }
  }

  async globalSearch(query: string) {
    if (!query || query.length < 2) return { companies: [], contacts: [], deals: [] };

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
