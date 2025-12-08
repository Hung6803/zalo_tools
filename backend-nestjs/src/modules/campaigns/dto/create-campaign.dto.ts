import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsArray, IsDateString, Min, MaxLength } from 'class-validator';

export enum CampaignTargetType {
  CONTACTS = 'contacts',
  GROUPS = 'groups',
  MANUAL = 'manual',
}

export enum CampaignSendMethod {
  API = 'api',
  BROWSER = 'browser',
}

export enum CampaignScheduleType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
}

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign name',
    example: 'Spring Marketing Campaign 2024',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Campaign description',
    example: 'Send promotional messages to all contacts',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Message template ID',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  templateId?: number;

  @ApiProperty({
    description: 'Target type',
    enum: CampaignTargetType,
    example: CampaignTargetType.CONTACTS,
  })
  @IsEnum(CampaignTargetType)
  targetType: CampaignTargetType;

  @ApiProperty({
    description: 'Target group IDs (for groups target type)',
    example: [1, 2, 3],
    required: false,
  })
  @IsArray()
  @IsOptional()
  targetGroups?: number[];

  @ApiProperty({
    description: 'Target contact IDs (for contacts target type)',
    example: [1, 2, 3],
    required: false,
  })
  @IsArray()
  @IsOptional()
  targetContacts?: number[];

  @ApiProperty({
    description: 'Send method',
    enum: CampaignSendMethod,
    example: CampaignSendMethod.API,
  })
  @IsEnum(CampaignSendMethod)
  sendMethod: CampaignSendMethod;

  @ApiProperty({
    description: 'Schedule type',
    enum: CampaignScheduleType,
    example: CampaignScheduleType.IMMEDIATE,
  })
  @IsEnum(CampaignScheduleType)
  scheduleType: CampaignScheduleType;

  @ApiProperty({
    description: 'Scheduled time (required if scheduleType is SCHEDULED)',
    example: '2024-03-01T09:00:00',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({
    description: 'Messages per hour limit',
    example: 100,
    default: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  messagesPerHour?: number;

  @ApiProperty({
    description: 'Delay between messages in seconds',
    example: 5,
    default: 5,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  delayBetweenMessages?: number;
}
