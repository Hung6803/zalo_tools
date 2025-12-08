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
import { ZaloGroupMember } from './zalo-group-member.entity';

export enum GroupType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  HIDDEN = 'hidden',
}

@Entity('zalo_groups')
export class ZaloGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'zalo_account_id' })
  zaloAccountId: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'group_link' })
  groupLink: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'group_name' })
  groupName: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'group_id' })
  groupId: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'group_type' })
  groupType: GroupType;

  @Column({ type: 'int', default: 0, name: 'member_count' })
  memberCount: number;

  @Column({ type: 'boolean', default: false, name: 'is_joined' })
  isJoined: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_scraped_at' })
  lastScrapedAt: Date;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloAccount, (account) => account.groups)
  @JoinColumn({ name: 'zalo_account_id' })
  account: ZaloAccount;

  @OneToMany(() => ZaloGroupMember, (member) => member.group)
  members: ZaloGroupMember[];
}
