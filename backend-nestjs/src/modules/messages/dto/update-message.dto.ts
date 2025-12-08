import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMessageDto } from './create-message.dto';

export class UpdateMessageDto extends PartialType(
  OmitType(CreateMessageDto, ['conversationId', 'zaloMessageId'] as const),
) {}
