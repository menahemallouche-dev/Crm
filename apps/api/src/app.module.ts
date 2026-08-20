import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CompaniesModule } from "./companies/companies.module";
import { ContactsModule } from "./contacts/contacts.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { AiModule } from "./ai/ai.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { ActivitiesModule } from "./activities/activities.module";
import { QuotesModule } from "./quotes/quotes.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { ProfitabilityModule } from "./profitability/profitability.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { RealEstateModule } from "./real-estate/real-estate.module";
import { ContractsModule } from "./contracts/contracts.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SearchModule } from "./search/search.module";
import { ImportExportModule } from "./import-export/import-export.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AutomationModule } from "./automation/automation.module";
import { QueueModule } from "./queue/queue.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { PortalModule } from "./portal/portal.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueueModule,
    AuthModule,
    UsersModule,
    AiModule,
    EnrichmentModule,
    CompaniesModule,
    ContactsModule,
    PipelineModule,
    ActivitiesModule,
    QuotesModule,
    InvoicesModule,
    ProfitabilityModule,
    CampaignsModule,
    RealEstateModule,
    ContractsModule,
    DashboardModule,
    SearchModule,
    ImportExportModule,
    NotificationsModule,
    AutomationModule,
    WebhooksModule,
    PortalModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
