import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactGroupsService } from './contact-groups.service';
import { ContactGroupsController } from './contact-groups.controller';
import { ZaloContactGroup } from '../../database/entities/zalo-contact-group.entity';
import { ZaloContact } from '../../database/entities/zalo-contact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZaloContactGroup, ZaloContact]),
  ],
  controllers: [ContactGroupsController],
  providers: [ContactGroupsService],
  exports: [ContactGroupsService],
})
export class ContactGroupsModule {}
