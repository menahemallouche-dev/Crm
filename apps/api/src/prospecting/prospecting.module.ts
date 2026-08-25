import { Module } from "@nestjs/common";
import { ProspectingService } from "./prospecting.service";
import { ProspectingController } from "./prospecting.controller";
import { CompaniesModule } from "../companies/companies.module";

@Module({
  imports: [CompaniesModule],
  controllers: [ProspectingController],
  providers: [ProspectingService],
})
export class ProspectingModule {}
