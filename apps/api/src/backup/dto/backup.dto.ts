import { IsBoolean } from "class-validator";

export class RestoreBackupDto {
  /** Must be explicitly `true` — a safety catch against firing a destructive restore by accident. */
  @IsBoolean()
  confirm: boolean;
}
