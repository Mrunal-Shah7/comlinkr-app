import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ListingReportStatus, ListingReportTargetType } from '@prisma/client';

// SPRINT-51: optional filters for GET /admin/reports
export class AdminReportsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ListingReportTargetType })
  @IsOptional()
  @IsEnum(ListingReportTargetType)
  targetType?: ListingReportTargetType;

  /** Defaults to PENDING (the open queue), as before the filter existed. */
  @ApiPropertyOptional({
    enum: ListingReportStatus,
    default: ListingReportStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ListingReportStatus)
  status?: ListingReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reporterId?: string;
}
