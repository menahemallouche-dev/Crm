import { Module } from "@nestjs/common";
import { BackupService } from "./backup.service";
import { BackupStorageService } from "./backup-storage.service";
import { BackupController } from "./backup.controller";

@Module({
  controllers: [BackupController],
  providers: [BackupService, BackupStorageService],
  exports: [BackupService],
})
export class BackupModule {}
