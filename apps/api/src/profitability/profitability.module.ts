import { Module } from "@nestjs/common";
import { ProfitabilityService } from "./profitability.service";
import { ProfitabilityController } from "./profitability.controller";
import { PdfModule } from "../pdf/pdf.module";

@Module({
  imports: [PdfModule],
  providers: [ProfitabilityService],
  controllers: [ProfitabilityController],
  exports: [ProfitabilityService],
})
export class ProfitabilityModule {}
