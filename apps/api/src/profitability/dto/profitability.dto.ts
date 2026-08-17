import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator";
import { CostCategory } from "@prisma/client";

export class AddCostEntryDto {
  @IsString() companyId: string;
  @IsOptional() @IsString() invoiceId?: string;
  @IsString() category: CostCategory;
  @Type(() => Number) @IsNumber() amount: number;
  @IsDateString() period: string;
  @IsOptional() @IsString() notes?: string;
}

export class RecomputeDto {
  @IsString() companyId: string;
  @IsDateString() period: string;
}
