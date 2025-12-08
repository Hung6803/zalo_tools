import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { ZaloGroup } from '../../database/entities/zalo-group.entity';
import { ZaloGroupMember } from '../../database/entities/zalo-group-member.entity';
import { ZaloBrowserModule } from '../zalo-browser/zalo-browser.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZaloGroup, ZaloGroupMember]),
    ZaloBrowserModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
