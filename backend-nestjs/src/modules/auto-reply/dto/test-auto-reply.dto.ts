import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TestAutoReplyDto {
  @ApiProperty({
    description: 'Message to test against auto-reply rules',
    example: 'Sản phẩm này giá bao nhiêu?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class TestAutoReplyResponseDto {
  @ApiProperty({
    description: 'Whether a rule matched',
    example: true,
  })
  matched: boolean;

  @ApiProperty({
    description: 'ID of matched rule',
    example: 1,
    required: false,
  })
  ruleId?: number;

  @ApiProperty({
    description: 'Name of matched rule',
    example: 'Price Inquiry Response',
    required: false,
  })
  ruleName?: string;

  @ApiProperty({
    description: 'Reply content from matched rule',
    example: 'Bảng giá của chúng tôi: ...',
    required: false,
  })
  replyContent?: string;
}
