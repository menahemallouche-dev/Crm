import { Body, Controller, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ImportExportService } from "./import-export.service";

@ApiTags("import-export")
@Controller("import-export")
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Post("companies/import")
  @UseInterceptors(FileInterceptor("file"))
  importCompanies(@UploadedFile() file: Express.Multer.File) {
    return this.importExportService.importCompaniesCsv(file.buffer);
  }

  @Post("companies/export")
  async exportCompanies(@Body("companyIds") companyIds: string[] | undefined, @Res() res: Response) {
    const csv = await this.importExportService.exportCompaniesCsv(companyIds);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="entreprises-gecodis-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
    res.send(csv);
  }
}
