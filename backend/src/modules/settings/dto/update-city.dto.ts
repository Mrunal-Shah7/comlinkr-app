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

export class UpdateCityDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @ApiProperty({ minLength: 2, maxLength: 3 })
  @IsString()
  @IsNotEmpty()
  @Length(2, 3)
  countryCode: string;

  @ApiProperty({ maxLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  dialCode: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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
