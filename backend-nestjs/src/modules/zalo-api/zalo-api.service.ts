import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ZaloAccount, ZaloAccountStatus } from '../../database/entities/zalo-account.entity';

// Import zca-js
const ZCA = require('zca-js');

interface ZaloClient {
  api: any;
  accountId: number;
  lastActivity: Date;
}

interface Credentials {
  imei: string;
  cookie: any[];
  userAgent: string;
  language?: string;
}

@Injectable()
export class ZaloApiService {
  private readonly logger = new Logger(ZaloApiService.name);
  private clients: Map<number, ZaloClient> = new Map();
  private readonly sessionPath: string;
  private readonly loginSessions: Map<
    number,
    {
      qrCodeImage?: string;
      status: 'waiting' | 'scanning' | 'success' | 'error' | 'timeout';
      message?: string;
      data?: any;
    }
  > = new Map();

  constructor(
    @InjectRepository(ZaloAccount)
    private zaloAccountRepository: Repository<ZaloAccount>,
    private configService: ConfigService,
  ) {
    this.sessionPath = this.configService.get('zalo.sessionPath') || './data/sessions';
  }

  /**
   * Get session file path for account
   */
  private getSessionFilePath(accountId: number): string {
    return path.join(this.sessionPath, `${accountId}.json`);
  }


  /**
   * Delete session file
   */
  private async deleteSession(accountId: number): Promise<void> {
    try {
      const filePath = this.getSessionFilePath(accountId);
      await fs.unlink(filePath);
      this.logger.log(`Session deleted for account ${accountId}`);
    } catch (error) {
      // Ignore error if file doesn't exist
    }
  }

  /**
   * Get or create Zalo API client
   */
  private async getClient(accountId: number): Promise<any> {
    // Check if client exists and is still valid
    const existingClient = this.clients.get(accountId);
    if (existingClient) {
      existingClient.lastActivity = new Date();
      return existingClient.api;
    }

    // Load credentials and create new client
    const credentials = await this.loadCredentials(accountId);
    if (!credentials) {
      throw new NotFoundException(`No session found for account ${accountId}. Please login first.`);
    }

    try {
      const zalo = new ZCA.Zalo({});
      const api = await zalo.login(credentials);

      // Store client
      this.clients.set(accountId, {
        api,
        accountId,
        lastActivity: new Date(),
      });

      return api;
    } catch (error) {
      this.logger.error(`Failed to restore session: ${error.message}`);
      throw new NotFoundException(`Failed to restore session for account ${accountId}. Please login again.`);
    }
  }

