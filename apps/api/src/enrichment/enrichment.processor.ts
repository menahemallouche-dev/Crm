import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUE_ENRICHMENT } from "../queue/queue.module";
import { EnrichmentService } from "./enrichment.service";

@Processor(QUEUE_ENRICHMENT)
export class EnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(private readonly enrichmentService: EnrichmentService) {
    super();
  }

  async process(job: Job<{ companyId: string }>) {
    this.logger.log(`Enrichissement automatique — entreprise ${job.data.companyId}`);
    return this.enrichmentService.enrichCompany(job.data.companyId);
  }
}
