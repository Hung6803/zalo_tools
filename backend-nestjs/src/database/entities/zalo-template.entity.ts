import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ZaloAccount } from './zalo-account.entity';

@Entity('zalo_message_templates')
export class ZaloMessageTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'zalo_account_id' })
  zaloAccountId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', array: true, nullable: true })
  variables: string[];

  @Column({ type: 'text', array: true, nullable: true, name: 'media_urls' })
  mediaUrls: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'usage_count' })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloAccount, (account) => account.templates)
  @JoinColumn({ name: 'zalo_account_id' })
  account: ZaloAccount;
}
