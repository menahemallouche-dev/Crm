import { Module } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompaniesController } from "./companies.controller";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { QueueModule } from "../queue/queue.module";
import { SearchModule } from "../search/search.module";
import { WebhooksModule } from "../webhooks/webhooks.module";

@Module({
  imports: [EnrichmentModule, QueueModule, SearchModule, WebhooksModule],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
