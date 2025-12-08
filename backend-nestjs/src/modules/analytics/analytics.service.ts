import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloCampaign, CampaignStatus } from '../../database/entities/zalo-campaign.entity';
import { ZaloCampaignRecipient, RecipientStatus } from '../../database/entities/zalo-campaign-recipient.entity';
import { ZaloAutoReplyRule } from '../../database/entities/zalo-auto-reply.entity';
import { ZaloMessageTemplate } from '../../database/entities/zalo-template.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ZaloCampaign)
    private campaignRepository: Repository<ZaloCampaign>,
    @InjectRepository(ZaloCampaignRecipient)
    private recipientRepository: Repository<ZaloCampaignRecipient>,
    @InjectRepository(ZaloAutoReplyRule)
    private autoReplyRepository: Repository<ZaloAutoReplyRule>,
    @InjectRepository(ZaloMessageTemplate)
    private templateRepository: Repository<ZaloMessageTemplate>,
  ) {}

  /**
   * Get campaign overview statistics
   */
  async getCampaignOverview(zaloAccountId?: number): Promise<{
    totalCampaigns: number;
    draftCampaigns: number;
    runningCampaigns: number;
    completedCampaigns: number;
    failedCampaigns: number;
    pausedCampaigns: number;
    totalMessagesSent: number;
    totalMessagesFailed: number;
    averageSuccessRate: number;
  }> {
    const query = this.campaignRepository.createQueryBuilder('campaign');

    if (zaloAccountId) {
      query.where('campaign.zaloAccountId = :zaloAccountId', { zaloAccountId });
    }

    const campaigns = await query.getMany();

    const totalCampaigns = campaigns.length;
    const draftCampaigns = campaigns.filter(c => c.status === CampaignStatus.DRAFT).length;
    const runningCampaigns = campaigns.filter(c => c.status === CampaignStatus.RUNNING).length;
    const completedCampaigns = campaigns.filter(c => c.status === CampaignStatus.COMPLETED).length;
    const failedCampaigns = campaigns.filter(c => c.status === CampaignStatus.FAILED).length;
    const pausedCampaigns = campaigns.filter(c => c.status === CampaignStatus.PAUSED).length;

    const totalMessagesSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
    const totalMessagesFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0);

    // Calculate average success rate
    const completed = campaigns.filter(c => c.status === CampaignStatus.COMPLETED);
    let averageSuccessRate = 0;

    if (completed.length > 0) {
      const successRates = completed.map(c =>
        c.totalRecipients > 0 ? (c.sentCount / c.totalRecipients) * 100 : 0,
      );
      averageSuccessRate = successRates.reduce((sum, rate) => sum + rate, 0) / completed.length;
    }

    return {
      totalCampaigns,
      draftCampaigns,
      runningCampaigns,
      completedCampaigns,
      failedCampaigns,
      pausedCampaigns,
      totalMessagesSent,
      totalMessagesFailed,
      averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
    };
  }

  /**
   * Get campaign performance metrics
   */
  async getCampaignPerformance(options?: {
    zaloAccountId?: number;
    status?: CampaignStatus;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    campaignId: number;
    campaignName: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    pendingCount: number;
    successRate: number;
    startedAt: Date | null;
    completedAt: Date | null;
    durationMinutes: number | null;
  }>> {
    const query = this.campaignRepository.createQueryBuilder('campaign');

    if (options?.zaloAccountId) {
      query.where('campaign.zaloAccountId = :zaloAccountId', {
        zaloAccountId: options.zaloAccountId,
      });
    }

    if (options?.status) {
      query.andWhere('campaign.status = :status', { status: options.status });
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    const campaigns = await query.orderBy('campaign.createdAt', 'DESC').getMany();

    const results: Array<{
      campaignId: number;
      campaignName: string;
      totalRecipients: number;
      sentCount: number;
      failedCount: number;
      pendingCount: number;
      successRate: number;
      startedAt: Date | null;
      completedAt: Date | null;
      durationMinutes: number | null;
    }> = [];

    for (const campaign of campaigns) {
      // Get pending count
      const pendingCount = await this.recipientRepository.count({
        where: {
          campaignId: campaign.id,
          status: RecipientStatus.PENDING,
        },
      });

      // Calculate success rate
      const successRate =
        campaign.totalRecipients > 0
          ? (campaign.sentCount / campaign.totalRecipients) * 100
          : 0;

      // Calculate duration
      let durationMinutes: number | null = null;
      if (campaign.startedAt && campaign.completedAt) {
        const duration = campaign.completedAt.getTime() - campaign.startedAt.getTime();
        durationMinutes = Math.round((duration / 60000) * 100) / 100;
      }

      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        pendingCount,
        successRate: Math.round(successRate * 100) / 100,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
        durationMinutes,
      });
    }

    return results;
  }

  /**
   * Get detailed analytics for a specific campaign
   */
  async getCampaignDetails(campaignId: number): Promise<{
    campaign: any;
    metrics: any;
    statusBreakdown: any;
    failedRecipients: any[];
  }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get all recipients
    const recipients = await this.recipientRepository.find({
      where: { campaignId },
    });

    // Count by status
    const statusBreakdown = {
      pending: recipients.filter(r => r.status === RecipientStatus.PENDING).length,
      sending: recipients.filter(r => r.status === RecipientStatus.SENDING).length,
      sent: recipients.filter(r => r.status === RecipientStatus.SENT).length,
      failed: recipients.filter(r => r.status === RecipientStatus.FAILED).length,
    };

    // Get failed recipients with errors
    const failedRecipients = recipients
      .filter(r => r.status === RecipientStatus.FAILED)
      .slice(0, 10)
      .map(r => ({
        displayName: r.displayName,
        zaloId: r.zaloId,
        error: r.errorMessage,
      }));

    // Calculate metrics
    const successRate =
      campaign.totalRecipients > 0
        ? (campaign.sentCount / campaign.totalRecipients) * 100
        : 0;
    const failureRate =
      campaign.totalRecipients > 0
        ? (campaign.failedCount / campaign.totalRecipients) * 100
        : 0;

    let duration: { hours: number; minutes: number; seconds: number } | null = null;
    if (campaign.startedAt && campaign.completedAt) {
      const durationSeconds =
        (campaign.completedAt.getTime() - campaign.startedAt.getTime()) / 1000;
      duration = {
        hours: Math.floor(durationSeconds / 3600),
        minutes: Math.floor((durationSeconds % 3600) / 60),
        seconds: Math.floor(durationSeconds % 60),
      };
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        createdAt: campaign.createdAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      },
      metrics: {
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        duration,
      },
      statusBreakdown,
      failedRecipients,
    };
  }

  /**
   * Get daily statistics
   */
  async getDailyStats(days: number = 7, zaloAccountId?: number): Promise<Array<{
    date: string;
    messagesSent: number;
    messagesFailed: number;
    campaignsCompleted: number;
  }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.campaignRepository.createQueryBuilder('campaign');

    if (zaloAccountId) {
      query.where('campaign.zaloAccountId = :zaloAccountId', { zaloAccountId });
    }

    query.andWhere('campaign.startedAt >= :startDate', { startDate });

    const campaigns = await query.getMany();

    // Initialize daily stats
    const dailyStats: Record<string, { messagesSent: number; messagesFailed: number; campaignsCompleted: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = {
        messagesSent: 0,
        messagesFailed: 0,
        campaignsCompleted: 0,
      };
    }

    // Aggregate stats
    for (const campaign of campaigns) {
      if (campaign.startedAt) {
        const dateStr = campaign.startedAt.toISOString().split('T')[0];
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].messagesSent += campaign.sentCount;
          dailyStats[dateStr].messagesFailed += campaign.failedCount;

          if (campaign.status === CampaignStatus.COMPLETED) {
            dailyStats[dateStr].campaignsCompleted += 1;
          }
        }
      }
    }

    // Convert to array
    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        ...stats,
      }));
  }

  /**
   * Get auto-reply statistics
   */
  async getAutoReplyStats(zaloAccountId?: number): Promise<{
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    totalTriggered: number;
    mostTriggeredRule: any | null;
  }> {
    const query = this.autoReplyRepository.createQueryBuilder('rule');

    if (zaloAccountId) {
      query.where('rule.zaloAccountId = :zaloAccountId', { zaloAccountId });
    }

    const rules = await query.getMany();

    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.isActive).length;
    const inactiveRules = totalRules - activeRules;
    const totalTriggered = rules.reduce((sum, r) => sum + r.triggerCount, 0);

    let mostTriggeredRule: any = null;
    if (rules.length > 0) {
      const mostTriggered = rules.reduce((prev, current) =>
        prev.triggerCount > current.triggerCount ? prev : current,
      );

      if (mostTriggered.triggerCount > 0) {
        mostTriggeredRule = {
          id: mostTriggered.id,
          name: mostTriggered.name,
          triggeredCount: mostTriggered.triggerCount,
          lastTriggeredAt: mostTriggered.lastTriggeredAt,
        };
      }
    }

    return {
      totalRules,
      activeRules,
      inactiveRules,
      totalTriggered,
      mostTriggeredRule,
    };
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(zaloAccountId?: number): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    inactiveTemplates: number;
    mostUsedTemplate: any | null;
  }> {
    const query = this.templateRepository.createQueryBuilder('template');

    if (zaloAccountId) {
      query.where('template.zaloAccountId = :zaloAccountId', { zaloAccountId });
    }

    const templates = await query.getMany();

    const totalTemplates = templates.length;
    const activeTemplates = templates.filter(t => t.isActive).length;
    const inactiveTemplates = totalTemplates - activeTemplates;

    let mostUsedTemplate: any = null;
    if (templates.length > 0) {
      const mostUsed = templates.reduce((prev, current) =>
        prev.usageCount > current.usageCount ? prev : current,
      );

      if (mostUsed.usageCount > 0) {
        mostUsedTemplate = {
          id: mostUsed.id,
          name: mostUsed.name,
          usageCount: mostUsed.usageCount,
          lastUsedAt: mostUsed.lastUsedAt,
        };
      }
    }

    return {
      totalTemplates,
      activeTemplates,
      inactiveTemplates,
      mostUsedTemplate,
    };
  }

  /**
   * Export campaign report
   */
  async exportCampaignReport(campaignId: number): Promise<{
    campaign: any;
    recipients: any[];
  }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const recipients = await this.recipientRepository.find({
      where: { campaignId },
    });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
      },
      recipients: recipients.map(r => ({
        displayName: r.displayName,
        zaloId: r.zaloId,
        status: r.status,
        sentAt: r.sentAt,
        error: r.errorMessage,
      })),
    };
  }
}
