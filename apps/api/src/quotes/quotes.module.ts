import { Module } from "@nestjs/common";
import { QuotesService } from "./quotes.service";
import { QuotesController } from "./quotes.controller";
import { PdfModule } from "../pdf/pdf.module";
import { WebhooksModule } from "../webhooks/webhooks.module";

@Module({
  imports: [PdfModule, WebhooksModule],
  providers: [QuotesService],
  controllers: [QuotesController],
  exports: [QuotesService],
})
export class QuotesModule {}
