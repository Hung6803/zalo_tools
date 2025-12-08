import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateConversationDto } from './create-conversation.dto';

export class UpdateConversationDto extends PartialType(
  OmitType(CreateConversationDto, ['zaloAccountId', 'conversationId'] as const),
) {}
