import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Post, Query, RawBodyRequest, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { UserRole } from "@prisma/client";
import { WebhookReceiverService } from "./webhook-receiver.service";
import { verifyRawSignature } from "./signature.util";
import { Public, Roles } from "../common/decorators/roles.decorator";

interface InboundWebhookBody {
  event: string;
  data: Record<string, any>;
}

@ApiTags("webhooks")
@Controller("webhooks")
export class WebhookReceiverController {
  constructor(
    private readonly receiverService: WebhookReceiverService,
    private readonly config: ConfigService,
  ) {}

  private assertSignature(req: RawBodyRequest<Request>, signature: string | undefined, secretKey: string) {
    const secret = this.config.get<string>(secretKey);
    if (!secret) {
      throw new BadRequestException(`${secretKey} n'est pas configuré côté CRM — connecteur désactivé.`);
    }
    if (!req.rawBody || !verifyRawSignature(req.rawBody, secret, signature)) {
      throw new ForbiddenException("Signature de webhook invalide (en-tête X-Gecodis-Signature).");
    }
  }

  /** Inbound events from the billing software (invoice paid, invoice created/updated…). */
  @Public()
  @Post("billing")
  async billing(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: InboundWebhookBody,
    @Headers("x-gecodis-signature") signature: string | undefined,
  ) {
    this.assertSignature(req, signature, "BILLING_SOFTWARE_WEBHOOK_SECRET");
    if (!body?.event) throw new BadRequestException("Champ 'event' manquant");
    await this.receiverService.handleBillingEvent(body.event, body.data ?? {});
    return { received: true };
  }

  /** Inbound events from the WMS (stock threshold alerts, shipment completion…). */
  @Public()
  @Post("wms")
  async wms(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: InboundWebhookBody,
    @Headers("x-gecodis-signature") signature: string | undefined,
  ) {
    this.assertSignature(req, signature, "WMS_WEBHOOK_SECRET");
    if (!body?.event) throw new BadRequestException("Champ 'event' manquant");
    await this.receiverService.handleWmsEvent(body.event, body.data ?? {});
    return { received: true };
  }

  @Roles(UserRole.ADMIN)
  @Get("logs")
  logs(@Query("connector") connector?: string) {
    return this.receiverService.listLogs(connector);
  }
}
