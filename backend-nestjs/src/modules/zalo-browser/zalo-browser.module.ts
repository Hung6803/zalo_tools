import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZaloBrowserService } from './zalo-browser.service';
import { ZaloBrowserController } from './zalo-browser.controller';
import { ZaloAccount } from '../../database/entities/zalo-account.entity';
import { ZaloGroup } from '../../database/entities/zalo-group.entity';
import { ZaloGroupMember } from '../../database/entities/zalo-group-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZaloAccount, ZaloGroup, ZaloGroupMember])],
  controllers: [ZaloBrowserController],
  providers: [ZaloBrowserService],
  exports: [ZaloBrowserService],
})
export class ZaloBrowserModule {}
