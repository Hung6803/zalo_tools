import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 1, description: 'Zalo account ID' })
  @IsNumber()
  accountId: number;

  @ApiProperty({ example: '1234567890', description: 'Recipient Zalo user ID' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Hello from API!', description: 'Message content' })
  @IsString()
  message: string;
}

export class SendBulkMessagesDto {
  @ApiProperty({ example: 1, description: 'Zalo account ID' })
  @IsNumber()
  accountId: number;

  @ApiProperty({
    example: [
      { userId: '123', message: 'Hello user 1' },
      { userId: '456', message: 'Hello user 2' },
    ],
    description: 'Array of recipients',
  })
  @IsArray()
  recipients: Array<{ userId: string; message: string }>;

  @ApiProperty({ example: 2000, description: 'Delay between messages in ms', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1000)
  delayMs?: number;

  @ApiProperty({ example: 3, description: 'Max retry attempts', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxRetries?: number;
}

export class FindUserDto {
  @ApiProperty({ example: 1, description: 'Zalo account ID' })
  @IsNumber()
  accountId: number;

  @ApiProperty({ example: '0123456789', description: 'Phone number to search' })
  @IsString()
  phoneNumber: string;
}

export class GetGroupMembersDto {
  @ApiProperty({ example: 1, description: 'Zalo account ID' })
  @IsNumber()
  accountId: number;

  @ApiProperty({ example: 'https://zalo.me/g/abc123', description: 'Zalo group link' })
  @IsString()
  groupLink: string;

  @ApiProperty({ example: 10, description: 'Maximum pages to fetch', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxPages?: number;
}

export class SendFriendRequestDto {
  @ApiProperty({ example: 1, description: 'Zalo account ID' })
  @IsNumber()
  accountId: number;

  @ApiProperty({ example: '1234567890', description: 'Target user Zalo ID' })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'Xin chào, tôi muốn kết bạn với bạn!',
    description: 'Friend request message',
    required: false
  })
  @IsString()
  @IsOptional()
  message?: string;
}
