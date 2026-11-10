import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Length,
  IsOptional,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SetLocationDto {
  @ApiProperty({ description: 'Country name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  country: string;

  @ApiProperty({ description: 'ISO country code', minLength: 2, maxLength: 3 })
  @IsString()
  @IsNotEmpty()
  @Length(2, 3)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  countryCode: string;

  @ApiProperty({ description: 'Dial code e.g. +91', maxLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  dialCode: string;

  @ApiProperty({ description: 'State or province', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  state: string;

  @ApiProperty({ description: 'City', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  city: string;

  @ApiPropertyOptional({
    description: 'Latitude of the phone when the city was detected (plan 08)',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude of the phone when the city was detected (plan 08)',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
