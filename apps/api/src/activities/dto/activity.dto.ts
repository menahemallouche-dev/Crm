import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString } from "class-validator";
import { ActivityType } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class CreateActivityDto {
  @IsString() companyId: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() ownerUserId?: string;
  @IsString() type: ActivityType;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @Type(() => Number) @IsInt() durationSec?: number;
  @IsOptional() @IsString() documentUrl?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
}

export class QueryActivitiesDto extends PaginationQueryDto {
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() type?: ActivityType;
}

export class CreateTaskDto {
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}
