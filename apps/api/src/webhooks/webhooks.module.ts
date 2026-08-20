import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { WebhookDispatcherService } from "./webhook-dispatcher.service";
import { WebhookDispatcherProcessor } from "./webhook-dispatcher.processor";
import { WebhookReceiverService } from "./webhook-receiver.service";
import { WebhookReceiverController } from "./webhook-receiver.controller";

@Module({
  imports: [QueueModule],
  providers: [WebhookDispatcherService, WebhookDispatcherProcessor, WebhookReceiverService],
  controllers: [WebhookReceiverController],
  exports: [WebhookDispatcherService],
})
export class WebhooksModule {}
