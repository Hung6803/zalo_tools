import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    description: 'Zalo user ID',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  zaloId: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Nguyen Van A',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName: string;

  @ApiProperty({
    description: 'Phone number',
    example: '0912345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://...',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({
    description: 'Gender',
    example: 'male',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @ApiProperty({
    description: 'Birthday',
    example: '01/01/1990',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  birthday?: string;

  @ApiProperty({
    description: 'Additional notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
