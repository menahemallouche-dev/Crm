import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CompaniesService } from "./companies.service";
import { AddRealEstateAssetDto, CreateCompanyDto, QueryCompaniesDto, UpdateCompanyDto } from "./dto/company.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";

@ApiTags("companies")
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.create(dto, user?.id);
  }

  @Get()
  findAll(@Query() query: QueryCompaniesDto) {
    return this.companiesService.findAll(query);
  }

  @Get("stats")
  stats() {
    return this.companiesService.stats();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.update(id, dto, user?.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.companiesService.remove(id);
  }

  @Post(":id/enrich")
  enrich(@Param("id") id: string) {
    return this.companiesService.triggerEnrichment(id);
  }

  @Post(":id/rescore")
  rescore(@Param("id") id: string) {
    return this.companiesService.triggerEnrichment(id);
  }

  @Post(":id/real-estate-assets")
  addAsset(@Param("id") id: string, @Body() dto: AddRealEstateAssetDto) {
    return this.companiesService.addRealEstateAsset(id, dto);
  }
}
