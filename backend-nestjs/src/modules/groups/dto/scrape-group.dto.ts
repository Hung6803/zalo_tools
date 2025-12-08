import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ScrapeGroupDto {
  @ApiProperty({
    description: 'Group ID to scrape members from',
    example: 1,
  })
  @IsInt()
  groupId: number;
}
