import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ZaloGroup } from './zalo-group.entity';

export enum MemberRole {
  MEMBER = 'member',
  ADMIN = 'admin',
  OWNER = 'owner',
}

@Entity('zalo_group_members')
export class ZaloGroupMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'group_id' })
  groupId: number;

  @Column({ type: 'varchar', length: 255, name: 'zalo_id' })
  zaloId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'display_name' })
  displayName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  role: MemberRole;

  @Column({ type: 'timestamp', nullable: true, name: 'joined_at' })
  joinedAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'scraped_at' })
  scrapedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloGroup, (group) => group.members)
  @JoinColumn({ name: 'group_id' })
  group: ZaloGroup;
}
