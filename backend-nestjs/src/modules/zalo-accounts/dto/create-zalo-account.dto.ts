import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateZaloAccountDto {
  @ApiProperty({
    description: 'Phone number for Zalo account',
    example: '0912345678',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({
    description: 'Display name for this account',
    example: 'My Marketing Account',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName: string;
}
