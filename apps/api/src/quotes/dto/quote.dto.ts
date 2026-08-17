import { Type } from "class-transformer";
import { IsArray, IsDateString, IsNumber, IsOptional, IsString } from "class-validator";

export class QuoteLineDto {
  @IsString() label: string;
  @Type(() => Number) @IsNumber() qty: number;
  @Type(() => Number) @IsNumber() unitPrice: number;
}

export class CreateQuoteDto {
  @IsString() companyId: string;
  @IsOptional() @IsString() dealId?: string;
  @Type(() => Number) @IsNumber() amountHt: number;
  @IsOptional() @Type(() => Number) @IsNumber() vatRate?: number;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsArray() lines?: QuoteLineDto[];
}

export class UpdateQuoteDto extends CreateQuoteDto {}

export class SignQuoteDto {
  @IsString() signedByName: string;
}
