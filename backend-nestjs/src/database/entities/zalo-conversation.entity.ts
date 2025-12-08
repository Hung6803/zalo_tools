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
import { ZaloAccount } from './zalo-account.entity';
import { ZaloMessage } from './zalo-message.entity';

export enum ConversationType {
  PERSONAL = 'personal',
  GROUP = 'group',
}

@Entity('zalo_conversations')
export class ZaloConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'zalo_account_id' })
  zaloAccountId: number;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true, name: 'conversation_id' })
  conversationId: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'conversation_type' })
  conversationType: ConversationType;

  @Column({ type: 'text', array: true, nullable: true, name: 'participant_ids' })
  participantIds: string[];

  @Column({ type: 'timestamp', nullable: true, name: 'last_message_at' })
  lastMessageAt: Date;

  @Column({ type: 'int', default: 0, name: 'unread_count' })
  unreadCount: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloAccount, (account) => account.conversations)
  @JoinColumn({ name: 'zalo_account_id' })
  account: ZaloAccount;

  @OneToMany(() => ZaloMessage, (message) => message.conversation)
  messages: ZaloMessage[];
}
