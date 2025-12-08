import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloMessage } from '../../database/entities/zalo-message.entity';
import { ZaloContact } from '../../database/entities/zalo-contact.entity';
import { ZaloGroup } from '../../database/entities/zalo-group.entity';
import { ZaloGroupMember } from '../../database/entities/zalo-group-member.entity';
import { ZaloConversation } from '../../database/entities/zalo-conversation.entity';
import { ZaloMessageTemplate } from '../../database/entities/zalo-template.entity';
import { ZaloAccount } from '../../database/entities/zalo-account.entity';
import { SyncMessagesDto, SyncContactsDto, SyncGroupMembersDto } from './dto/sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(ZaloMessage)
    private messagesRepository: Repository<ZaloMessage>,
    @InjectRepository(ZaloContact)
    private contactsRepository: Repository<ZaloContact>,
    @InjectRepository(ZaloGroup)
    private groupsRepository: Repository<ZaloGroup>,
    @InjectRepository(ZaloGroupMember)
    private groupMembersRepository: Repository<ZaloGroupMember>,
    @InjectRepository(ZaloConversation)
    private conversationsRepository: Repository<ZaloConversation>,
    @InjectRepository(ZaloMessageTemplate)
    private templatesRepository: Repository<ZaloMessageTemplate>,
    @InjectRepository(ZaloAccount)
    private accountsRepository: Repository<ZaloAccount>,
  ) {}

  async syncMessages(userId: number, dto: SyncMessagesDto) {
    const syncedCount: number[] = [];

    for (const msg of dto.messages) {
      try {
        const existing = await this.messagesRepository.findOne({
          where: { zaloMessageId: msg.messageId },
        });

        if (existing) {
          this.logger.debug(`Message ${msg.messageId} already exists, skipping`);
          continue;
        }

        // Generate unique conversation ID
        const conversationIdStr = `${msg.accountId}_${msg.userId}`;

        let conversation = await this.conversationsRepository.findOne({
          where: {
            conversationId: conversationIdStr,
          },
        });

        if (!conversation) {
          conversation = this.conversationsRepository.create({
            zaloAccountId: msg.accountId,
            conversationId: conversationIdStr,
            conversationType: 'personal' as any,
            participantIds: [msg.userId],
            lastMessageAt: new Date(msg.sentAt),
            unreadCount: 0,
          });
          await this.conversationsRepository.save(conversation);
        }

        const message = this.messagesRepository.create({
          conversationId: conversation.id,
          zaloMessageId: msg.messageId,
          senderZaloId: '',
          messageType: 'text' as any,
          content: msg.message,
          status: msg.status as any,
          sentAt: new Date(msg.sentAt),
        });

        await this.messagesRepository.save(message);
        syncedCount.push(1);
      } catch (error) {
        this.logger.error(`Failed to sync message ${msg.messageId}: ${error.message}`);
      }
    }

    return {
      synced: syncedCount.length,
      skipped: dto.messages.length - syncedCount.length,
    };
  }

  async syncContacts(userId: number, dto: SyncContactsDto) {
    const syncedCount: number[] = [];

    for (const contactData of dto.contacts) {
      try {
        const contact = await this.contactsRepository.findOne({
          where: {
            zaloAccountId: contactData.accountId,
            zaloId: contactData.userId,
          },
        });

        if (contact) {
          contact.displayName = contactData.displayName;
          contact.phoneNumber = contactData.phoneNumber || '';
          contact.avatarUrl = contactData.avatar || '';
          await this.contactsRepository.save(contact);
        } else {
          const newContact = this.contactsRepository.create({
            zaloAccountId: contactData.accountId,
            zaloId: contactData.userId,
            displayName: contactData.displayName,
            phoneNumber: contactData.phoneNumber || '',
            avatarUrl: contactData.avatar || '',
          });
          await this.contactsRepository.save(newContact);
        }

        syncedCount.push(1);
      } catch (error) {
        this.logger.error(`Failed to sync contact ${contactData.userId}: ${error.message}`);
      }
    }

    return {
      synced: syncedCount.length,
    };
  }

  async syncGroupMembers(userId: number, dto: SyncGroupMembersDto) {
    try {
      let group = await this.groupsRepository.findOne({
        where: {
          zaloAccountId: dto.accountId,
          groupLink: dto.groupId,
        },
      });

      if (group) {
        group.groupName = dto.groupName;
        group.memberCount = dto.members.length;
        group.lastScrapedAt = new Date(dto.scrapedAt);
      } else {
        group = this.groupsRepository.create({
          zaloAccountId: dto.accountId,
          groupId: dto.groupId,
          groupName: dto.groupName,
          groupLink: dto.groupId,
          memberCount: dto.members.length,
          lastScrapedAt: new Date(dto.scrapedAt),
          isJoined: false,
        });
      }

      await this.groupsRepository.save(group);

      await this.groupMembersRepository
        .createQueryBuilder()
        .delete()
        .where('groupId = :groupId', { groupId: group.id })
        .execute();

      const members = dto.members.map(member =>
        this.groupMembersRepository.create({
          groupId: group.id,
          zaloId: member.userId,
          displayName: member.displayName,
          avatarUrl: member.avatar || '',
          role: (member.role as any) || 'member',
        }),
      );

      await this.groupMembersRepository.save(members);

      return {
        synced: members.length,
        groupId: dto.groupId,
      };
    } catch (error) {
      this.logger.error(`Failed to sync group ${dto.groupId}: ${error.message}`);
      throw error;
    }
  }

  // ==================== PULL SYNC METHODS ====================

  /**
   * Get contacts for agent to pull to desktop
   */
  async getContactsForAgent(userId: number, zaloAccountId?: number) {
    const whereCondition: any = {};

    if (zaloAccountId) {
      whereCondition.zaloAccountId = zaloAccountId;
    } else {
      // Get all zalo accounts for this user
      const accounts = await this.accountsRepository.find({
        where: { userId },
      });
      if (accounts.length > 0) {
        whereCondition.zaloAccountId = accounts.map(a => a.id);
      }
    }

    const contacts = await this.contactsRepository.find({
      where: whereCondition,
      order: { updatedAt: 'DESC' },
    });

    return contacts.map(c => ({
      id: c.id,
      zaloAccountId: c.zaloAccountId,
      zaloId: c.zaloId,
      displayName: c.displayName,
      phoneNumber: c.phoneNumber,
      avatar: c.avatarUrl,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Get groups and members for agent to pull to desktop
   */
  async getGroupsForAgent(userId: number, zaloAccountId?: number) {
    const whereCondition: any = {};

    if (zaloAccountId) {
      whereCondition.zaloAccountId = zaloAccountId;
    } else {
      const accounts = await this.accountsRepository.find({
        where: { userId },
      });
      if (accounts.length > 0) {
        whereCondition.zaloAccountId = accounts.map(a => a.id);
      }
    }

    const groups = await this.groupsRepository.find({
      where: whereCondition,
      order: { lastScrapedAt: 'DESC' },
    });

    // Get members for each group
    const groupsWithMembers = await Promise.all(
      groups.map(async group => {
        const members = await this.groupMembersRepository.find({
          where: { groupId: group.id },
        });

        return {
          id: group.id,
          zaloAccountId: group.zaloAccountId,
          groupId: group.groupId,
          groupName: group.groupName,
          groupLink: group.groupLink,
          memberCount: group.memberCount,
          isJoined: group.isJoined,
          lastScrapedAt: group.lastScrapedAt,
          members: members.map(m => ({
            id: m.id,
            zaloId: m.zaloId,
            displayName: m.displayName,
            avatar: m.avatarUrl,
            role: m.role,
          })),
        };
      }),
    );

    return groupsWithMembers;
  }

  /**
   * Get messages for agent to pull to desktop
   */
  async getMessagesForAgent(
    userId: number,
    zaloAccountId?: number,
    limit: number = 1000,
    offset: number = 0,
  ) {
    // First get conversations for the user's zalo accounts
    const accountCondition: any = {};
    if (zaloAccountId) {
      accountCondition.zaloAccountId = zaloAccountId;
    } else {
      const accounts = await this.accountsRepository.find({
        where: { userId },
      });
      if (accounts.length > 0) {
        accountCondition.zaloAccountId = accounts.map(a => a.id);
      }
    }

    const conversations = await this.conversationsRepository.find({
      where: accountCondition,
    });

    if (conversations.length === 0) {
      return { messages: [], total: 0 };
    }

    const conversationIds = conversations.map(c => c.id);

    // Get messages with pagination
    const [messages, total] = await this.messagesRepository.findAndCount({
      where: { conversationId: conversationIds as any },
      order: { sentAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      messages: messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        zaloMessageId: m.zaloMessageId,
        senderZaloId: m.senderZaloId,
        messageType: m.messageType,
        content: m.content,
        status: m.status,
        sentAt: m.sentAt,
        createdAt: m.createdAt,
      })),
      total,
    };
  }

  /**
   * Get message templates for agent to pull to desktop
   */
  async getTemplatesForAgent(userId: number) {
    // Get all zalo accounts for this user
    const accounts = await this.accountsRepository.find({
      where: { userId },
    });

    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map(a => a.id);

    const templates = await this.templatesRepository.find({
      where: { zaloAccountId: accountIds as any },
      order: { updatedAt: 'DESC' },
    });

    return templates.map(t => ({
      id: t.id,
      zaloAccountId: t.zaloAccountId,
      name: t.name,
      content: t.content,
      variables: t.variables,
      category: t.category,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }
}
