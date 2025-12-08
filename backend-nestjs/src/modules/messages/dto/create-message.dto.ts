import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, MaxLength } from 'class-validator';
import { MessageType } from '../../../database/entities/zalo-message.entity';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @ApiProperty({
    description: 'Zalo message ID (unique)',
    example: 'msg_123456789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  zaloMessageId: string;

  @ApiProperty({
    description: 'Sender Zalo ID',
    example: '1234567890123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  senderZaloId?: string;

  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  messageType: MessageType;

  @ApiProperty({
    description: 'Message content (for text messages)',
    example: 'Hello, how are you?',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Media URL (for image/video/file messages)',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  mediaUrl?: string;

  @ApiProperty({
    description: 'Additional message metadata',
    example: { width: 1024, height: 768 },
    required: false,
  })
  @IsOptional()
  messageMetadata?: any;
}
