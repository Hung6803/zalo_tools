import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ZaloCampaign } from '../../database/entities/zalo-campaign.entity';
import { ZaloCampaignRecipient } from '../../database/entities/zalo-campaign-recipient.entity';
import { ZaloAutoReplyRule } from '../../database/entities/zalo-auto-reply.entity';
import { ZaloMessageTemplate } from '../../database/entities/zalo-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZaloCampaign,
      ZaloCampaignRecipient,
      ZaloAutoReplyRule,
      ZaloMessageTemplate,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
