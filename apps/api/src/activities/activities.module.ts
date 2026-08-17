import { Module } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";
import { ActivitiesController, TasksController } from "./activities.controller";

@Module({
  providers: [ActivitiesService],
  controllers: [ActivitiesController, TasksController],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
