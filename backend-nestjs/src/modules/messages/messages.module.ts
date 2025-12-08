import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ZaloMessage } from '../../database/entities/zalo-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZaloMessage])],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
