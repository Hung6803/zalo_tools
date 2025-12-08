import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ZaloContactGroup } from '../../database/entities/zalo-contact-group.entity';
import { ZaloContact } from '../../database/entities/zalo-contact.entity';
import { CreateContactGroupDto } from './dto/create-contact-group.dto';
import { UpdateContactGroupDto } from './dto/update-contact-group.dto';

@Injectable()
export class ContactGroupsService {
  constructor(
    @InjectRepository(ZaloContactGroup)
    private contactGroupRepository: Repository<ZaloContactGroup>,
    @InjectRepository(ZaloContact)
    private contactRepository: Repository<ZaloContact>,
  ) {}

  /**
   * Create a new contact group
   */
  async create(zaloAccountId: number, createDto: CreateContactGroupDto): Promise<ZaloContactGroup> {
    const group = this.contactGroupRepository.create({
      zaloAccountId,
      name: createDto.name,
      description: createDto.description,
    });

    const savedGroup = await this.contactGroupRepository.save(group);

    // Add contacts if provided
    if (createDto.contactIds && createDto.contactIds.length > 0) {
      await this.addContacts(savedGroup.id, zaloAccountId, createDto.contactIds);
    }

    return this.findOne(savedGroup.id, zaloAccountId);
  }

  /**
   * Find all contact groups for a Zalo account
   */
  async findAll(
    zaloAccountId: number,
    filters?: {
      search?: string;
    },
  ): Promise<ZaloContactGroup[]> {
    const query = this.contactGroupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.contacts', 'contacts')
      .where('group.zaloAccountId = :zaloAccountId', { zaloAccountId });

    if (filters?.search) {
      query.andWhere(
        '(group.name ILIKE :search OR group.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.orderBy('group.createdAt', 'DESC').getMany();
  }

  /**
   * Find one contact group by ID
   */
  async findOne(id: number, zaloAccountId: number): Promise<ZaloContactGroup> {
    const group = await this.contactGroupRepository.findOne({
      where: { id, zaloAccountId },
      relations: ['contacts'],
    });

    if (!group) {
      throw new NotFoundException('Contact group not found');
    }

    return group;
  }

  /**
   * Update a contact group
   */
  async update(
    id: number,
    zaloAccountId: number,
    updateDto: UpdateContactGroupDto,
  ): Promise<ZaloContactGroup> {
    const group = await this.findOne(id, zaloAccountId);

    Object.assign(group, updateDto);

    await this.contactGroupRepository.save(group);

    return this.findOne(id, zaloAccountId);
  }

  /**
   * Delete a contact group
   */
  async remove(id: number, zaloAccountId: number): Promise<void> {
    const group = await this.findOne(id, zaloAccountId);
    await this.contactGroupRepository.remove(group);
  }

  /**
   * Get contact group statistics
   */
  async getStats(zaloAccountId: number): Promise<{
    total: number;
    totalContacts: number;
    avgContactsPerGroup: number;
  }> {
    const groups = await this.contactGroupRepository.find({
      where: { zaloAccountId },
      relations: ['contacts'],
    });

    const total = groups.length;
    const totalContacts = groups.reduce((sum, g) => sum + (g.contacts?.length || 0), 0);
    const avgContactsPerGroup = total > 0 ? Math.round(totalContacts / total) : 0;

    return {
      total,
      totalContacts,
      avgContactsPerGroup,
    };
  }

  /**
   * Add contacts to a group
   */
  async addContacts(
    groupId: number,
    zaloAccountId: number,
    contactIds: number[],
  ): Promise<ZaloContactGroup> {
    const group = await this.findOne(groupId, zaloAccountId);

    // Get contacts
    const contacts = await this.contactRepository.find({
      where: {
        id: In(contactIds),
        zaloAccountId,
      },
    });

    if (!group.contacts) {
      group.contacts = [];
    }

    // Add new contacts (avoid duplicates)
    const existingContactIds = new Set(group.contacts.map(c => c.id));
    const newContacts = contacts.filter(c => !existingContactIds.has(c.id));

    group.contacts.push(...newContacts);

    await this.contactGroupRepository.save(group);

    return this.findOne(groupId, zaloAccountId);
  }

  /**
   * Remove contacts from a group
   */
  async removeContacts(
    groupId: number,
    zaloAccountId: number,
    contactIds: number[],
  ): Promise<ZaloContactGroup> {
    const group = await this.findOne(groupId, zaloAccountId);

    if (!group.contacts) {
      group.contacts = [];
    }

    // Filter out the contacts to remove
    group.contacts = group.contacts.filter(c => !contactIds.includes(c.id));

    await this.contactGroupRepository.save(group);

    return this.findOne(groupId, zaloAccountId);
  }

  /**
   * Get contacts in a group
   */
  async getContacts(groupId: number, zaloAccountId: number): Promise<ZaloContact[]> {
    const group = await this.findOne(groupId, zaloAccountId);
    return group.contacts || [];
  }

  /**
   * Bulk delete contact groups
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
          errors.push(`Contact group ${id} not found`);
        } else {
          errors.push(`Contact group ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }
}
