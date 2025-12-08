import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloGroup } from '../../database/entities/zalo-group.entity';
import { ZaloGroupMember, MemberRole } from '../../database/entities/zalo-group-member.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { ZaloBrowserService } from '../zalo-browser/zalo-browser.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(ZaloGroup)
    private groupRepository: Repository<ZaloGroup>,
    @InjectRepository(ZaloGroupMember)
    private groupMemberRepository: Repository<ZaloGroupMember>,
    private zaloBrowserService: ZaloBrowserService,
  ) {}

  /**
   * Create a new group
   */
  async create(zaloAccountId: number, createDto: CreateGroupDto): Promise<ZaloGroup> {
    const group = this.groupRepository.create({
      zaloAccountId,
      ...createDto,
    });

    return this.groupRepository.save(group);
  }

  /**
   * Find all groups for a Zalo account
   */
  async findAll(
    zaloAccountId: number,
    filters?: {
      search?: string;
      isJoined?: boolean;
    },
  ): Promise<ZaloGroup[]> {
    const query = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'members')
      .where('group.zaloAccountId = :zaloAccountId', { zaloAccountId });

    if (filters?.search) {
      query.andWhere(
        '(group.groupName ILIKE :search OR group.groupLink ILIKE :search OR group.groupId ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.isJoined !== undefined) {
      query.andWhere('group.isJoined = :isJoined', { isJoined: filters.isJoined });
    }

    return query.orderBy('group.createdAt', 'DESC').getMany();
  }

  /**
   * Find one group by ID
   */
  async findOne(id: number, zaloAccountId: number): Promise<ZaloGroup> {
    const group = await this.groupRepository.findOne({
      where: { id, zaloAccountId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  /**
   * Update a group
   */
  async update(
    id: number,
    zaloAccountId: number,
    updateDto: UpdateGroupDto,
  ): Promise<ZaloGroup> {
    const group = await this.findOne(id, zaloAccountId);

    Object.assign(group, updateDto);

    return this.groupRepository.save(group);
  }

  /**
   * Delete a group
   */
  async remove(id: number, zaloAccountId: number): Promise<void> {
    const group = await this.findOne(id, zaloAccountId);
    await this.groupRepository.remove(group);
  }

  /**
   * Get group statistics
   */
  async getStats(zaloAccountId: number): Promise<{
    total: number;
    joined: number;
    notJoined: number;
    totalMembers: number;
    avgMembersPerGroup: number;
  }> {
    const groups = await this.groupRepository.find({
      where: { zaloAccountId },
    });

    const total = groups.length;
    const joined = groups.filter(g => g.isJoined).length;
    const notJoined = total - joined;
    const totalMembers = groups.reduce((sum, g) => sum + g.memberCount, 0);
    const avgMembersPerGroup = total > 0 ? Math.round(totalMembers / total) : 0;

    return {
      total,
      joined,
      notJoined,
      totalMembers,
      avgMembersPerGroup,
    };
  }

  /**
   * Scrape group members using browser automation
   */
  async scrapeMembers(groupId: number, zaloAccountId: number): Promise<{
    success: boolean;
    membersScraped: number;
    message: string;
  }> {
    const group = await this.findOne(groupId, zaloAccountId);

    // Use ZaloBrowserService to scrape members
    const result = await this.zaloBrowserService.scrapeGroupMembers(
      zaloAccountId,
      group.groupLink,
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        membersScraped: 0,
        message: 'Failed to scrape group members',
      };
    }

    // Save scraped members to database
    const members = result.data.members || [];

    // Delete existing members for this group
    await this.groupMemberRepository.delete({ groupId: group.id });

    // Create new member records
    const memberEntities = members.map(member =>
      this.groupMemberRepository.create({
        groupId: group.id,
        zaloId: member.zaloId,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        role: member.role as MemberRole,
      }),
    );

    await this.groupMemberRepository.save(memberEntities);

    // Update group member count and last scraped time
    group.memberCount = members.length;
    group.lastScrapedAt = new Date();
    group.isJoined = true;
    await this.groupRepository.save(group);

    return {
      success: true,
      membersScraped: members.length,
      message: `Successfully scraped ${members.length} members`,
    };
  }

  /**
   * Get members of a group
   */
  async getMembers(
    groupId: number,
    zaloAccountId: number,
    filters?: {
      search?: string;
    },
  ): Promise<ZaloGroupMember[]> {
    // Verify group belongs to account
    await this.findOne(groupId, zaloAccountId);

    const query = this.groupMemberRepository
      .createQueryBuilder('member')
      .where('member.groupId = :groupId', { groupId });

    if (filters?.search) {
      query.andWhere(
        '(member.displayName ILIKE :search OR member.phoneNumber ILIKE :search OR member.zaloId ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.orderBy('member.scrapedAt', 'DESC').getMany();
  }

  /**
   * Bulk delete groups
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
          errors.push(`Group ${id} not found`);
        } else {
          errors.push(`Group ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }

  /**
   * Count total members across specified groups
   */
  async countMembersInGroups(groupIds: number[]): Promise<number> {
    if (!groupIds || groupIds.length === 0) {
      return 0;
    }

    const result = await this.groupRepository
      .createQueryBuilder('group')
      .select('SUM(group.memberCount)', 'total')
      .where('group.id IN (:...groupIds)', { groupIds })
      .getRawOne();

    return parseInt(result.total) || 0;
  }
}
