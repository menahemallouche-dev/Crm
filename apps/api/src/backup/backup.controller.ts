import { BadRequestException, Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { BackupType, UserRole } from "@prisma/client";
import { BackupService } from "./backup.service";
import { RestoreBackupDto } from "./dto/backup.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";

/** Sauvegardes/restauration — réservé aux administrateurs, données sensibles à l'échelle de toute la base. */
@ApiTags("backups")
@Controller("backups")
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  list() {
    return this.backupService.list();
  }

  @Post("trigger")
  trigger(@CurrentUser() user: AuthenticatedUser) {
    return this.backupService.createBackup(BackupType.MANUAL, user.id);
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @Res() res: Response) {
    const { buffer, filename } = await this.backupService.download(id);
    res.set({ "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="${filename}"` });
    res.send(buffer);
  }

  @Post(":id/restore")
  restore(@Param("id") id: string, @Body() dto: RestoreBackupDto) {
    if (dto.confirm !== true) {
      throw new BadRequestException("Confirmation requise (confirm: true) — cette action écrase les données actuelles.");
    }
    return this.backupService.restore(id);
  }
}
