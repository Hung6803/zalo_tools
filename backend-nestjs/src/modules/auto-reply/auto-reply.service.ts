import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloAutoReplyRule } from '../../database/entities/zalo-auto-reply.entity';
import { CreateAutoReplyDto, MatchType } from './dto/create-auto-reply.dto';
import { UpdateAutoReplyDto } from './dto/update-auto-reply.dto';
import { TestAutoReplyDto, TestAutoReplyResponseDto } from './dto/test-auto-reply.dto';

@Injectable()
export class AutoReplyService {
  constructor(
    @InjectRepository(ZaloAutoReplyRule)
    private autoReplyRepository: Repository<ZaloAutoReplyRule>,
  ) {}

  /**
   * Check if message matches keyword based on match type
   */
  private matchKeyword(message: string, keyword: string, matchType: MatchType): boolean {
    const messageLower = message.toLowerCase().trim();
    const keywordLower = keyword.toLowerCase().trim();

    switch (matchType) {
      case MatchType.EXACT:
        return messageLower === keywordLower;

      case MatchType.CONTAINS:
        return messageLower.includes(keywordLower);

      case MatchType.STARTS_WITH:
        return messageLower.startsWith(keywordLower);

      case MatchType.REGEX:
        try {
          const regex = new RegExp(keyword, 'i');
          return regex.test(message);
        } catch (error) {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Find first matching auto-reply rule for a message
   * Rules are checked in priority order (higher priority first)
   */
  async findMatchingRule(
    message: string,
    zaloAccountId: number,
  ): Promise<ZaloAutoReplyRule | null> {
    const rules = await this.autoReplyRepository.find({
      where: {
        zaloAccountId,
        isActive: true,
      },
      order: {
        priority: 'DESC',
      },
    });

    for (const rule of rules) {
      for (const keyword of rule.keywords || []) {
        if (this.matchKeyword(message, keyword, rule.matchType as MatchType)) {
          return rule;
        }
      }
    }

    return null;
  }

  /**
   * Create a new auto-reply rule
   */
  async create(zaloAccountId: number, createDto: CreateAutoReplyDto): Promise<ZaloAutoReplyRule> {
    const rule = this.autoReplyRepository.create({
      zaloAccountId,
      name: createDto.name,
      keywords: createDto.keywords,
      responseContent: createDto.replyContent,
      matchType: createDto.matchType,
      isActive: createDto.isActive ?? true,
      priority: createDto.priority ?? 0,
      triggerCount: 0,
    });

    return this.autoReplyRepository.save(rule);
  }

  /**
   * Find all auto-reply rules for a Zalo account
   */
  async findAll(
    zaloAccountId: number,
    filters?: {
      isActive?: boolean;
    },
  ): Promise<ZaloAutoReplyRule[]> {
    const query = this.autoReplyRepository
      .createQueryBuilder('rule')
      .where('rule.zaloAccountId = :zaloAccountId', { zaloAccountId });

    if (filters?.isActive !== undefined) {
      query.andWhere('rule.isActive = :isActive', { isActive: filters.isActive });
    }

    return query.orderBy('rule.priority', 'DESC').addOrderBy('rule.createdAt', 'DESC').getMany();
  }

  /**
   * Find one auto-reply rule by ID
   */
  async findOne(id: number, zaloAccountId: number): Promise<ZaloAutoReplyRule> {
    const rule = await this.autoReplyRepository.findOne({
      where: { id, zaloAccountId },
    });

    if (!rule) {
      throw new NotFoundException('Auto-reply rule not found');
    }

    return rule;
  }

  /**
   * Update an auto-reply rule
   */
  async update(
    id: number,
    zaloAccountId: number,
    updateDto: UpdateAutoReplyDto,
  ): Promise<ZaloAutoReplyRule> {
    const rule = await this.findOne(id, zaloAccountId);

    // Map DTO fields to entity fields
    if (updateDto.keywords !== undefined) {
      rule.keywords = updateDto.keywords;
    }
    if (updateDto.replyContent !== undefined) {
      rule.responseContent = updateDto.replyContent;
    }
    if (updateDto.name !== undefined) {
      rule.name = updateDto.name;
    }
    if (updateDto.matchType !== undefined) {
      rule.matchType = updateDto.matchType;
    }
    if (updateDto.isActive !== undefined) {
      rule.isActive = updateDto.isActive;
    }
    if (updateDto.priority !== undefined) {
      rule.priority = updateDto.priority;
    }

    return this.autoReplyRepository.save(rule);
  }

  /**
   * Delete an auto-reply rule
   */
  async remove(id: number, zaloAccountId: number): Promise<void> {
    const rule = await this.findOne(id, zaloAccountId);
    await this.autoReplyRepository.remove(rule);
  }

  /**
   * Test which auto-reply rule would be triggered by a message
   */
  async test(
    zaloAccountId: number,
    testDto: TestAutoReplyDto,
  ): Promise<TestAutoReplyResponseDto> {
    const matchedRule = await this.findMatchingRule(testDto.message, zaloAccountId);

    if (matchedRule) {
      return {
        matched: true,
        ruleId: matchedRule.id,
        ruleName: matchedRule.name,
        replyContent: matchedRule.responseContent || '',
      };
    }

    return { matched: false };
  }

  /**
   * Toggle auto-reply rule active status
   */
  async toggle(id: number, zaloAccountId: number): Promise<ZaloAutoReplyRule> {
    const rule = await this.findOne(id, zaloAccountId);
    rule.isActive = !rule.isActive;
    return this.autoReplyRepository.save(rule);
  }

  /**
   * Increment triggered count
   */
  async incrementTriggered(id: number, zaloAccountId: number): Promise<void> {
    const rule = await this.findOne(id, zaloAccountId);
    rule.triggerCount += 1;
    rule.lastTriggeredAt = new Date();
    await this.autoReplyRepository.save(rule);
  }

  /**
   * Get statistics overview
   */
  async getStats(zaloAccountId: number): Promise<{
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    totalTriggered: number;
    mostTriggered: { id: number; name: string; triggerCount: number } | null;
  }> {
    const rules = await this.autoReplyRepository.find({
      where: { zaloAccountId },
    });

    const totalRules = rules.length;
    const activeRules = rules.filter(r => r.isActive).length;
    const inactiveRules = totalRules - activeRules;
    const totalTriggered = rules.reduce((sum, r) => sum + r.triggerCount, 0);

    let mostTriggered: { id: number; name: string; triggerCount: number } | null = null;
    if (rules.length > 0) {
      const mostTriggeredRule = rules.reduce((max, r) =>
        r.triggerCount > max.triggerCount ? r : max,
      );
      if (mostTriggeredRule.triggerCount > 0) {
        mostTriggered = {
          id: mostTriggeredRule.id,
          name: mostTriggeredRule.name,
          triggerCount: mostTriggeredRule.triggerCount,
        };
      }
    }

    return {
      totalRules,
      activeRules,
      inactiveRules,
      totalTriggered,
      mostTriggered,
    };
  }

  /**
   * Bulk activate rules
   */
  async bulkActivate(ids: number[], zaloAccountId: number): Promise<number> {
    const result = await this.autoReplyRepository
      .createQueryBuilder()
      .update(ZaloAutoReplyRule)
      .set({ isActive: true })
      .where('id IN (:...ids)', { ids })
      .andWhere('zaloAccountId = :zaloAccountId', { zaloAccountId })
      .execute();

    return result.affected || 0;
  }

  /**
   * Bulk deactivate rules
   */
  async bulkDeactivate(ids: number[], zaloAccountId: number): Promise<number> {
    const result = await this.autoReplyRepository
      .createQueryBuilder()
      .update(ZaloAutoReplyRule)
      .set({ isActive: false })
      .where('id IN (:...ids)', { ids })
      .andWhere('zaloAccountId = :zaloAccountId', { zaloAccountId })
      .execute();

    return result.affected || 0;
  }

  /**
   * Bulk delete rules
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
          errors.push(`Rule ${id} not found`);
        } else {
          errors.push(`Rule ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }
}
