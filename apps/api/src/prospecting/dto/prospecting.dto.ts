import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class SearchProspectsDto {
  @IsOptional() @IsString() nafCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}

export class ImportProspectDto {
  @IsString() name: string;
  @IsOptional() @IsString() siren?: string;
  @IsOptional() @IsString() siret?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() nafCode?: string;
  @IsOptional() @IsString() nafLabel?: string;
  @IsOptional() @IsString() activity?: string;
  @IsOptional() @Type(() => Number) @IsInt() employeeCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() revenue?: number;
}
