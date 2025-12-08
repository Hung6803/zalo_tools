import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import zaloConfig from './config/zalo.config';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ZaloApiModule } from './modules/zalo-api/zalo-api.module';
import { ZaloBrowserModule } from './modules/zalo-browser/zalo-browser.module';
import { ZaloAccountsModule } from './modules/zalo-accounts/zalo-accounts.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AutoReplyModule } from './modules/auto-reply/auto-reply.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ContactGroupsModule } from './modules/contact-groups/contact-groups.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AgentsModule } from './modules/agents/agents.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig, zaloConfig],
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
    }),

    // BullMQ for job queues
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
        },
      }),
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    ZaloAccountsModule,
    TemplatesModule,
    AutoReplyModule,
    ContactsModule,
    ContactGroupsModule,
    CampaignsModule,
    GroupsModule,
    MessagesModule,
    ConversationsModule,
    AnalyticsModule,
    ZaloApiModule,
    ZaloBrowserModule,
    AgentsModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT Auth Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
