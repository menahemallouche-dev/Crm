import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProfitabilityService } from "./profitability.service";
import { AddCostEntryDto, RecomputeDto } from "./dto/profitability.dto";

@ApiTags("profitability")
@Controller("profitability")
export class ProfitabilityController {
  constructor(private readonly profitabilityService: ProfitabilityService) {}

  @Post("costs")
  addCost(@Body() dto: AddCostEntryDto) {
    return this.profitabilityService.addCost(dto);
  }

  @Get("costs/:companyId")
  listCosts(@Param("companyId") companyId: string) {
    return this.profitabilityService.listCosts(companyId);
  }

  @Post("recompute")
  recompute(@Body() dto: RecomputeDto) {
    return this.profitabilityService.recompute(dto.companyId, new Date(dto.period));
  }

  @Post("recompute-all/:companyId")
  recomputeAll(@Param("companyId") companyId: string) {
    return this.profitabilityService.recomputeAllForCompany(companyId);
  }

  @Get("history/:companyId")
  history(@Param("companyId") companyId: string) {
    return this.profitabilityService.history(companyId);
  }

  @Get("rankings")
  rankings(@Query("type") type?: "top-ca" | "top-margin" | "top-loss", @Query("limit") limit?: string) {
    return this.profitabilityService.rankings(type, limit ? Number(limit) : undefined);
  }
}
