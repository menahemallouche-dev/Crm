import { Module } from "@nestjs/common";
import { ImportExportService } from "./import-export.service";
import { ImportExportController } from "./import-export.controller";
import { CompaniesModule } from "../companies/companies.module";

@Module({
  imports: [CompaniesModule],
  providers: [ImportExportService],
  controllers: [ImportExportController],
})
export class ImportExportModule {}
