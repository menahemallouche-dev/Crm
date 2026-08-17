import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ActivitiesService } from "./activities.service";
import { CreateActivityDto, CreateTaskDto, QueryActivitiesDto } from "./dto/activity.dto";

@ApiTags("activities")
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() dto: CreateActivityDto) {
    return this.activitiesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryActivitiesDto) {
    return this.activitiesService.findAll(query);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.activitiesService.remove(id);
  }
}

@ApiTags("tasks")
@Controller("tasks")
export class TasksController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.activitiesService.createTask(dto);
  }

  @Get()
  findAll(
    @Query("assigneeId") assigneeId?: string,
    @Query("companyId") companyId?: string,
    @Query("dueBefore") dueBefore?: string,
    @Query("onlyOpen") onlyOpen?: string,
  ) {
    return this.activitiesService.findTasks({ assigneeId, companyId, dueBefore, onlyOpen: onlyOpen !== "false" });
  }

  @Get("today")
  today() {
    return this.activitiesService.todayTasks();
  }

  @Post(":id/complete")
  complete(@Param("id") id: string) {
    return this.activitiesService.completeTask(id);
  }
}
