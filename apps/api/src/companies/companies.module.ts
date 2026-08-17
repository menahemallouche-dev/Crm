import { Module } from "@nestjs/common";
import { CompaniesService } from "./companies.service";
import { CompaniesController } from "./companies.controller";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [EnrichmentModule, QueueModule],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
