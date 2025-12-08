import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsBoolean, IsInt, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum MatchType {
  EXACT = 'exact',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  REGEX = 'regex',
}

export class CreateAutoReplyDto {
  @ApiProperty({
    description: 'Rule name',
    example: 'Price Inquiry Response',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Keywords to trigger this rule',
    example: ['giá', 'price', 'bao nhiêu'],
  })
  @IsArray()
  @IsNotEmpty()
  keywords: string[];

  @ApiProperty({
    description: 'Reply message content',
    example: 'Bảng giá của chúng tôi: ...',
  })
  @IsString()
  @IsNotEmpty()
  replyContent: string;

  @ApiProperty({
    description: 'Match type for keywords',
    enum: MatchType,
    example: MatchType.CONTAINS,
  })
  @IsEnum(MatchType)
  matchType: MatchType;

  @ApiProperty({
    description: 'Whether the rule is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Rule priority (higher value = higher priority)',
    example: 1,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  priority?: number;
}
