import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloConversation, ConversationType } from '../../database/entities/zalo-conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ZaloConversation)
    private conversationRepository: Repository<ZaloConversation>,
  ) {}

  /**
   * Create a new conversation
   */
  async create(createDto: CreateConversationDto): Promise<ZaloConversation> {
    const conversation = this.conversationRepository.create({
      ...createDto,
      unreadCount: 0,
    });

    return this.conversationRepository.save(conversation);
  }

  /**
   * Find all conversations for a Zalo account
   */
  async findAll(
    zaloAccountId: number,
    filters?: {
      type?: ConversationType;
      hasUnread?: boolean;
    },
  ): Promise<ZaloConversation[]> {
    const query = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('conversation.zaloAccountId = :zaloAccountId', { zaloAccountId });

    if (filters?.type) {
      query.andWhere('conversation.conversationType = :type', {
        type: filters.type,
      });
    }

    if (filters?.hasUnread !== undefined) {
      if (filters.hasUnread) {
        query.andWhere('conversation.unreadCount > 0');
      } else {
        query.andWhere('conversation.unreadCount = 0');
      }
    }

    return query.orderBy('conversation.lastMessageAt', 'DESC').getMany();
  }

  /**
   * Find one conversation by ID
   */
  async findOne(id: number, zaloAccountId: number): Promise<ZaloConversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, zaloAccountId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Find conversation by Zalo conversation ID
   */
  async findByConversationId(
    conversationId: string,
    zaloAccountId: number,
  ): Promise<ZaloConversation | null> {
    return this.conversationRepository.findOne({
      where: { conversationId, zaloAccountId },
    });
  }

  /**
   * Update a conversation
   */
  async update(
    id: number,
    zaloAccountId: number,
    updateDto: UpdateConversationDto,
  ): Promise<ZaloConversation> {
    const conversation = await this.findOne(id, zaloAccountId);

    Object.assign(conversation, updateDto);

    return this.conversationRepository.save(conversation);
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(id: number, zaloAccountId: number): Promise<ZaloConversation> {
    const conversation = await this.findOne(id, zaloAccountId);

    conversation.unreadCount = 0;

    return this.conversationRepository.save(conversation);
  }

  /**
   * Mark conversation as unread
   */
  async markAsUnread(id: number, zaloAccountId: number): Promise<ZaloConversation> {
    const conversation = await this.findOne(id, zaloAccountId);

    conversation.unreadCount = conversation.unreadCount || 1;

    return this.conversationRepository.save(conversation);
  }

  /**
   * Increment unread count
   */
  async incrementUnread(id: number): Promise<void> {
    await this.conversationRepository.increment({ id }, 'unreadCount', 1);
  }

  /**
   * Update last message time
   */
  async updateLastMessageTime(id: number): Promise<void> {
    await this.conversationRepository.update(id, {
      lastMessageAt: new Date(),
    });
  }

  /**
   * Delete a conversation
   */
  async remove(id: number, zaloAccountId: number): Promise<void> {
    const conversation = await this.findOne(id, zaloAccountId);
    await this.conversationRepository.remove(conversation);
  }

  /**
   * Get conversation statistics
   */
  async getStats(zaloAccountId: number): Promise<{
    total: number;
    byType: Record<string, number>;
    totalUnread: number;
    withUnread: number;
  }> {
    const conversations = await this.conversationRepository.find({
      where: { zaloAccountId },
    });

    const total = conversations.length;

    const byType = conversations.reduce((acc, conv) => {
      acc[conv.conversationType] = (acc[conv.conversationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalUnread = conversations.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0,
    );
    const withUnread = conversations.filter((conv) => conv.unreadCount > 0).length;

    return { total, byType, totalUnread, withUnread };
  }

  /**
   * Bulk delete conversations
   */
  async bulkDelete(
    ids: number[],
    zaloAccountId: number,
  ): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.remove(id, zaloAccountId);
        deleted++;
      } catch (error) {
        if (error instanceof NotFoundException) {
          errors.push(`Conversation ${id} not found`);
        } else {
          errors.push(`Conversation ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }
}
