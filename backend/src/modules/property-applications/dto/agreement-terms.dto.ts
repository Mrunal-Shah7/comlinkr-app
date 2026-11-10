import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Step 4 — agreement terms acknowledgement. */
export class AgreementTermsDto {
  @ApiPropertyOptional({ description: 'Ignored; rent comes from the listing' })
  @IsOptional()
  @IsNumber()
  rentAmount?: number;

  @ApiPropertyOptional({
    description: 'Ignored; deposit comes from the listing',
  })
  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @ApiProperty({ maxLength: 50, example: '12 months' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  leaseTerm: string;

  @ApiProperty({ description: 'Same formats as the step 1 moveInDate' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  moveInDate: string;

  // Plan 12: the terms are sent with the application, before the tenant has read the agreement; the signature on
  // the offer is the acknowledgement. Older builds still send both as true.
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  termsRead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Equals(true, { message: 'termsAgreed must be true when sent' })
  termsAgreed?: boolean;
}