  /**
   * Load credentials from file
   */
  private async loadCredentials(accountId: number): Promise<Credentials | null> {
    try {
      const filePath = this.getSessionFilePath(accountId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Save credentials to file
   */
  private async saveCredentials(accountId: number, credentials: Credentials): Promise<void> {
    const filePath = this.getSessionFilePath(accountId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(credentials, null, 2));
    this.logger.log(`Credentials saved for account ${accountId}`);
  }

  /**
   * Login with QR code using ZCA-JS (similar to zalo-browser loginWithZCA)
   */
  async login(accountId: number): Promise<{
    success: boolean;
    qrCodeImage?: string;
    status: string;
    message?: string;
    data?: any;
  }> {
    try {
      const account = await this.zaloAccountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException(`Account ${accountId} not found`);
      }

      // Check if credentials exist (already logged in before)
      const existingCredentials = await this.loadCredentials(accountId);
      if (existingCredentials) {
        this.logger.log(`Found existing credentials for account ${accountId}, attempting to restore session`);

        try {
          const zalo = new ZCA.Zalo({});
          const api = await zalo.login(existingCredentials);

          // Verify session by getting user info
          const userInfo = await api.fetchAccountInfo();

          // Session is valid, save API instance
          this.clients.set(accountId, {
            api,
            accountId,
            lastActivity: new Date(),
          });

          // Update account last activity
          await this.zaloAccountRepository.update(accountId, {
            status: ZaloAccountStatus.ACTIVE,
            lastActivityAt: new Date(),
          } as any);

          this.logger.log(`Session restored successfully for account ${accountId}: ${userInfo.profile.displayName}`);

          return {
            success: true,
            status: 'success',
            message: 'Session restored successfully',
            data: {
              displayName: userInfo.profile.displayName,
              zaloId: userInfo.profile.userId,
              avatarUrl: userInfo.profile.avatar,
              restored: true,
            },
          };
        } catch (error) {
          this.logger.warn(`Failed to restore session for account ${accountId}: ${error.message}, will create new login`);
          // Continue to QR login
        }
      }

      this.logger.log(`Starting new ZCA QR login for account ${accountId}`);

      // Initialize session
      this.loginSessions.set(accountId, {
        status: 'waiting',
        message: 'Initializing QR code...',
      });

      const zalo = new ZCA.Zalo({});
      const qrPath = path.join(this.sessionPath, `zalo_${accountId}_qr.png`);

      // Create directory if not exists
      await fs.mkdir(path.dirname(qrPath), { recursive: true });

      // Login with QR code
      const api = await zalo.loginQR(
        {
          qrPath, // Save QR code as image
        },
        async (event: any) => {
          this.logger.log(`QR Login Event Type: ${event.type}`);

          // Event types: 0=QRCodeGenerated, 1=QRCodeExpired, 2=QRCodeScanned, 3=QRCodeDeclined, 4=GotLoginInfo
          if (event.type === 0) {
            // QRCodeGenerated
            try {
              // Use the saveToFile action if available, otherwise wait for file to be created
              if (event.actions?.saveToFile) {
                await event.actions.saveToFile(qrPath);
              } else {
                // Wait a bit for the file to be written
                await new Promise(resolve => setTimeout(resolve, 100));
              }

              // Read QR image and convert to base64
              const qrImage = await fs.readFile(qrPath);
              const qrBase64 = `data:image/png;base64,${qrImage.toString('base64')}`;

              this.loginSessions.set(accountId, {
                qrCodeImage: qrBase64,
                status: 'waiting',
                message: 'Please scan the QR code with your Zalo app',
              });

              this.logger.log(`QR code generated and converted to base64 for account ${accountId}`);
            } catch (error) {
              this.logger.error(`Failed to read QR code image: ${error.message}`);
              this.loginSessions.set(accountId, {
                status: 'error',
                message: 'Failed to generate QR code',
              });
            }
          } else if (event.type === 2) {
            // QRCodeScanned
            this.loginSessions.set(accountId, {
              ...this.loginSessions.get(accountId),
              status: 'scanning',
              message: 'QR code scanned, waiting for confirmation...',
            });
          } else if (event.type === 1) {
            // QRCodeExpired
            this.loginSessions.set(accountId, {
              ...this.loginSessions.get(accountId),
              status: 'timeout',
              message: 'QR code expired, please try again',
            });
          } else if (event.type === 3) {
            // QRCodeDeclined
            this.loginSessions.set(accountId, {
              ...this.loginSessions.get(accountId),
              status: 'error',
              message: 'QR code scan was declined',
            });
          }
        },
      );

      // Login successful, save API instance
      this.clients.set(accountId, {
        api,
        accountId,
        lastActivity: new Date(),
      });

      // Get user info using fetchAccountInfo()
      const userInfo = await api.fetchAccountInfo();
      this.logger.log(`User info fetched: ${JSON.stringify(userInfo)}`);

      // Save credentials for future use
      const cookieJar = api.getCookie();
      const cookieJson = cookieJar.toJSON();

      const credentials: Credentials = {
        imei: api.getContext().imei,
        cookie: cookieJson.cookies || [],
        userAgent: api.getContext().userAgent,
        language: api.getContext().language,
      };
      await this.saveCredentials(accountId, credentials);

      // Update account status in database
      await this.zaloAccountRepository.update(accountId, {
        status: ZaloAccountStatus.ACTIVE,
        zaloId: userInfo.profile.userId,
        displayName: userInfo.profile.displayName,
        avatarUrl: userInfo.profile.avatar,
        sessionData: credentials as any,
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      } as any);

      // Update session
      this.loginSessions.set(accountId, {
        status: 'success',
        message: 'Login successful!',
        data: {
          displayName: userInfo.profile.displayName,
          zaloId: userInfo.profile.userId,
          avatarUrl: userInfo.profile.avatar,
        },
      });

      this.logger.log(
        `Login successful for account ${accountId}: ${userInfo.profile.displayName}`,
      );

      // Clean up QR image
      try {
        await fs.unlink(qrPath);
      } catch (error) {
        // Ignore cleanup errors
      }

      return {
        success: true,
        status: 'success',
        message: 'Login successful!',
        data: {
          displayName: userInfo.profile.displayName,
          zaloId: userInfo.profile.userId,
          avatarUrl: userInfo.profile.avatar,
        },
      };
    } catch (error) {
      this.logger.error(`ZCA Login failed: ${error.message}`);

      this.loginSessions.set(accountId, {
        status: 'error',
        message: `Login failed: ${error.message}`,
      });

      return {
        success: false,
        status: 'error',
        message: error.message,
      };
    }
  }

  /**
   * Complete login after QR scan - replaced by polling login status
   * This method now just checks the login session status
   */
  async completeLogin(accountId: number): Promise<any> {
    const session = this.loginSessions.get(accountId);

    if (!session) {
      return {
        success: false,
        status: 'not-started',
        message: 'No login session found. Please call /login first.',
      };
    }

    return {
      success: session.status === 'success',
      status: session.status,
      qrCodeImage: session.qrCodeImage,
      message: session.message,
      data: session.data,
    };
  }

  /**
   * Get account info
   */
  async getAccountInfo(accountId: number): Promise<any> {
    const api = await this.getClient(accountId);
    const ownId = await api.getOwnId();

    // You can add more account info retrieval here
    return {
      zaloId: ownId,
    };
  }

  /**
   * Find user by phone number
   */
  async findUser(accountId: number, phoneNumber: string): Promise<any> {
    const api = await this.getClient(accountId);
    const result = await api.findUser(phoneNumber);
    return result;
  }

  /**
   * Send message to user
   */
  async sendMessage(accountId: number, userId: string, message: string): Promise<any> {
    const api = await this.getClient(accountId);
    const result = await api.sendMessage(userId, message);
    return result;
  }

  /**
   * Send bulk messages with delay and retry
   */
  async sendBulkMessages(
    accountId: number,
    recipients: Array<{ userId: string; message: string }>,
    delayMs: number = 2000,
    maxRetries: number = 3,
  ): Promise<any[]> {
    const api = await this.getClient(accountId);
    const results: Array<{
      userId: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];

    for (const recipient of recipients) {
      let retries = 0;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const result = await api.sendMessage(recipient.userId, recipient.message);
          results.push({
            userId: recipient.userId,
            success: true,
            result,
          });
          success = true;
        } catch (error) {
          retries++;
          this.logger.warn(
            `Failed to send message to ${recipient.userId}, retry ${retries}/${maxRetries}`,
          );

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

    return results;
  }

  /**
   * Get group members from link (WITHOUT joining)
   */
  async getGroupMembersFromLink(
    accountId: number,
    groupLink: string,
    _maxPages: number = 10, // Prefixed with _ to indicate intentionally unused
  ): Promise<any> {
    const api = await this.getClient(accountId);

    try {
      // Get group info and members using zca-js
      // Note: zca-js getGroupLinkInfo handles pagination internally
      const groupInfo = await api.getGroupLinkInfo(groupLink);

      return {
        success: true,
        groupInfo,
      };
    } catch (error) {
      this.logger.error(`Failed to get group members: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(accountId: number, userId: string): Promise<any> {
    const api = await this.getClient(accountId);
    const result = await api.sendFriendRequest(userId);
    return result;
  }

  /**
   * Logout and clear session
   */
  async logout(accountId: number): Promise<any> {
    // Remove client
    this.clients.delete(accountId);

    // Delete session file
    await this.deleteSession(accountId);

    // Update account status
    await this.zaloAccountRepository.update(accountId, {
      status: ZaloAccountStatus.INACTIVE,
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Clean up inactive clients (can be called periodically)
   */
  async cleanupInactiveClients(maxIdleMinutes: number = 30): Promise<void> {
    const now = new Date();
    const clientsToRemove: number[] = [];

    this.clients.forEach((client, accountId) => {
      const idleMinutes = (now.getTime() - client.lastActivity.getTime()) / 1000 / 60;
      if (idleMinutes > maxIdleMinutes) {
        clientsToRemove.push(accountId);
      }
    });

    clientsToRemove.forEach((accountId) => {
      this.clients.delete(accountId);
      this.logger.log(`Cleaned up inactive client for account ${accountId}`);
    });
  }
}
