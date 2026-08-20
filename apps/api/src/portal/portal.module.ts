import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PortalAuthService } from "./portal-auth.service";
import { PortalUsersService } from "./portal-users.service";
import { PortalDataService } from "./portal-data.service";
import { PortalController } from "./portal.controller";
import { PortalAdminController } from "./portal-admin.controller";
import { PortalJwtStrategy } from "./strategies/portal-jwt.strategy";
import { QuotesModule } from "../quotes/quotes.module";
import { InvoicesModule } from "../invoices/invoices.module";

@Module({
  imports: [PassportModule, JwtModule.register({}), QuotesModule, InvoicesModule],
  providers: [PortalAuthService, PortalUsersService, PortalDataService, PortalJwtStrategy],
  controllers: [PortalController, PortalAdminController],
  exports: [PortalUsersService],
})
export class PortalModule {}
