import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { RegisterAgentDto, HeartbeatDto } from './dto/register-agent.dto';
import * as crypto from 'crypto';

@Injectable()
export class AgentsService {
  private readonly logger = new (require('@nestjs/common').Logger)(AgentsService.name);

  constructor(
    @InjectRepository(Agent)
    private agentsRepository: Repository<Agent>,
  ) {}

  /**
   * Register new agent for a user
   */
  async register(userId: number, dto: RegisterAgentDto): Promise<Agent> {
    const apiKey = this.generateApiKey();
    this.logger.log(`Registering new agent for userId=${userId}, computerName=${dto.computerName}`);
    this.logger.debug(`Generated API key: ${apiKey.substring(0, 10)}...`);

    const agent = this.agentsRepository.create({
      userId,
      computerName: dto.computerName,
      ipAddress: dto.ipAddress,
      apiKey,
      status: 'offline',
    });

    const saved = await this.agentsRepository.save(agent);
    this.logger.log(`Agent registered successfully: id=${saved.id}`);
    return saved;
  }

  /**
   * Find agent by API key
   */
  async findByApiKey(apiKey: string): Promise<Agent | null> {
    this.logger.debug(`Looking for agent with API key: ${apiKey?.substring(0, 10)}...`);
    const agent = await this.agentsRepository.findOne({
      where: { apiKey },
      relations: ['user'],
    });
    this.logger.debug(`Agent found: ${agent ? `id=${agent.id}, userId=${agent.userId}` : 'null'}`);
    return agent;
  }

  /**
   * Find agent by ID
   */
  async findById(agentId: string): Promise<Agent | null> {
    return await this.agentsRepository.findOne({
      where: { id: agentId },
      relations: ['user'],
    });
  }

  /**
   * Find all agents for a user
   */
  async findByUserId(userId: number): Promise<Agent[]> {
    return await this.agentsRepository.find({
      where: { userId },
      order: { lastHeartbeat: 'DESC' },
    });
  }

  /**
   * Update heartbeat for agent
   */
  async updateHeartbeat(agentId: string, dto: HeartbeatDto): Promise<Agent> {
    const agent = await this.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }

    agent.lastHeartbeat = new Date();
    agent.status = dto.status || 'online';

    if (dto.zaloAccountIds) {
      agent.zaloAccountIds = dto.zaloAccountIds;
    }

    return await this.agentsRepository.save(agent);
  }

  /**
   * Delete agent
   */
  async remove(agentId: string): Promise<void> {
    await this.agentsRepository.delete(agentId);
  }

  /**
   * Generate secure API key
   */
  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if agent is online (heartbeat within last 2 minutes)
   */
  isOnline(agent: Agent): boolean {
    if (!agent.lastHeartbeat) return false;
    const now = new Date();
    const diff = now.getTime() - agent.lastHeartbeat.getTime();
    return diff < 2 * 60 * 1000; // 2 minutes
  }
}
