import { Module } from "@nestjs/common";
import { DealsService } from "./deals.service";
import { DealsController } from "./deals.controller";
import { SearchModule } from "../search/search.module";
import { WebhooksModule } from "../webhooks/webhooks.module";

@Module({
  imports: [SearchModule, WebhooksModule],
  providers: [DealsService],
  controllers: [DealsController],
  exports: [DealsService],
})
export class PipelineModule {}
