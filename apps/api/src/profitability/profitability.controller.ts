import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ProfitabilityService } from "./profitability.service";
import { PdfService } from "../pdf/pdf.service";
import { AddCostEntryDto, RecomputeDto } from "./dto/profitability.dto";

const RANKING_TITLES: Record<string, string> = {
  "top-ca": "Classement rentabilité — Top CA",
  "top-margin": "Classement rentabilité — Top marge",
  "top-loss": "Classement rentabilité — Top perte",
};

@ApiTags("profitability")
@Controller("profitability")
export class ProfitabilityController {
  constructor(
    private readonly profitabilityService: ProfitabilityService,
    private readonly pdfService: PdfService,
  ) {}

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

  @Get("rankings/pdf")
  async rankingsPdf(
    @Query("type") type: "top-ca" | "top-margin" | "top-loss" = "top-ca",
    @Query("limit") limit: string | undefined,
    @Res() res: Response,
  ) {
    const rows = await this.profitabilityService.rankings(type, limit ? Number(limit) : undefined);
    const pdf = await this.pdfService.profitabilityRanking(rows, RANKING_TITLES[type] ?? RANKING_TITLES["top-ca"]);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rentabilite-${type}-${new Date().toISOString().slice(0, 10)}.pdf"`,
    });
    res.send(pdf);
  }
}
