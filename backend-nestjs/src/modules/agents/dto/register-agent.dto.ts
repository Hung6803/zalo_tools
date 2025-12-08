import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterAgentDto {
  @ApiProperty({
    description: 'Computer name/hostname',
    example: 'DESKTOP-ABC123',
  })
  @IsString()
  @IsNotEmpty()
  computerName: string;

  @ApiProperty({
    description: 'IP address of the agent',
    example: '192.168.1.100',
    required: false,
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;
}

export class HeartbeatDto {
  @ApiProperty({
    description: 'Array of Zalo account IDs managed by this agent',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  zaloAccountIds?: number[];

  @ApiProperty({
    description: 'Agent status',
    example: 'online',
  })
  @IsString()
  @IsOptional()
  status?: 'online' | 'offline' | 'error';
}
