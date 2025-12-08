import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // CORS
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AkaBiz Clone API')
    .setDescription('Zalo Marketing Automation Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    // Core - Authentication
    .addTag('auth', '🔐 Authentication - Đăng nhập/Đăng ký')
    // Zalo Account Management
    .addTag('zalo-accounts', '👤 Zalo Accounts - Quản lý tài khoản Zalo')
    .addTag('zalo-browser', '🌐 Zalo Browser - Tự động hóa trình duyệt (Playwright & zca-js)')
    .addTag('zalo-api', '🚀 Zalo API - Tương tác với Zalo (gửi tin nhắn, scrape, kết bạn)')
    // Contact & Group Management
    .addTag('contacts', '📇 Contacts - Quản lý danh bạ')
    .addTag('contact-groups', '🏷️ Contact Groups - Phân nhóm liên hệ')
    .addTag('groups', '👥 Groups - Quản lý nhóm Zalo')
    // Messaging & Automation
    .addTag('templates', '📝 Templates - Mẫu tin nhắn')
    .addTag('messages', '💬 Messages - Lịch sử tin nhắn')
    .addTag('conversations', '💭 Conversations - Hội thoại')
    .addTag('auto-reply', '🤖 Auto Reply - Tự động trả lời')
    // Marketing
    .addTag('campaigns', '📢 Campaigns - Chiến dịch marketing')
    // Analytics
    .addTag('analytics', '📊 Analytics - Thống kê & báo cáo')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = configService.get('PORT', 8000);
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
