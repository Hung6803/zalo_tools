import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength, IsNumber } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({
    description: 'Zalo Account ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  zaloAccountId: number;

  @ApiProperty({
    description: 'Template name',
    example: 'Welcome Message',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Template content with variables in {variable} format',
    example: 'Xin chào {name}, chúc mừng bạn đã tham gia {group_name}!',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Template for welcoming new members',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Template category',
    example: 'welcome',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'List of variables used in template (auto-extracted if not provided)',
    example: ['name', 'group_name'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  variables?: string[];
}
