import { IsDateString, IsObject, IsOptional, IsString } from "class-validator";

export class CreateTemplateDto {
  @IsString() name: string;
  @IsString() subject: string;
  @IsString() bodyHtml: string;
  @IsOptional() @IsObject() variables?: Record<string, string>;
}

export class CreateCampaignDto {
  @IsString() name: string;
  @IsOptional() @IsString() templateId?: string;
  @IsString() subject: string;
  @IsString() bodyHtml: string;
  @IsOptional() @IsObject() segmentFilter?: Record<string, unknown>;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdateCampaignDto extends CreateCampaignDto {}
