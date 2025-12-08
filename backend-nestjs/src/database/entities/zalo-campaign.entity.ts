import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ZaloAccount } from './zalo-account.entity';
import { User } from './user.entity';
import { ZaloCampaignRecipient } from './zalo-campaign-recipient.entity';
import { ZaloCampaignLog } from './zalo-campaign-log.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped',
}

export enum CampaignType {
  BROADCAST = 'broadcast',
  DRIP = 'drip',
  TRIGGER = 'trigger',
}

export enum TargetType {
  ALL = 'all',
  GROUPS = 'groups',
  CONTACTS = 'contacts',
  TAGS = 'tags',
  CUSTOM = 'custom',
  PHONE_LIST = 'phone_list',
  MANUAL = 'manual',
}

export enum SendMethod {
  API = 'api',
  BROWSER = 'browser',
}

export enum ScheduleType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
}

@Entity('zalo_campaigns')
export class ZaloCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'zalo_account_id' })
  zaloAccountId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'campaign_type' })
  campaignType: CampaignType;

  @Column({ type: 'varchar', length: 50, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  // Target audience
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'target_type' })
  targetType: TargetType;

  @Column({ type: 'int', array: true, nullable: true, name: 'target_groups' })
  targetGroups: number[];

  @Column({ type: 'int', array: true, nullable: true, name: 'target_contacts' })
  targetContacts: number[];

  @Column({ type: 'text', array: true, nullable: true, name: 'target_tags' })
  targetTags: string[];

  @Column({ type: 'int', array: true, nullable: true, name: 'exclude_contacts' })
  excludeContacts: number[];

  // Message content
  @Column({ type: 'int', nullable: true, name: 'template_id' })
  templateId: number;

  @Column({ type: 'text', nullable: true, name: 'message_content' })
  messageContent: string;

  @Column({ type: 'text', array: true, nullable: true, name: 'media_urls' })
  mediaUrls: string[];

  // Scheduling
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'schedule_type' })
  scheduleType: ScheduleType;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'recurring_pattern' })
  recurringPattern: string;

  // Rate limiting
  @Column({ type: 'int', default: 100, name: 'messages_per_hour' })
  messagesPerHour: number;

  @Column({ type: 'int', default: 5, name: 'delay_between_messages' })
  delayBetweenMessages: number;

  @Column({ type: 'boolean', default: true, name: 'randomize_delay' })
  randomizeDelay: boolean;

  // Send method
  @Column({ type: 'varchar', length: 50, default: SendMethod.API, name: 'send_method' })
  sendMethod: SendMethod;

  // Stats
  @Column({ type: 'int', default: 0, name: 'total_recipients' })
  totalRecipients: number;

  @Column({ type: 'int', default: 0, name: 'sent_count' })
  sentCount: number;

  @Column({ type: 'int', default: 0, name: 'delivered_count' })
  deliveredCount: number;

  @Column({ type: 'int', default: 0, name: 'read_count' })
  readCount: number;

  @Column({ type: 'int', default: 0, name: 'failed_count' })
  failedCount: number;

  @Column({ type: 'int', default: 0, name: 'reply_count' })
  replyCount: number;

  // Metadata
  @Column({ type: 'int', nullable: true, name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloAccount, (account) => account.campaigns)
  @JoinColumn({ name: 'zalo_account_id' })
  account: ZaloAccount;

  @ManyToOne(() => User, (user) => user.campaigns)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @OneToMany(() => ZaloCampaignRecipient, (recipient) => recipient.campaign)
  recipients: ZaloCampaignRecipient[];

  @OneToMany(() => ZaloCampaignLog, (log) => log.campaign)
  logs: ZaloCampaignLog[];
}
