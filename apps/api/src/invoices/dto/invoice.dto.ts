import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator";
import { InvoiceStatus } from "@prisma/client";

export class CreateInvoiceDto {
  @IsString() companyId: string;
  @IsOptional() @IsString() quoteId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() amountHt?: number;
  @IsOptional() @Type(() => Number) @IsNumber() vatAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() amountTtc?: number;
  @IsOptional() @IsDateString() issuedAt?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsString() status?: InvoiceStatus;
}

export class UpdateInvoiceDto extends CreateInvoiceDto {
  @IsOptional() @IsDateString() paidAt?: string;
}
