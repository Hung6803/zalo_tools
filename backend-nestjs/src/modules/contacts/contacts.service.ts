import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloContact } from '../../database/entities/zalo-contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ZaloContact)
    private contactsRepository: Repository<ZaloContact>,
  ) {}

  /**
   * Create a new contact
   */
  async create(zaloAccountId: number, createDto: CreateContactDto): Promise<ZaloContact> {
    // Check if contact already exists
    const existing = await this.contactsRepository.findOne({
      where: {
        zaloAccountId,
        zaloId: createDto.zaloId,
      },
    });

    if (existing) {
      throw new ConflictException('Contact with this Zalo ID already exists');
    }

    const contact = this.contactsRepository.create({
      zaloAccountId,
      ...createDto,
    });

    return this.contactsRepository.save(contact);
  }

  /**
   * Find all contacts for a Zalo account
   */
  async findAll(
    zaloAccountId: number,
    filters?: {
      search?: string;
    },
  ): Promise<ZaloContact[]> {
    const query = this.contactsRepository
      .createQueryBuilder('contact')
      .where('contact.zaloAccountId = :zaloAccountId', { zaloAccountId });

    if (filters?.search) {
      query.andWhere(
        '(contact.displayName ILIKE :search OR contact.phoneNumber ILIKE :search OR contact.zaloId ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.orderBy('contact.createdAt', 'DESC').getMany();
  }

  /**
   * Find one contact by ID
   */
  async findOne(id: number, zaloAccountId: number): Promise<ZaloContact> {
    const contact = await this.contactsRepository.findOne({
      where: { id, zaloAccountId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  /**
   * Update a contact
   */
  async update(
    id: number,
    zaloAccountId: number,
    updateDto: UpdateContactDto,
  ): Promise<ZaloContact> {
    const contact = await this.findOne(id, zaloAccountId);

    Object.assign(contact, updateDto);

    return this.contactsRepository.save(contact);
  }

  /**
   * Delete a contact
   */
  async remove(id: number, zaloAccountId: number): Promise<void> {
    const contact = await this.findOne(id, zaloAccountId);
    await this.contactsRepository.remove(contact);
  }

  /**
   * Get statistics
   */
  async getStats(zaloAccountId: number): Promise<{
    total: number;
    withPhone: number;
    withoutPhone: number;
  }> {
    const contacts = await this.contactsRepository.find({
      where: { zaloAccountId },
    });

    const total = contacts.length;
    const withPhone = contacts.filter(c => c.phoneNumber).length;
    const withoutPhone = total - withPhone;

    return {
      total,
      withPhone,
      withoutPhone,
    };
  }

  /**
   * Bulk delete contacts
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
          errors.push(`Contact ${id} not found`);
        } else {
          errors.push(`Contact ${id}: ${error.message}`);
        }
      }
    }

    return { deleted, errors };
  }
}
