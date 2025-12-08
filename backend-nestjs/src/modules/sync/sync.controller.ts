import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { AgentsService } from '../agents/agents.service';
import { SyncMessagesDto, SyncContactsDto, SyncGroupMembersDto } from './dto/sync.dto';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly agentsService: AgentsService,
  ) {}

  @Post('messages')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiOperation({ summary: 'Sync message logs from desktop agent' })
  @ApiResponse({ status: 200, description: 'Messages synced successfully' })
  async syncMessages(
    @Headers('x-agent-key') apiKey: string,
    @Body() dto: SyncMessagesDto,
  ) {
    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid API key');
    }

    const result = await this.syncService.syncMessages(agent.userId, dto);

    return {
      success: true,
      ...result,
      timestamp: new Date(),
    };
  }

  @Post('contacts')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiOperation({ summary: 'Sync contacts from desktop agent' })
  @ApiResponse({ status: 200, description: 'Contacts synced successfully' })
  async syncContacts(
    @Headers('x-agent-key') apiKey: string,
    @Body() dto: SyncContactsDto,
  ) {
    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid API key');
    }

    const result = await this.syncService.syncContacts(agent.userId, dto);

    return {
      success: true,
      ...result,
      timestamp: new Date(),
    };
  }

  @Post('group-members')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiOperation({ summary: 'Sync group members from desktop agent' })
  @ApiResponse({ status: 200, description: 'Group members synced successfully' })
  async syncGroupMembers(
    @Headers('x-agent-key') apiKey: string,
    @Body() dto: SyncGroupMembersDto,
  ) {
    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid API key');
    }

    const result = await this.syncService.syncGroupMembers(agent.userId, dto);

    return {
      success: true,
      ...result,
      timestamp: new Date(),
    };
  }

  // ==================== PULL SYNC (Get data from backend) ====================

  @Get('pull/contacts')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiOperation({ summary: 'Pull contacts from backend to desktop agent' })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  async pullContacts(
    @Headers('x-agent-key') apiKey: string,
    @Query('zaloAccountId') zaloAccountId?: number,
  ) {
    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid API key');
    }

    const contacts = await this.syncService.getContactsForAgent(agent.userId, zaloAccountId);

    return {
      success: true,
      data: contacts,
      total: contacts.length,
      timestamp: new Date(),
    };
  }

  @Get('pull/groups')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiOperation({ summary: 'Pull groups and members from backend to desktop agent' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  async pullGroups(
    @Headers('x-agent-key') apiKey: string,
    @Query('zaloAccountId') zaloAccountId?: number,
  ) {
    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid API key');
    }

    const groups = await this.syncService.getGroupsForAgent(agent.userId, zaloAccountId);

    return {
      success: true,
      data: groups,
      total: groups.length,
      timestamp: new Date(),
    };
  }

  @Get('pull/messages')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiQuery({ name: 'zaloAccountId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiOperation({ summary: 'Pull message history from backend to desktop agent' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async pullMessages(
    @Headers('x-agent-key') apiKey: string,
    @Query('zaloAccountId') zaloAccountId?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid API key');
    }

    const result = await this.syncService.getMessagesForAgent(
      agent.userId,
      zaloAccountId,
      limit || 1000,
      offset || 0,
    );

    return {
      success: true,
      data: result.messages,
      total: result.total,
      timestamp: new Date(),
    };
  }

  @Get('pull/templates')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiOperation({ summary: 'Pull message templates from backend to desktop agent' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async pullTemplates(
    @Headers('x-agent-key') apiKey: string,
  ) {
    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      throw new UnauthorizedException('Invalid API key');
    }

    const templates = await this.syncService.getTemplatesForAgent(agent.userId);

    return {
      success: true,
      data: templates,
      total: templates.length,
      timestamp: new Date(),
    };
  }
}
