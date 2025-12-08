import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class ManageContactsDto {
  @ApiProperty({
    description: 'Contact IDs to add or remove',
    example: [1, 2, 3],
  })
  @IsArray()
  @IsInt({ each: true })
  contactIds: number[];
}
