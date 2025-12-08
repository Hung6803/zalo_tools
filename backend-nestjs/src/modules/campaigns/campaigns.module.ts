import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsProcessor } from './campaigns.processor';
import { ZaloCampaign } from '../../database/entities/zalo-campaign.entity';
import { ZaloCampaignRecipient } from '../../database/entities/zalo-campaign-recipient.entity';
import { ZaloContact } from '../../database/entities/zalo-contact.entity';
import { ZaloApiModule } from '../zalo-api/zalo-api.module';
import { TemplatesModule } from '../templates/templates.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZaloCampaign, ZaloCampaignRecipient, ZaloContact]),
    BullModule.registerQueue({
      name: 'campaigns',
    }),
    ZaloApiModule,
    TemplatesModule,
    GroupsModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignsProcessor],
  exports: [CampaignsService],
})
export class CampaignsModule {}
