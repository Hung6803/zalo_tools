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

export enum TriggerType {
  KEYWORD = 'keyword',
  TIME = 'time',
  ALL = 'all',
}

export enum MatchType {
  EXACT = 'exact',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  REGEX = 'regex',
}

@Entity('zalo_auto_reply_rules')
export class ZaloAutoReplyRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'zalo_account_id' })
  zaloAccountId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  // Trigger conditions
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'trigger_type' })
  triggerType: TriggerType;

  @Column({ type: 'text', array: true, nullable: true })
  keywords: string[];

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'match_type' })
  matchType: MatchType;

  // Time conditions
  @Column({ type: 'jsonb', nullable: true, name: 'active_hours' })
  activeHours: {
    start: string;
    end: string;
  };

  @Column({ type: 'int', array: true, nullable: true, name: 'active_days' })
  activeDays: number[];

  // Response
  @Column({ type: 'int', nullable: true, name: 'response_template_id' })
  responseTemplateId: number;

  @Column({ type: 'text', nullable: true, name: 'response_content' })
  responseContent: string;

  @Column({ type: 'int', default: 0, name: 'response_delay' })
  responseDelay: number;

  // Stats
  @Column({ type: 'int', default: 0, name: 'trigger_count' })
  triggerCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_triggered_at' })
  lastTriggeredAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloAccount, (account) => account.autoReplyRules)
  @JoinColumn({ name: 'zalo_account_id' })
  account: ZaloAccount;
}
