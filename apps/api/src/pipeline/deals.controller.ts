import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DealsService } from "./deals.service";
import { CreateDealDto, MoveStageDto, QueryDealsDto, UpdateDealDto } from "./dto/deal.dto";

@ApiTags("pipeline")
@Controller("deals")
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  create(@Body() dto: CreateDealDto) {
    return this.dealsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryDealsDto) {
    return this.dealsService.findAll(query);
  }

  @Get("kanban")
  kanban(@Query("ownerUserId") ownerUserId?: string) {
    return this.dealsService.kanban(ownerUserId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.dealsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(id, dto);
  }

  @Post(":id/move")
  moveStage(@Param("id") id: string, @Body() dto: MoveStageDto) {
    return this.dealsService.moveStage(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.dealsService.remove(id);
  }
}
