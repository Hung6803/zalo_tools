import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateContactGroupDto } from './create-contact-group.dto';

export class UpdateContactGroupDto extends PartialType(
  OmitType(CreateContactGroupDto, ['contactIds'] as const),
) {}
