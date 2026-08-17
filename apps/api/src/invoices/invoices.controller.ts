import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto, UpdateInvoiceDto } from "./dto/invoice.dto";

@ApiTags("invoices")
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Post("import-pdf")
  @UseInterceptors(FileInterceptor("file"))
  importPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body("companyId") companyId: string,
    @Body("quoteId") quoteId?: string,
  ) {
    return this.invoicesService.importPdf(companyId, file, quoteId);
  }

  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.invoicesService.findAll(companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.invoicesService.remove(id);
  }
}
