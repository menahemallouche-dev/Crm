import { Body, Controller, Get, Param, Patch, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto, CreateTemplateDto, UpdateCampaignDto } from "./dto/campaign.dto";
import { Public } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";

const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64",
);

@ApiTags("campaigns")
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post("templates")
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.campaignsService.createTemplate(dto);
  }

  @Get("templates")
  listTemplates() {
    return this.campaignsService.listTemplates();
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    return this.campaignsService.create(dto, user?.id);
  }

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Post(":id/recipients/build")
  buildRecipients(@Param("id") id: string) {
    return this.campaignsService.buildRecipients(id);
  }

  @Post(":id/send")
  send(@Param("id") id: string) {
    return this.campaignsService.send(id);
  }

  @Get(":id/stats")
  stats(@Param("id") id: string) {
    return this.campaignsService.stats(id);
  }

  @Public()
  @Get("track/open/:recipientId")
  async trackOpen(@Param("recipientId") recipientId: string, @Res() res: Response) {
    await this.campaignsService.trackOpen(recipientId);
    res.set("Content-Type", "image/gif");
    res.send(TRACKING_PIXEL);
  }

  @Public()
  @Get("track/click/:recipientId")
  async trackClick(@Param("recipientId") recipientId: string, @Res() res: Response) {
    await this.campaignsService.trackClick(recipientId);
    res.redirect(process.env.APP_URL ?? "http://localhost:3000");
  }

  @Public()
  @Post("track/unsubscribe/:recipientId")
  unsubscribe(@Param("recipientId") recipientId: string) {
    return this.campaignsService.unsubscribe(recipientId);
  }
}
