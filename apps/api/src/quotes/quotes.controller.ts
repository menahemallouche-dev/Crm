import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { QuotesService } from "./quotes.service";
import { CreateQuoteDto, SignQuoteDto, UpdateQuoteDto } from "./dto/quote.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";

@ApiTags("quotes")
@Controller("quotes")
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.quotesService.create(dto, user?.id);
  }

  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.quotesService.findAll(companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.quotesService.findOne(id);
  }

  @Get(":id/pdf")
  async pdf(@Param("id") id: string, @Res() res: Response) {
    const { buffer, filename } = await this.quotesService.generatePdf(id);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` });
    res.send(buffer);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotesService.update(id, dto);
  }

  @Post(":id/new-version")
  newVersion(@Param("id") id: string) {
    return this.quotesService.newVersion(id);
  }

  @Post(":id/send")
  send(@Param("id") id: string) {
    return this.quotesService.send(id);
  }

  @Post(":id/sign")
  sign(@Param("id") id: string, @Body() dto: SignQuoteDto) {
    return this.quotesService.sign(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.quotesService.remove(id);
  }
}
