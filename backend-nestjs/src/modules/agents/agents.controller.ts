import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { RegisterAgentDto, HeartbeatDto } from './dto/register-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  private readonly logger = new (require('@nestjs/common').Logger)(AgentsController.name);

  constructor(private readonly agentsService: AgentsService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new desktop agent' })
  @ApiResponse({ status: 201, description: 'Agent registered successfully' })
  async register(@Request() req, @Body() dto: RegisterAgentDto) {
    this.logger.log(`Register agent request from userId: ${req.user.id}, computerName: ${dto.computerName}`);

    const agent = await this.agentsService.register(req.user.id, dto);

    this.logger.log(`Agent registered: id=${agent.id}, apiKey=${agent.apiKey.substring(0, 10)}...`);

    return {
      agentId: agent.id,
      apiKey: agent.apiKey,
      message: 'Agent registered. Save the API key securely - it will not be shown again.',
    };
  }

  @Post('heartbeat')
  @ApiHeader({ name: 'X-Agent-Key', required: true })
  @ApiOperation({ summary: 'Send heartbeat from desktop agent' })
  @ApiResponse({ status: 200, description: 'Heartbeat received' })
  async heartbeat(
    @Headers('x-agent-key') apiKey: string,
    @Body() dto: HeartbeatDto,
  ) {
    this.logger.debug(`Heartbeat received with API key: ${apiKey?.substring(0, 10)}...`);

    const agent = await this.agentsService.findByApiKey(apiKey);
    if (!agent) {
      this.logger.warn(`Invalid API key attempted: ${apiKey?.substring(0, 10)}...`);
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.debug(`Heartbeat from agent: ${agent.id} (user: ${agent.userId})`);
    await this.agentsService.updateHeartbeat(agent.id, dto);

    return {
      success: true,
      message: 'Heartbeat received',
      timestamp: new Date(),
    };
  }

  @Get('my-agents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all agents for current user' })
  @ApiResponse({ status: 200, description: 'Agents retrieved successfully' })
  async getMyAgents(@Request() req) {
    const agents = await this.agentsService.findByUserId(req.user.id);

    return agents.map(agent => ({
      id: agent.id,
      computerName: agent.computerName,
      ipAddress: agent.ipAddress,
      status: agent.status,
      isOnline: this.agentsService.isOnline(agent),
      zaloAccountIds: agent.zaloAccountIds,
      lastHeartbeat: agent.lastHeartbeat,
      createdAt: agent.createdAt,
    }));
  }

  @Delete(':agentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  async remove(@Param('agentId') agentId: string, @Request() req) {
    const agent = await this.agentsService.findById(agentId);
    if (!agent || agent.userId !== req.user.id) {
      throw new UnauthorizedException('Not authorized to delete this agent');
    }

    await this.agentsService.remove(agentId);
    return { message: 'Agent deleted successfully' };
  }
}
