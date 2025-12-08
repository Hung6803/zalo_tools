import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { ZaloMessageTemplate } from '../../database/entities/zalo-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ZaloMessageTemplate])],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
