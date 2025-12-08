import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class ScrapeGroupDto {
  @ApiProperty({ example: 1, description: 'Zalo account ID' })
  @IsNumber()
  accountId: number;

  @ApiProperty({
    example: 'https://chat.zalo.me/g/abc123',
    description: 'Zalo group link',
  })
  @IsString()
  groupLink: string;

  @ApiProperty({
    example: 1000,
    description: 'Maximum members to scrape',
    required: false,
    default: 1000,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10000)
  maxMembers?: number;

  @ApiProperty({
    example: true,
    description: 'Auto join group if not member',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  autoJoin?: boolean;

  @ApiProperty({
    example: false,
    description: 'Auto leave group after scraping',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoLeave?: boolean;
}
