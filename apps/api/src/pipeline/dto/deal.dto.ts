import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from "class-validator";
import { PipelineStage } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateDealDto {
  @IsString() companyId: string;
  @IsOptional() @IsString() primaryContactId?: string;
  @IsString() title: string;
  @IsOptional() @Type(() => Number) @IsNumber() estimatedValue?: number;
  @IsOptional() @Type(() => Number) @IsInt() probability?: number;
  @IsOptional() @IsString() ownerUserId?: string;
  @IsOptional() @IsString() nextActionLabel?: string;
  @IsOptional() @IsDateString() nextActionDate?: string;
}

export class UpdateDealDto extends CreateDealDto {}

export class MoveStageDto {
  @IsString() stage: PipelineStage;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() nextAction?: string;
  @IsOptional() @IsDateString() nextActionDate?: string;
  @IsOptional() @IsString() lostReason?: string;
}

export class QueryDealsDto extends PaginationQueryDto {
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() stage?: PipelineStage;
  @IsOptional() @IsString() ownerUserId?: string;
}
