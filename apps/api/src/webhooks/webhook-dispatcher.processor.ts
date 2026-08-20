import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUE_WEBHOOKS } from "../queue/queue.module";
import { WebhookDispatcherService, WebhookJobData } from "./webhook-dispatcher.service";

@Processor(QUEUE_WEBHOOKS)
export class WebhookDispatcherProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDispatcherProcessor.name);

  constructor(private readonly dispatcher: WebhookDispatcherService) {
    super();
  }

  async process(job: Job<WebhookJobData>) {
    this.logger.log(`Envoi webhook ${job.data.connector}/${job.data.eventType}`);
    return this.dispatcher.send(job.data);
  }
}
