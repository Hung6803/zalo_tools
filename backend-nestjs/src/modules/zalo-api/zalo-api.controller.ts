import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZaloApiService } from './zalo-api.service';
import { ZaloBrowserService } from '../zalo-browser/zalo-browser.service';
import {
  SendMessageDto,
  SendBulkMessagesDto,
  FindUserDto,
  GetGroupMembersDto,
  SendFriendRequestDto,
} from './dto/send-message.dto';

@ApiTags('zalo-api')
@Controller('zalo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ZaloApiController {
  constructor(
    private readonly zaloApiService: ZaloApiService,
    private readonly zaloBrowserService: ZaloBrowserService,
  ) {}

  @Post('login/:accountId')
  @ApiOperation({ summary: 'Login to Zalo with QR code' })
  async login(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.zaloApiService.login(accountId);
  }

  @Post('login/:accountId/complete')
  @ApiOperation({ summary: 'Complete login after QR scan' })
  async completeLogin(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.zaloApiService.completeLogin(accountId);
  }

  @Get('account-info/:accountId')
  @ApiOperation({ summary: 'Get Zalo account information' })
  async getAccountInfo(@Param('accountId', ParseIntPipe) accountId: number) {
    // Use ZaloBrowserService for session management
    const api = await this.zaloBrowserService.getAPI(accountId);
    if (!api) {
      return {
        success: false,
        message: 'No session found for account. Please login first.',
      };
    }

    try {
      // Fetch full account info
      const accountInfo = await api.fetchAccountInfo();

      return {
        success: true,
        data: {
          profile: accountInfo.profile,
          setting: accountInfo.setting,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch account info: ${error.message}`,
      };
    }
  }

  @Post('find-user')
  @ApiOperation({ summary: 'Find user by phone number' })
  async findUser(@Body() findUserDto: FindUserDto) {
    // Use ZaloBrowserService for session management
    const api = await this.zaloBrowserService.getAPI(findUserDto.accountId);
    if (!api) {
      return {
        success: false,
        message: 'No session found for account. Please login first.',
      };
    }

    const result = await api.findUser(findUserDto.phoneNumber);
    return {
      success: true,
      data: result,
    };
  }

  @Post('send-message')
  @ApiOperation({ summary: 'Send message to user' })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    // Use ZaloBrowserService for session management
    const api = await this.zaloBrowserService.getAPI(sendMessageDto.accountId);
    if (!api) {
      return {
        success: false,
        message: 'No session found for account. Please login first.',
      };
    }

    // sendMessage(message, threadId, type)
    // threadId = userId for direct messages
    const result = await api.sendMessage(sendMessageDto.message, sendMessageDto.userId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('send-bulk-messages')
  @ApiOperation({ summary: 'Send bulk messages with delay' })
  async sendBulkMessages(@Body() sendBulkDto: SendBulkMessagesDto) {
    // Use ZaloBrowserService for session management
    const api = await this.zaloBrowserService.getAPI(sendBulkDto.accountId);
    if (!api) {
      return {
        success: false,
        message: 'No session found for account. Please login first.',
      };
    }

    const results: Array<{
      userId: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];

    const delayMs = sendBulkDto.delayMs || 2000;
    const maxRetries = sendBulkDto.maxRetries || 3;

    for (const recipient of sendBulkDto.recipients) {
      let retries = 0;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          // sendMessage(message, threadId, type)
          const result = await api.sendMessage(recipient.message, recipient.userId);
          results.push({
            userId: recipient.userId,
            success: true,
            result,
          });
          success = true;
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            results.push({
              userId: recipient.userId,
              success: false,
              error: error.message,
            });
          }
        }
      }

      // Delay between messages
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return {
      success: true,
      data: results,
    };
  }

  @Post('scrape-group')
  @ApiOperation({ summary: 'Get group members without joining (API method)' })
  async scrapeGroup(@Body() dto: GetGroupMembersDto) {
    return this.zaloBrowserService.scrapeGroupWithAPI(
      dto.accountId,
      dto.groupLink,
      dto.maxPages || 10,
    );
  }

  @Post('send-friend-request')
  @ApiOperation({ summary: 'Send friend request to user' })
  async sendFriendRequest(@Body() dto: SendFriendRequestDto) {
    // Use ZaloBrowserService for session management
    const api = await this.zaloBrowserService.getAPI(dto.accountId);
    if (!api) {
      return {
        success: false,
        message: 'No session found for account. Please login first.',
      };
    }

    // sendFriendRequest(msg, userId)
    const message = dto.message || 'Xin chào, tôi muốn kết bạn với bạn!';
    const result = await api.sendFriendRequest(message, dto.userId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('logout/:accountId')
  @ApiOperation({ summary: 'Logout from Zalo' })
  async logout(@Param('accountId', ParseIntPipe) accountId: number) {
    return this.zaloApiService.logout(accountId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return { status: 'ok', service: 'Zalo API Service' };
  }
}
