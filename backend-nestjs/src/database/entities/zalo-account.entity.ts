import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ZaloContact } from './zalo-contact.entity';
import { ZaloGroup } from './zalo-group.entity';
import { ZaloConversation } from './zalo-conversation.entity';
import { ZaloMessageTemplate } from './zalo-template.entity';
import { ZaloCampaign } from './zalo-campaign.entity';
import { ZaloAutoReplyRule } from './zalo-auto-reply.entity';
import { ZaloContactGroup } from './zalo-contact-group.entity';

export enum ZaloAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  ERROR = 'error',
}

@Entity('zalo_accounts')
export class ZaloAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Index()
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true, name: 'phone_number' })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'display_name' })
  displayName: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true, name: 'zalo_id' })
  zaloId: string;

  // Session data
  @Column({ type: 'jsonb', nullable: true })
  cookies: any;

  @Column({ type: 'jsonb', nullable: true, name: 'session_data' })
  sessionData: any;

  @Column({ type: 'jsonb', nullable: true, name: 'browser_profile' })
  browserProfile: any;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    default: ZaloAccountStatus.INACTIVE,
  })
  status: ZaloAccountStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_activity_at' })
  lastActivityAt: Date;

  // Timestamps
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.zaloAccounts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ZaloContact, (contact) => contact.account)
  contacts: ZaloContact[];

  @OneToMany(() => ZaloContactGroup, (group) => group.account)
  contactGroups: ZaloContactGroup[];

  @OneToMany(() => ZaloGroup, (group) => group.account)
  groups: ZaloGroup[];

  @OneToMany(() => ZaloConversation, (conversation) => conversation.account)
  conversations: ZaloConversation[];

  @OneToMany(() => ZaloMessageTemplate, (template) => template.account)
  templates: ZaloMessageTemplate[];

  @OneToMany(() => ZaloCampaign, (campaign) => campaign.account)
  campaigns: ZaloCampaign[];

  @OneToMany(() => ZaloAutoReplyRule, (rule) => rule.account)
  autoReplyRules: ZaloAutoReplyRule[];
}
