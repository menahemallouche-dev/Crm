import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";
import { CommercialPriority, PotentialLevel, PropertyStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsOptional() @IsString() siren?: string;
  @IsOptional() @IsString() siret?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUrl({ require_tld: false }) website?: string;
  @IsOptional() @Type(() => Number) @IsInt() employeeCount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() revenue?: number;
  @IsOptional() @Type(() => Number) @IsNumber() netIncome?: number;
  @IsOptional() @Type(() => Number) @IsNumber() capital?: number;
  @IsOptional() @IsDateString() foundedAt?: string;
  @IsOptional() @IsString() activity?: string;
  @IsOptional() @IsString() nafCode?: string;
  @IsOptional() @IsString() nafLabel?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() ownerUserId?: string;

  /** Skip the automatic enrichment/scoring pipeline on create (used by CSV import for speed). */
  @IsOptional() @IsBoolean() skipAutoEnrichment?: boolean;
}

export class UpdateCompanyDto extends CreateCompanyDto {
  @IsOptional() @IsEnum(PropertyStatus) propertyStatus?: PropertyStatus;
  @IsOptional() @IsBoolean() hasWarehouse?: boolean;
  @IsOptional() @IsBoolean() hasMultipleWarehouses?: boolean;
  @IsOptional() @IsBoolean() hasIndustrialBuilding?: boolean;
  @IsOptional() @IsBoolean() hasStore?: boolean;
  @IsOptional() @IsBoolean() hasLogisticsPlatform?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() estimatedWarehouseSqm?: number;
}

export class QueryCompaniesDto extends PaginationQueryDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() nafCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minRevenue?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxRevenue?: number;
  @IsOptional() @Type(() => Number) @IsInt() minEmployees?: number;
  @IsOptional() @Type(() => Number) @IsInt() maxEmployees?: number;
  @IsOptional() @IsEnum(PotentialLevel) potential?: PotentialLevel;
  @IsOptional() @IsEnum(CommercialPriority) commercialPriority?: CommercialPriority;
  @IsOptional() @IsEnum(PropertyStatus) propertyStatus?: PropertyStatus;
  @IsOptional() @Type(() => Boolean) @IsBoolean() hasWarehouse?: boolean;
  @IsOptional() @IsString() minNeedTransport?: string;
  @IsOptional() @IsString() minNeedLogistique?: string;
  @IsOptional() @IsString() minNeedStockage?: string;
}

export class AddRealEstateAssetDto {
  @IsString() type: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Number) @IsInt() surfaceSqm?: number;
  @IsOptional() @IsBoolean() isOwned?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() confidence?: number;
  @IsOptional() @IsString() source?: string;
}

export class BulkIdsDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
