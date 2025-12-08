import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsNotEmpty } from 'class-validator';

export class PreviewTemplateDto {
  @ApiProperty({
    description: 'Template ID to preview',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  templateId: number;

  @ApiProperty({
    description: 'Variables to substitute in template',
    example: { name: 'John Doe', group_name: 'Marketing Team' },
  })
  @IsObject()
  @IsNotEmpty()
  variables: Record<string, string>;
}

export class PreviewTemplateResponseDto {
  @ApiProperty({
    description: 'Original template content',
    example: 'Xin chào {name}, chúc mừng bạn đã tham gia {group_name}!',
  })
  original: string;

  @ApiProperty({
    description: 'Rendered template with variables substituted',
    example: 'Xin chào John Doe, chúc mừng bạn đã tham gia Marketing Team!',
  })
  rendered: string;

  @ApiProperty({
    description: 'List of variables used in template',
    example: ['name', 'group_name'],
  })
  variablesUsed: string[];
}
