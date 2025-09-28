import { PartialType } from '@nestjs/swagger';
import { CreatePOSSystemDto } from './create-pos-system.dto';

export class UpdatePOSSystemDto extends PartialType(CreatePOSSystemDto) {}