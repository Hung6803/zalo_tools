import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutoReplyService } from './auto-reply.service';
import { AutoReplyController } from './auto-reply.controller';
import { ZaloAutoReplyRule } from '../../database/entities/zalo-auto-reply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZaloAutoReplyRule])],
  controllers: [AutoReplyController],
  providers: [AutoReplyService],
  exports: [AutoReplyService],
})
export class AutoReplyModule {}
