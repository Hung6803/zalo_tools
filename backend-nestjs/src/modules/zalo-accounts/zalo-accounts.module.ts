import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZaloAccountsService } from './zalo-accounts.service';
import { ZaloAccountsController } from './zalo-accounts.controller';
import { ZaloAccount } from '../../database/entities/zalo-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZaloAccount])],
  controllers: [ZaloAccountsController],
  providers: [ZaloAccountsService],
  exports: [ZaloAccountsService],
})
export class ZaloAccountsModule {}
