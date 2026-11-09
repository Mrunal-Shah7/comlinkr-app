import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PrivacyRequestStatus, PrivacyRequestType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// GET /admin/privacy-requests: pagination plus optional status and type filters (omitted = all).
export class AdminPrivacyRequestsQueryDto extends PaginationDto {
  /** Older name for `limit`; kept so existing callers still page the same way. */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @ApiPropertyOptional({ enum: PrivacyRequestStatus })
  @IsOptional()
  @IsEnum(PrivacyRequestStatus)
  status?: PrivacyRequestStatus;

  @ApiPropertyOptional({ enum: PrivacyRequestType })
  @IsOptional()
  @IsEnum(PrivacyRequestType)
  type?: PrivacyRequestType;
}
