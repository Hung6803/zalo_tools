import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZaloAccount } from '../../database/entities/zalo-account.entity';
import { ZaloApiService } from './zalo-api.service';
import { ZaloApiController } from './zalo-api.controller';
import { ZaloBrowserModule } from '../zalo-browser/zalo-browser.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZaloAccount]),
    ZaloBrowserModule,
  ],
  controllers: [ZaloApiController],
  providers: [ZaloApiService],
  exports: [ZaloApiService],
})
export class ZaloApiModule {}
