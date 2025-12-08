import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../database/entities/user.entity';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  computerName: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ unique: true })
  apiKey: string;

  @Column({ type: 'simple-array', nullable: true })
  zaloAccountIds: number[];

  @Column({ default: 'offline' })
  status: 'online' | 'offline' | 'error';

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
