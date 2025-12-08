import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus } from '../../database/entities/zalo-campaign.entity';

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async create(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() createDto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(zaloAccountId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async findAll(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Query('status') status?: CampaignStatus,
  ) {
    return this.campaignsService.findAll(zaloAccountId, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.campaignsService.findOne(id, zaloAccountId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.campaignsService.getStats(id, zaloAccountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign (only DRAFT or PAUSED)' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update campaign in current status' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() updateDto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, zaloAccountId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign (only DRAFT)' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete campaign in current status' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    await this.campaignsService.remove(id, zaloAccountId);
    return { message: 'Campaign deleted successfully' };
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start campaign execution' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Campaign started successfully' })
  @ApiResponse({ status: 400, description: 'Cannot start campaign in current status' })
  async start(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    return this.campaignsService.start(id, zaloAccountId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause running campaign' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Campaign paused successfully' })
  @ApiResponse({ status: 400, description: 'Can only pause running campaigns' })
  async pause(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    const campaign = await this.campaignsService.pause(id, zaloAccountId);
    return {
      message: 'Campaign paused successfully',
      status: campaign.status,
    };
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop campaign (cannot be restarted)' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Campaign stopped successfully' })
  @ApiResponse({ status: 400, description: 'Can only stop running or paused campaigns' })
  async stop(
    @Param('id', ParseIntPipe) id: number,
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
  ) {
    const campaign = await this.campaignsService.stop(id, zaloAccountId);
    return {
      message: 'Campaign stopped successfully',
      status: campaign.status,
    };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple campaigns (only DRAFT)' })
  @ApiQuery({ name: 'zaloAccountId', required: true, type: Number })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Campaigns deletion result' })
  async bulkDelete(
    @Query('zaloAccountId', ParseIntPipe) zaloAccountId: number,
    @Body() body: { campaignIds: number[] },
  ) {
    return this.campaignsService.bulkDelete(body.campaignIds, zaloAccountId);
  }
}
