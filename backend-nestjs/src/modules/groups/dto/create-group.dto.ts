import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { GroupType } from '../../../database/entities/zalo-group.entity';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Zalo group link',
    example: 'https://zalo.me/g/abc123',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  groupLink: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Marketing Group',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  groupName?: string;

  @ApiProperty({
    description: 'Group ID from Zalo',
    example: '123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  groupId?: string;

  @ApiProperty({
    description: 'Type of group',
    enum: GroupType,
    required: false,
  })
  @IsEnum(GroupType)
  @IsOptional()
  groupType?: GroupType;
}
