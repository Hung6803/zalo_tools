import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZaloAccount, ZaloAccountStatus } from '../../database/entities/zalo-account.entity';
import { CreateZaloAccountDto } from './dto/create-zalo-account.dto';
import { UpdateZaloAccountDto } from './dto/update-zalo-account.dto';

@Injectable()
export class ZaloAccountsService {
  constructor(
    @InjectRepository(ZaloAccount)
    private zaloAccountRepository: Repository<ZaloAccount>,
  ) {}

  /**
   * Create a new Zalo account
   */
  async create(
    userId: number,
    createDto: CreateZaloAccountDto,
  ): Promise<ZaloAccount> {
    // Check if phone number already exists
    const existingAccount = await this.zaloAccountRepository.findOne({
      where: { phoneNumber: createDto.phoneNumber },
    });

    if (existingAccount) {
      throw new ConflictException('Phone number already exists');
    }

    const account = this.zaloAccountRepository.create({
      userId,
      phoneNumber: createDto.phoneNumber,
      displayName: createDto.displayName,
      status: ZaloAccountStatus.INACTIVE,
    });

    try {
      return await this.zaloAccountRepository.save(account);
    } catch (error) {
      // Handle any database errors
      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        throw new ConflictException('Phone number already exists');
      }
      throw error;
    }
  }

  /**
   * Get all Zalo accounts for a user
   */
  async findAll(userId: number): Promise<ZaloAccount[]> {
    return this.zaloAccountRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single Zalo account by ID
   */
  async findOne(id: number, userId: number): Promise<ZaloAccount> {
    const account = await this.zaloAccountRepository.findOne({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Zalo account with ID ${id} not found`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this account',
      );
    }

    return account;
  }

  /**
   * Update a Zalo account
   */
  async update(
    id: number,
    userId: number,
    updateDto: UpdateZaloAccountDto,
  ): Promise<ZaloAccount> {
    const account = await this.findOne(id, userId);

    if (updateDto.phoneNumber) account.phoneNumber = updateDto.phoneNumber;
    if (updateDto.displayName) account.displayName = updateDto.displayName;

    return this.zaloAccountRepository.save(account);
  }

  /**
   * Delete a Zalo account
   */
  async remove(id: number, userId: number): Promise<void> {
    const account = await this.findOne(id, userId);
    await this.zaloAccountRepository.remove(account);
  }

  /**
   * Get account statistics
   */
  async getStats(userId: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    banned: number;
  }> {
    const accounts = await this.findAll(userId);

    return {
      total: accounts.length,
      active: accounts.filter((a) => a.status === ZaloAccountStatus.ACTIVE).length,
      inactive: accounts.filter((a) => a.status === ZaloAccountStatus.INACTIVE).length,
      banned: accounts.filter((a) => a.status === ZaloAccountStatus.BANNED).length,
    };
  }
}
