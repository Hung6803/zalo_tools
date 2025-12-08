import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ZaloConversation } from './zalo-conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  STICKER = 'sticker',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('zalo_messages')
export class ZaloMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'conversation_id' })
  conversationId: number;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true, name: 'zalo_message_id' })
  zaloMessageId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'sender_zalo_id' })
  senderZaloId: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'message_type' })
  messageType: MessageType;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'media_url' })
  mediaUrl: string;

  @Column({ type: 'jsonb', nullable: true, name: 'message_metadata' })
  messageMetadata: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: MessageStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => ZaloConversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: ZaloConversation;
}
