import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class BulkOperationDto {
  @ApiProperty({
    description: 'Array of template IDs to perform bulk operation on',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  templateIds: number[];
}
