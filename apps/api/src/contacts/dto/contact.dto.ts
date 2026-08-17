import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUrl } from "class-validator";
import { ContactInfluence } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateContactDto {
  @IsString() companyId: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() mobilePhone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUrl({ require_tld: false }) linkedinUrl?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsBoolean() isDecisionMaker?: boolean;
  @IsOptional() @IsEnum(ContactInfluence) influence?: ContactInfluence;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateContactDto extends CreateContactDto {}

export class QueryContactsDto extends PaginationQueryDto {
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() aiDecisionRole?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isDecisionMaker?: boolean;
}
