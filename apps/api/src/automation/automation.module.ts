import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AutomationService } from "./automation.service";
import { ProfitabilityModule } from "../profitability/profitability.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [ScheduleModule.forRoot(), ProfitabilityModule, NotificationsModule],
  providers: [AutomationService],
})
export class AutomationModule {}
