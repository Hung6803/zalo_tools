import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ZaloCampaign } from './zalo-campaign.entity';

@Entity('zalo_campaign_logs')
export class ZaloCampaignLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'campaign_id' })
  campaignId: number;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  details: any;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => ZaloCampaign, (campaign) => campaign.logs)
  @JoinColumn({ name: 'campaign_id' })
  campaign: ZaloCampaign;
}
