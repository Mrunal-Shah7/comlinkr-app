// Plan 08 (TR-042): an admin sets a user's city by hand, overriding the one detected from their location.
import { OmitType } from '@nestjs/swagger';
import { UpdateCityDto } from '../../settings/dto/update-city.dto';

export class SetUserLocationDto extends OmitType(UpdateCityDto, ['latitude', 'longitude'] as const) {}
