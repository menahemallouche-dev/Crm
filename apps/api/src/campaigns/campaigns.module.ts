import { Module } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { CampaignsController } from "./campaigns.controller";
import { EmailService } from "../email/email.service";

@Module({
  providers: [CampaignsService, EmailService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
