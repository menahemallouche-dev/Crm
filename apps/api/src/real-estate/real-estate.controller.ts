import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RealEstateService } from "./real-estate.service";
import { CreateOpportunityDto, UpdateOpportunityDto } from "./dto/real-estate.dto";

@ApiTags("real-estate")
@Controller("real-estate-opportunities")
export class RealEstateController {
  constructor(private readonly realEstateService: RealEstateService) {}

  @Post()
  create(@Body() dto: CreateOpportunityDto) {
    return this.realEstateService.create(dto);
  }

  @Get()
  findAll() {
    return this.realEstateService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.realEstateService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateOpportunityDto) {
    return this.realEstateService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.realEstateService.remove(id);
  }

  @Post(":id/match")
  match(@Param("id") id: string) {
    return this.realEstateService.matchCompanies(id);
  }
}
