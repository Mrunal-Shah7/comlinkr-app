import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  eventsNearby?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  comments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  likes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  /** Plan 16 (TR-049): new follower, follow request, follow request accepted. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  followers?: boolean;
}
