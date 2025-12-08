import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ZaloAccount } from './zalo-account.entity';
import { ZaloContactGroup } from './zalo-contact-group.entity';

@Entity('zalo_contacts')
export class ZaloContact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'zalo_account_id' })
  zaloAccountId: number;

  @Index()
  @Column({ type: 'varchar', length: 255, name: 'zalo_id' })
  zaloId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'display_name' })
  displayName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'boolean', default: false, name: 'is_friend' })
  isFriend: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_blocked' })
  isBlocked: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'custom_fields' })
  customFields: any;

  @Column({ type: 'timestamp', nullable: true, name: 'last_interaction_at' })
  lastInteractionAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloAccount, (account) => account.contacts)
  @JoinColumn({ name: 'zalo_account_id' })
  account: ZaloAccount;

  @ManyToMany(() => ZaloContactGroup, (group) => group.contacts)
  groups: ZaloContactGroup[];
}
