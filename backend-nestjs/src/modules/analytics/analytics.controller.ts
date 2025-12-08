import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CampaignStatus } from '../../database/entities/zalo-campaign.entity';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('campaigns/overview')
  @ApiOperation({ summary: 'Get campaign overview statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Campaign overview statistics' })
  async getCampaignOverview(@Query('zaloAccountId') zaloAccountId?: number) {
    return this.analyticsService.getCampaignOverview(
      zaloAccountId ? +zaloAccountId : undefined,
    );
  }

  @Get('campaigns/performance')
  @ApiOperation({ summary: 'Get campaign performance metrics' })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Campaign performance metrics' })
  async getCampaignPerformance(
    @Query('zaloAccountId') zaloAccountId?: number,
    @Query('status') status?: CampaignStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.analyticsService.getCampaignPerformance({
      zaloAccountId: zaloAccountId ? +zaloAccountId : undefined,
      status,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get('campaigns/:campaignId/details')
  @ApiOperation({ summary: 'Get detailed analytics for a specific campaign' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignDetails(@Param('campaignId', ParseIntPipe) campaignId: number) {
    return this.analyticsService.getCampaignDetails(campaignId);
  }

  @Get('campaigns/daily-stats')
  @ApiOperation({ summary: 'Get daily statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (1-90)' })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Daily statistics' })
  async getDailyStats(
    @Query('days') days?: number,
    @Query('zaloAccountId') zaloAccountId?: number,
  ) {
    const daysCount = days ? Math.min(Math.max(+days, 1), 90) : 7;
    return this.analyticsService.getDailyStats(
      daysCount,
      zaloAccountId ? +zaloAccountId : undefined,
    );
  }

  @Get('auto-replies/stats')
  @ApiOperation({ summary: 'Get auto-reply statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Auto-reply statistics' })
  async getAutoReplyStats(@Query('zaloAccountId') zaloAccountId?: number) {
    return this.analyticsService.getAutoReplyStats(
      zaloAccountId ? +zaloAccountId : undefined,
    );
  }

  @Get('templates/stats')
  @ApiOperation({ summary: 'Get template statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Template statistics' })
  async getTemplateStats(@Query('zaloAccountId') zaloAccountId?: number) {
    return this.analyticsService.getTemplateStats(
      zaloAccountId ? +zaloAccountId : undefined,
    );
  }

  @Get('campaigns/:campaignId/export')
  @ApiOperation({ summary: 'Export campaign report' })
  @ApiResponse({ status: 200, description: 'Campaign report' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async exportCampaignReport(@Param('campaignId', ParseIntPipe) campaignId: number) {
    return this.analyticsService.exportCampaignReport(campaignId);
  }
}
