import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateOpportunityDto {
  @IsString() type: string; // LOCATION | VENTE
  @IsString() title: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() surfaceSqm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() officeSqm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() dockDoors?: number;
  @IsOptional() @Type(() => Number) @IsNumber() ceilingHeightM?: number;
  @IsOptional() @Type(() => Number) @IsNumber() price?: number;
  @IsOptional() @IsDateString() availableFrom?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() photos?: string[];
}

export class UpdateOpportunityDto extends CreateOpportunityDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
