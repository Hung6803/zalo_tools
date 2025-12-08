import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { ZaloCampaign, CampaignStatus, TargetType, SendMethod, ScheduleType } from '../../database/entities/zalo-campaign.entity';
import { ZaloCampaignRecipient, RecipientStatus } from '../../database/entities/zalo-campaign-recipient.entity';
import { ZaloContact } from '../../database/entities/zalo-contact.entity';
import { CreateCampaignDto, CampaignTargetType, CampaignSendMethod, CampaignScheduleType } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(ZaloCampaign)
    private campaignRepository: Repository<ZaloCampaign>,
    @InjectRepository(ZaloCampaignRecipient)
    private campaignRecipientRepository: Repository<ZaloCampaignRecipient>,
    @InjectRepository(ZaloContact)
    private contactRepository: Repository<ZaloContact>,
    @InjectQueue('campaigns')
    private campaignQueue: Queue,
    private groupsService: GroupsService,
  ) {}

  /**
   * Create a new campaign
   */
  async create(zaloAccountId: number, createDto: CreateCampaignDto): Promise<ZaloCampaign> {
    // Calculate total targets based on target type
    let totalTargets = 0;

    if (createDto.targetType === CampaignTargetType.CONTACTS) {
      totalTargets = createDto.targetContacts?.length || 0;
    } else if (createDto.targetType === CampaignTargetType.GROUPS) {
      // Count total members in target groups
      totalTargets = await this.groupsService.countMembersInGroups(createDto.targetGroups || []);
    }

    // Map DTO enums to entity enums
    const targetTypeMap: Record<CampaignTargetType, TargetType> = {
      [CampaignTargetType.CONTACTS]: TargetType.CONTACTS,
      [CampaignTargetType.GROUPS]: TargetType.GROUPS,
      [CampaignTargetType.MANUAL]: TargetType.MANUAL,
    };

    const sendMethodMap: Record<CampaignSendMethod, SendMethod> = {
      [CampaignSendMethod.API]: SendMethod.API,
      [CampaignSendMethod.BROWSER]: SendMethod.BROWSER,
    };

    const scheduleTypeMap: Record<CampaignScheduleType, ScheduleType> = {
      [CampaignScheduleType.IMMEDIATE]: ScheduleType.IMMEDIATE,
      [CampaignScheduleType.SCHEDULED]: ScheduleType.SCHEDULED,
    };

    const campaignData = {
      zaloAccountId,
      name: createDto.name,
      description: createDto.description,
      templateId: createDto.templateId,
      targetType: targetTypeMap[createDto.targetType],
      targetGroups: createDto.targetGroups,
      targetContacts: createDto.targetContacts,
      sendMethod: sendMethodMap[createDto.sendMethod],
      scheduleType: scheduleTypeMap[createDto.scheduleType],
      scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : undefined,
      messagesPerHour: createDto.messagesPerHour || 100,
      delayBetweenMessages: createDto.delayBetweenMessages || 5,
      totalRecipients: totalTargets,
      sentCount: 0,
      failedCount: 0,
      status: CampaignStatus.DRAFT,
    };

    const campaign = this.campaignRepository.create(campaignData);
    return await this.campaignRepository.save(campaign);
  }

  /**
   * Find all campaigns for a Zalo account
   */
  async findAll(
    zaloAccountId: number,
    filters?: {
      status?: CampaignStatus;
    },
  ): Promise<ZaloCampaign[]> {
    const query = this.campaignRepository
      .createQueryBuilder('campaign')
      .where('campaign.zaloAccountId = :zaloAccountId', { zaloAccountId });

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }

    return query.orderBy('campaign.createdAt', 'DESC').getMany();
  }

  /**
   * Find one campaign by ID
   */
  async findOne(id: number, zaloAccountId: number): Promise<ZaloCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, zaloAccountId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  /**
   * Update a campaign (only if in DRAFT or PAUSED status)
   */
  async update(
    id: number,
    zaloAccountId: number,
    updateDto: UpdateCampaignDto,
  ): Promise<ZaloCampaign> {
    const campaign = await this.findOne(id, zaloAccountId);

    if (![CampaignStatus.DRAFT, CampaignStatus.PAUSED].includes(campaign.status)) {
      throw new BadRequestException('Can only update campaigns in DRAFT or PAUSED status');
    }

    Object.assign(campaign, updateDto);

    return this.campaignRepository.save(campaign);
  }

  /**
   * Delete a campaign (only if in DRAFT status)
   */
  async remove(id: number, zaloAccountId: number): Promise<void> {
    const campaign = await this.findOne(id, zaloAccountId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only delete campaigns in DRAFT status');
    }

    await this.campaignRepository.remove(campaign);
  }

  /**
   * Start campaign execution
   */
  async start(id: number, zaloAccountId: number): Promise<{ message: string; jobId: string }> {
    const campaign = await this.findOne(id, zaloAccountId);

    if (![CampaignStatus.DRAFT, CampaignStatus.PAUSED].includes(campaign.status)) {
      throw new BadRequestException('Can only start campaigns in DRAFT or PAUSED status');
    }

    // Prepare recipients if not already prepared
    if (campaign.status === CampaignStatus.DRAFT) {
      await this.prepareRecipients(campaign);
    }

    // Update status
    campaign.status = CampaignStatus.RUNNING;
    campaign.startedAt = new Date();
    await this.campaignRepository.save(campaign);

    // Add job to queue
    const job = await this.campaignQueue.add('execute-campaign', {
      campaignId: campaign.id,
      zaloAccountId: campaign.zaloAccountId,
    });

    return {
      message: 'Campaign started successfully',
      jobId: job.id as string,
    };
  }

  /**
   * Pause a running campaign
   */
  async pause(id: number, zaloAccountId: number): Promise<ZaloCampaign> {
    const campaign = await this.findOne(id, zaloAccountId);

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Can only pause running campaigns');
    }

    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepository.save(campaign);
  }

  /**
   * Stop a campaign (cannot be restarted)
   */
  async stop(id: number, zaloAccountId: number): Promise<ZaloCampaign> {
    const campaign = await this.findOne(id, zaloAccountId);

    if (![CampaignStatus.RUNNING, CampaignStatus.PAUSED].includes(campaign.status)) {
      throw new BadRequestException('Can only stop running or paused campaigns');
    }

    campaign.status = CampaignStatus.COMPLETED;
    campaign.completedAt = new Date();
    return this.campaignRepository.save(campaign);
  }

  /**
   * Get campaign statistics
   */
  async getStats(id: number, zaloAccountId: number): Promise<{
    campaignId: number;
    totalTargets: number;
    messagesSent: number;
    messagesFailed: number;
    messagesPending: number;
    successRate: number;
    startedAt: Date | null;
    completedAt: Date | null;
  }> {
    const campaign = await this.findOne(id, zaloAccountId);

    const messagesPending = campaign.totalRecipients - campaign.sentCount - campaign.failedCount;
    const successRate =
      campaign.totalRecipients > 0 ? (campaign.sentCount / campaign.totalRecipients) * 100 : 0;

    return {
      campaignId: campaign.id,
      totalTargets: campaign.totalRecipients,
      messagesSent: campaign.sentCount,
      messagesFailed: campaign.failedCount,
      messagesPending,
      successRate: Math.round(successRate * 100) / 100,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
    };
  }

  /**
   * Prepare campaign recipients
   */
  private async prepareRecipients(campaign: ZaloCampaign): Promise<void> {
    let recipients: any[] = [];

    if (campaign.targetType === TargetType.CONTACTS && campaign.targetContacts) {
      // Get contacts
      const contacts = await this.contactRepository.find({
        where: campaign.targetContacts.map(id => ({ id })),
      });

      // Create campaign recipient records from contacts
      recipients = contacts.map(contact =>
        this.campaignRecipientRepository.create({
          campaignId: campaign.id,
          zaloId: contact.zaloId,
          displayName: contact.displayName,
          phoneNumber: contact.phoneNumber,
          status: RecipientStatus.PENDING,
        }),
      );
    } else if (campaign.targetType === TargetType.GROUPS && campaign.targetGroups) {
      // Get all members from target groups
      const allMembers: any[] = [];

      for (const groupId of campaign.targetGroups) {
        const members = await this.groupsService.getMembers(groupId, campaign.zaloAccountId);
        allMembers.push(...members);
      }

      // Remove duplicates based on zaloId
      const uniqueMembers = Array.from(
        new Map(allMembers.map(m => [m.zaloId, m])).values(),
      );

      // Create campaign recipient records from group members
      recipients = uniqueMembers.map(member =>
        this.campaignRecipientRepository.create({
          campaignId: campaign.id,
          zaloId: member.zaloId,
          displayName: member.displayName,
          phoneNumber: member.phoneNumber,
          status: RecipientStatus.PENDING,
        }),
      );
    } else if (campaign.targetType === TargetType.MANUAL) {
      // For manual type, recipients should be added manually via API
      // No automatic preparation needed
      this.logger.log(`Campaign ${campaign.id} uses MANUAL targeting - recipients must be added manually`);
      return;
    }

    // Save all recipients
    if (recipients.length > 0) {
      await this.campaignRecipientRepository.save(recipients);

      // Update campaign total targets
      campaign.totalRecipients = recipients.length;
      await this.campaignRepository.save(campaign);

      this.logger.log(`Prepared ${recipients.length} recipients for campaign ${campaign.id}`);
    }
  }

  /**
   * Bulk delete campaigns
   */
  async bulkDelete(ids: number[], zaloAccountId: number): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.remove(id, zaloAccountId);
        deleted++;
      } catch (error) {
        if (error instanceof NotFoundException) {
          errors.push(`Campaign ${id} not found`);
        } else {
          errors.push(`Campaign ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }
}
