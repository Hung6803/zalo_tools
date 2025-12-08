import { PartialType } from '@nestjs/swagger';
import { CreateZaloAccountDto } from './create-zalo-account.dto';

export class UpdateZaloAccountDto extends PartialType(CreateZaloAccountDto) {}
