import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsInt, MaxLength } from 'class-validator';
import { ConversationType } from '../../../database/entities/zalo-conversation.entity';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Zalo account ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  zaloAccountId: number;

  @ApiProperty({
    description: 'Unique conversation ID from Zalo',
    example: 'conv_123456789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  conversationId: string;

  @ApiProperty({
    description: 'Type of conversation',
    enum: ConversationType,
    example: ConversationType.PERSONAL,
  })
  @IsEnum(ConversationType)
  conversationType: ConversationType;

  @ApiProperty({
    description: 'List of participant Zalo IDs',
    example: ['1234567890', '0987654321'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participantIds?: string[];
}
