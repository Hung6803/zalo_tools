import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { ZaloAccount } from './zalo-account.entity';
import { ZaloContact } from './zalo-contact.entity';

@Entity('zalo_contact_groups')
export class ZaloContactGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'zalo_account_id' })
  zaloAccountId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ZaloAccount, (account) => account.contactGroups)
  @JoinColumn({ name: 'zalo_account_id' })
  account: ZaloAccount;

  @ManyToMany(() => ZaloContact, (contact) => contact.groups)
  @JoinTable({
    name: 'zalo_contact_group_members',
    joinColumn: { name: 'group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contact_id', referencedColumnName: 'id' },
  })
  contacts: ZaloContact[];
}
