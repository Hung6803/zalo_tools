import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloMessage, MessageStatus } from '../../database/entities/zalo-message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(ZaloMessage)
    private messageRepository: Repository<ZaloMessage>,
  ) {}

  /**
   * Create a new message
   */
  async create(createDto: CreateMessageDto): Promise<ZaloMessage> {
    const message = this.messageRepository.create({
      ...createDto,
      status: MessageStatus.SENT,
      sentAt: new Date(),
    });

    return this.messageRepository.save(message);
  }

  /**
   * Find all messages with filters
   */
  async findAll(filters?: {
    conversationId?: number;
    search?: string;
    status?: MessageStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ messages: ZaloMessage[]; total: number }> {
    const query = this.messageRepository.createQueryBuilder('message');

    if (filters?.conversationId) {
      query.andWhere('message.conversationId = :conversationId', {
        conversationId: filters.conversationId,
      });
    }

    if (filters?.search) {
      query.andWhere('message.content ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.status) {
      query.andWhere('message.status = :status', { status: filters.status });
    }

    const total = await query.getCount();

    if (filters?.limit) {
      query.take(filters.limit);
    }

    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const messages = await query
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    return { messages, total };
  }

  /**
   * Find messages by conversation ID
   */
  async findByConversation(
    conversationId: number,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{ messages: ZaloMessage[]; total: number }> {
    return this.findAll({
      conversationId,
      ...options,
    });
  }

  /**
   * Find one message by ID
   */
  async findOne(id: number): Promise<ZaloMessage> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['conversation'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  /**
   * Find message by Zalo message ID
   */
  async findByZaloMessageId(zaloMessageId: string): Promise<ZaloMessage | null> {
    return this.messageRepository.findOne({
      where: { zaloMessageId },
    });
  }

  /**
   * Update a message
   */
  async update(id: number, updateDto: UpdateMessageDto): Promise<ZaloMessage> {
    const message = await this.findOne(id);

    Object.assign(message, updateDto);

    return this.messageRepository.save(message);
  }

  /**
   * Update message status
   */
  async updateStatus(id: number, status: MessageStatus): Promise<ZaloMessage> {
    const message = await this.findOne(id);

    message.status = status;

    return this.messageRepository.save(message);
  }

  /**
   * Delete a message
   */
  async remove(id: number): Promise<void> {
    const message = await this.findOne(id);
    await this.messageRepository.remove(message);
  }

  /**
   * Get message statistics
   */
  async getStats(filters?: {
    conversationId?: number;
  }): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const query = this.messageRepository.createQueryBuilder('message');

    if (filters?.conversationId) {
      query.where('message.conversationId = :conversationId', {
        conversationId: filters.conversationId,
      });
    }

    const messages = await query.getMany();

    const total = messages.length;

    const byType = messages.reduce((acc, msg) => {
      acc[msg.messageType] = (acc[msg.messageType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = messages.reduce((acc, msg) => {
      acc[msg.status] = (acc[msg.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, byType, byStatus };
  }

  /**
   * Search messages
   */
  async search(
    searchTerm: string,
    options?: {
      conversationId?: number;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ messages: ZaloMessage[]; total: number }> {
    return this.findAll({
      search: searchTerm,
      ...options,
    });
  }

  /**
   * Bulk delete messages
   */
  async bulkDelete(ids: number[]): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.remove(id);
        deleted++;
      } catch (error) {
        if (error instanceof NotFoundException) {
          errors.push(`Message ${id} not found`);
        } else {
          errors.push(`Message ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }
}
