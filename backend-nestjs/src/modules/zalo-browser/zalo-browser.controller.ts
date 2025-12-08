import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Get,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZaloBrowserService } from './zalo-browser.service';
import { ScrapeGroupDto } from './dto/scrape-group.dto';
import { Observable } from 'rxjs';

@ApiTags('zalo-browser')
@Controller('zalo-browser')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ZaloBrowserController {
  constructor(private readonly zaloBrowserService: ZaloBrowserService) {}

  @Post('scrape-group')
  @ApiOperation({
    summary: 'Scrape group members using browser automation',
    description:
      'Uses Playwright to scrape group members. Can auto-join group if not member and auto-leave after scraping.',
  })
  async scrapeGroup(@Body() dto: ScrapeGroupDto) {
    return this.zaloBrowserService.scrapeGroupMembers(
      dto.accountId,
      dto.groupLink,
      dto.maxMembers || 1000,
      dto.autoJoin !== false, // default true
      dto.autoLeave || false,
    );
  }

  @Post('login/:accountId')
  @ApiOperation({
    summary: 'Login to Zalo via browser with QR code',
    description:
      'Opens browser window for QR code scanning. Browser must be visible (headless=false).',
  })
  async loginWithQR(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.zaloBrowserService.loginWithQR(accountId);
  }

  @Post('login-zca/:accountId')
  @ApiOperation({
    summary: 'Login to Zalo using zca-js library',
    description:
      'Generates QR code using zca-js and returns base64 image for frontend display.',
  })
  async loginWithZCA(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.zaloBrowserService.loginWithZCA(accountId);
  }

  @Get('login-status/:accountId')
  @ApiOperation({
    summary: 'Check Zalo login status',
    description: 'Returns current login status for the account.',
  })
  async getLoginStatus(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.zaloBrowserService.getLoginStatus(accountId);
  }
}
