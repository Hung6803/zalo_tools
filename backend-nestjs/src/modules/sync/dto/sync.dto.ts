import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageLogDto {
  @ApiProperty()
  @IsNumber()
  accountId: number;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsString()
  messageId: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  sentAt: Date;
}

export class SyncMessagesDto {
  @ApiProperty({ type: [MessageLogDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageLogDto)
  messages: MessageLogDto[];
}

export class ContactDto {
  @ApiProperty()
  @IsNumber()
  accountId: number;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  avatar?: string;
}

export class SyncContactsDto {
  @ApiProperty({ type: [ContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts: ContactDto[];
}

export class GroupMemberDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  role?: string;
}

export class SyncGroupMembersDto {
  @ApiProperty()
  @IsNumber()
  accountId: number;

  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty()
  @IsString()
  groupName: string;

  @ApiProperty({ type: [GroupMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupMemberDto)
  members: GroupMemberDto[];

  @ApiProperty()
  scrapedAt: Date;
}
