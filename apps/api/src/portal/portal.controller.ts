import { Body, Controller, Get, Param, Post, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PortalAuthService } from "./portal-auth.service";
import { PortalDataService } from "./portal-data.service";
import { PortalLoginDto, SignPortalQuoteDto } from "./dto/portal.dto";
import { Public } from "../common/decorators/roles.decorator";
import { PortalJwtAuthGuard } from "./guards/portal-jwt-auth.guard";
import { CurrentPortalUser } from "./current-portal-user.decorator";
import { AuthenticatedPortalUser } from "./types";

/**
 * Client self-service portal. Every route here is marked @Public() to skip
 * the staff JwtAuthGuard (registered globally in AppModule) and instead
 * guarded — except login — by PortalJwtAuthGuard, which only accepts
 * tokens issued by PortalAuthService.login(). See portal/types.ts.
 */
@ApiTags("portal")
@Controller("portal")
@Public()
export class PortalController {
  constructor(
    private readonly portalAuthService: PortalAuthService,
    private readonly portalDataService: PortalDataService,
  ) {}

  @Post("auth/login")
  login(@Body() dto: PortalLoginDto) {
    return this.portalAuthService.login(dto);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get("me")
  me(@CurrentPortalUser() user: AuthenticatedPortalUser) {
    return this.portalDataService.company(user.companyId);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get("quotes")
  quotes(@CurrentPortalUser() user: AuthenticatedPortalUser) {
    return this.portalDataService.quotes(user.companyId);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get("quotes/:id/pdf")
  async quotePdf(@CurrentPortalUser() user: AuthenticatedPortalUser, @Param("id") id: string, @Res() res: Response) {
    const { buffer, filename } = await this.portalDataService.quotePdf(user.companyId, id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` });
    res.send(buffer);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Post("quotes/:id/sign")
  signQuote(@CurrentPortalUser() user: AuthenticatedPortalUser, @Param("id") id: string, @Body() dto: SignPortalQuoteDto) {
    return this.portalDataService.signQuote(user.companyId, id, dto);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get("invoices")
  invoices(@CurrentPortalUser() user: AuthenticatedPortalUser) {
    return this.portalDataService.invoices(user.companyId);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get("invoices/:id/pdf")
  async invoicePdf(@CurrentPortalUser() user: AuthenticatedPortalUser, @Param("id") id: string, @Res() res: Response) {
    const { buffer, filename } = await this.portalDataService.invoicePdf(user.companyId, id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` });
    res.send(buffer);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get("contracts")
  contracts(@CurrentPortalUser() user: AuthenticatedPortalUser) {
    return this.portalDataService.contracts(user.companyId);
  }

  @UseGuards(PortalJwtAuthGuard)
  @Get("tracking")
  tracking(@CurrentPortalUser() user: AuthenticatedPortalUser) {
    return this.portalDataService.tracking(user.companyId);
  }
}
