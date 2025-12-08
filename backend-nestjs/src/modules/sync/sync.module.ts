import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AgentsModule } from '../agents/agents.module';
import { ZaloMessage } from '../../database/entities/zalo-message.entity';
import { ZaloContact } from '../../database/entities/zalo-contact.entity';
import { ZaloGroup } from '../../database/entities/zalo-group.entity';
import { ZaloGroupMember } from '../../database/entities/zalo-group-member.entity';
import { ZaloConversation } from '../../database/entities/zalo-conversation.entity';
import { ZaloMessageTemplate } from '../../database/entities/zalo-template.entity';
import { ZaloAccount } from '../../database/entities/zalo-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ZaloMessage,
      ZaloContact,
      ZaloGroup,
      ZaloGroupMember,
      ZaloConversation,
      ZaloMessageTemplate,
      ZaloAccount,
    ]),
    AgentsModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
