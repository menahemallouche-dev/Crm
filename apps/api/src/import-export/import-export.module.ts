import { Module } from "@nestjs/common";
import { ImportExportService } from "./import-export.service";
import { ImportExportController } from "./import-export.controller";
import { CompaniesModule } from "../companies/companies.module";
import { PdfModule } from "../pdf/pdf.module";

@Module({
  imports: [CompaniesModule, PdfModule],
  providers: [ImportExportService],
  controllers: [ImportExportController],
})
export class ImportExportModule {}
