import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateContractDto {
  @IsString() companyId: string;
  @IsString() title: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() autoRenew?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() noticePeriodDays?: number;
  @IsOptional() @Type(() => Number) @IsNumber() annualValue?: number;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateContractDto extends CreateContractDto {
  @IsOptional() @IsString() status?: string;
}
