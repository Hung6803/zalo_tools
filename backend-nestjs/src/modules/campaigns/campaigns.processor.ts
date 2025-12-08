import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloCampaign, CampaignStatus } from '../../database/entities/zalo-campaign.entity';
import { ZaloCampaignRecipient, RecipientStatus } from '../../database/entities/zalo-campaign-recipient.entity';
import { ZaloApiService } from '../zalo-api/zalo-api.service';
import { TemplatesService } from '../templates/templates.service';

@Processor('campaigns')
export class CampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    @InjectRepository(ZaloCampaign)
    private campaignRepository: Repository<ZaloCampaign>,
    @InjectRepository(ZaloCampaignRecipient)
    private campaignRecipientRepository: Repository<ZaloCampaignRecipient>,
    private zaloApiService: ZaloApiService,
    private templatesService: TemplatesService,
    @InjectQueue('campaigns')
    private campaignQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'send-campaign-message':
        return this.processSendMessage(job);
      case 'prepare-campaign':
        return this.processPrepareCampaign(job);
      case 'execute-campaign':
        return this.processExecuteCampaign(job);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Process sending a single campaign message
   */
  private async processSendMessage(job: Job): Promise<void> {
    const { campaignId, recipientId, zaloAccountId, zaloId, message, templateId, templateVariables } = job.data;

    this.logger.log(`Sending message to recipient ${recipientId} for campaign ${campaignId}`);

    try {
      // Update recipient status to SENDING
      await this.campaignRecipientRepository.update(recipientId, {
        status: RecipientStatus.SENDING,
      });

      // Prepare message content
      let messageContent = message;

      // If template is used, render it with variables
      if (templateId) {
        const rendered = await this.templatesService.preview(zaloAccountId, {
          templateId,
          variables: templateVariables || {},
        });
        messageContent = rendered.rendered;
      }

      // Send message via Zalo API
      const result = await this.zaloApiService.sendMessage(
        zaloAccountId,
        zaloId,
        messageContent,
      );

      this.logger.log(`Message sent successfully to ${zaloId}:`, result);

      // Update recipient status to SENT
      await this.campaignRecipientRepository.update(recipientId, {
        status: RecipientStatus.SENT,
        sentAt: new Date(),
      });

      // Update campaign sent count
      await this.campaignRepository.increment(
        { id: campaignId },
        'sentCount',
        1,
      );

      this.logger.log(`Recipient ${recipientId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to send message to recipient ${recipientId}:`, error);

      // Update recipient status to FAILED
      await this.campaignRecipientRepository.update(recipientId, {
        status: RecipientStatus.FAILED,
        errorMessage: error.message,
      });

      // Update campaign failed count
      await this.campaignRepository.increment(
        { id: campaignId },
        'failedCount',
        1,
      );

      throw error;
    }
  }

  /**
   * Execute campaign - create jobs for each recipient
   */
  private async processExecuteCampaign(job: Job): Promise<void> {
    const { campaignId, zaloAccountId } = job.data;

    this.logger.log(`Executing campaign ${campaignId}`);

    // Get campaign details
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Check if campaign is still in RUNNING status
    if (campaign.status !== CampaignStatus.RUNNING) {
      this.logger.warn(`Campaign ${campaignId} is not in RUNNING status, skipping execution`);
      return;
    }

    // Get all pending recipients
    const recipients = await this.campaignRecipientRepository.find({
      where: {
        campaignId,
        status: RecipientStatus.PENDING,
      },
    });

    this.logger.log(`Found ${recipients.length} pending recipients for campaign ${campaignId}`);

    // Calculate delay between messages (in milliseconds)
    const delayMs = campaign.delayBetweenMessages * 1000;

    // Create jobs for each recipient with delay
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Add delay to spread out the messages
      const delay = i * delayMs;

      await this.campaignQueue.add(
        'send-campaign-message',
        {
          campaignId: campaign.id,
          recipientId: recipient.id,
          zaloAccountId: campaign.zaloAccountId,
          zaloId: recipient.zaloId,
          message: campaign.messageContent,
          templateId: campaign.templateId,
          templateVariables: {}, // TODO: Add support for per-recipient variables
        },
        {
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    }

    this.logger.log(`Created ${recipients.length} message jobs for campaign ${campaignId}`);
  }

  /**
   * Prepare campaign recipients (legacy - kept for compatibility)
   */
  private async processPrepareCampaign(job: Job): Promise<void> {
    const { campaignId } = job.data;
    this.logger.log(`Prepare campaign job ${campaignId} - handled by service layer`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number | object) {
    this.logger.log(`Job ${job.id} progress: ${JSON.stringify(progress)}`);
  }
}
