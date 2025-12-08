import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, MaxLength } from 'class-validator';

export class CreateContactGroupDto {
  @ApiProperty({
    description: 'Group name',
    example: 'VIP Customers',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Group description',
    example: 'High value customers for special campaigns',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Contact IDs to add to this group',
    example: [1, 2, 3],
    required: false,
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  contactIds?: number[];
}
