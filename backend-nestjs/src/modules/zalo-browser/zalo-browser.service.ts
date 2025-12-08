import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { chromium, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { ZaloAccount, ZaloAccountStatus } from '../../database/entities/zalo-account.entity';
import { ZaloGroup } from '../../database/entities/zalo-group.entity';
import { ZaloGroupMember, MemberRole } from '../../database/entities/zalo-group-member.entity';

// Import zca-js using require for CommonJS compatibility
const ZCA = require('zca-js');
type Credentials = {
  imei: string;
  cookie: any[];
  userAgent: string;
  language?: string;
};

export interface GroupMember {
  zaloId: string;
  displayName: string;
  avatarUrl: string;
  role: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    group: {
      groupName: string;
      groupId: string;
    };
    members: GroupMember[];
    total: number;
  };
  meta?: {
    joinedToScrape: boolean;
    leftAfterScrape: boolean;
  };
  error?: string;
}

export interface LoginResult {
  success: boolean;
  data?: {
    loggedIn: boolean;
    newLogin?: boolean;
    displayName?: string;
    avatarUrl?: string;
  };
  error?: string;
}

@Injectable()
export class ZaloBrowserService {
  private readonly logger = new Logger(ZaloBrowserService.name);
  private readonly profilesPath: string;
  private readonly headless: boolean;
  private readonly apiInstances: Map<number, any> = new Map();
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
    private configService: ConfigService,
    @InjectRepository(ZaloAccount)
    private zaloAccountRepository: Repository<ZaloAccount>,
    @InjectRepository(ZaloGroup)
    private zaloGroupRepository: Repository<ZaloGroup>,
    @InjectRepository(ZaloGroupMember)
    private zaloGroupMemberRepository: Repository<ZaloGroupMember>,
  ) {
    this.profilesPath = this.configService.get('BROWSER_PROFILES_PATH') || './data/browser_profiles';
    this.headless = this.configService.get('BROWSER_HEADLESS') === 'true';
  }

  /**
   * Get browser profile path for account
   */
  private getProfilePath(accountId: number): string {
    return path.join(this.profilesPath, `zalo_${accountId}`);
  }

  /**
   * Scrape group members using browser automation
   */
  async scrapeGroupMembers(
    accountId: number,
    groupLink: string,
    maxMembers: number = 1000,
    autoJoin: boolean = true,
    autoLeave: boolean = false,
  ): Promise<ScrapeResult> {
    let browser: BrowserContext | null = null;

    try {
      this.logger.log(`Starting group scrape for account ${accountId}`);

      // Launch browser with persistent context
      browser = await chromium.launchPersistentContext(
        this.getProfilePath(accountId),
        {
          headless: this.headless,
          viewport: { width: 1280, height: 720 },
        },
      );

      const page = await browser.newPage();

      // Navigate to group
      await page.goto(groupLink);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check if we're a member
      const isMember = await page.evaluate(() => {
        const joinBtn = document.querySelector(
          '[data-action="join"], .join-button, button:has-text("Tham gia")',
        );
        return !joinBtn;
      });

      let joinedNow = false;

      if (!isMember && autoJoin) {
        // Try to join group
        try {
          await page.click(
            '[data-action="join"], .join-button, button:has-text("Tham gia")',
          );
          await page.waitForTimeout(2000);
          await page.waitForSelector('.member-item, [data-member-id]', {
            timeout: 10000,
          });
          joinedNow = true;
          this.logger.log(`Joined group successfully`);
        } catch (error) {
          await browser.close();
          return {
            success: false,
            error: `Không thể tham gia group: ${error.message}. Group có thể là private hoặc yêu cầu phê duyệt.`,
          };
        }
      } else if (!isMember && !autoJoin) {
        await browser.close();
        return {
          success: false,
          error:
            'Bạn chưa là thành viên của group này. Bật autoJoin=true để tự động tham gia.',
        };
      }

      // Extract group info
      const groupInfo = await page.evaluate(() => {
        const groupName =
          document
            .querySelector('.group-name, .group-title, h1')
            ?.textContent?.trim() || '';
        const groupId = window.location.pathname.split('/').pop() || '';
        return { groupName, groupId };
      });

      this.logger.log(`Scraping members from group: ${groupInfo.groupName}`);

      // Scroll and load members
      const members: GroupMember[] = [];
      let lastCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 50;

      while (
        scrollAttempts < maxScrollAttempts &&
        members.length < maxMembers
      ) {
        // Extract visible members
        const newMembers = await page.evaluate(() => {
          const memberElements = document.querySelectorAll(
            '.member-item, [data-member-id]',
          );
          return Array.from(memberElements)
            .map((el) => ({
              zaloId:
                el.getAttribute('data-member-id') ||
                el.getAttribute('data-id') ||
                '',
              displayName:
                el.querySelector('.name, .member-name')?.textContent?.trim() ||
                '',
              avatarUrl: el.querySelector('img')?.getAttribute('src') || '',
              role:
                el.querySelector('.role')?.textContent?.trim() || 'member',
            }))
            .filter((m) => m.zaloId);
        });

        // Add new members
        for (const member of newMembers) {
          if (!members.find((m) => m.zaloId === member.zaloId)) {
            members.push(member);
          }
        }

        // Check progress
        if (members.length === lastCount) {
          scrollAttempts++;
        } else {
          scrollAttempts = 0;
          lastCount = members.length;
        }

        // Scroll down
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(500);
      }

      this.logger.log(`Scraped ${members.length} members`);

      // Leave group if requested
      let leftGroup = false;
      if (autoLeave && joinedNow) {
        try {
          await page.click(
            '[data-action="settings"], .group-settings, button:has-text("Cài đặt")',
          );
          await page.waitForTimeout(1000);

          await page.click(
            '[data-action="leave"], .leave-group, button:has-text("Rời nhóm")',
          );
          await page.waitForTimeout(1000);

          await page.click(
            '[data-action="confirm"], .confirm-button, button:has-text("Xác nhận")',
          );
          await page.waitForTimeout(1000);

          leftGroup = true;
          this.logger.log(`Left group successfully`);
        } catch (error) {
          this.logger.warn(`Failed to leave group: ${error.message}`);
        }
      }

      await browser.close();

      return {
        success: true,
        data: {
          group: groupInfo,
          members,
          total: members.length,
        },
        meta: {
          joinedToScrape: joinedNow,
          leftAfterScrape: leftGroup,
        },
      };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      this.logger.error(`Scrape failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Login to Zalo via browser with QR code
   */
  async loginWithQR(accountId: number): Promise<LoginResult> {
    let browser: BrowserContext | null = null;

    try {
      this.logger.log(`Starting browser login for account ${accountId}`);

      // Launch browser (must be visible for QR scan)
      browser = await chromium.launchPersistentContext(
        this.getProfilePath(accountId),
        {
          headless: false, // Must be visible
          viewport: { width: 1280, height: 720 },
        },
      );

      const page = await browser.newPage();
      await page.goto('https://chat.zalo.me');

      // Wait for QR code or already logged in
      try {
        await page.waitForSelector('.qr-code, .conversation-list', {
          timeout: 60000,
        });

        // Check if already logged in
        const isLoggedIn = await page.isVisible('.conversation-list');

        if (isLoggedIn) {
          // Already logged in
          const accountInfo = await this.extractAccountInfo(page);
          await browser.close();

          this.logger.log(`Already logged in: ${accountInfo.displayName}`);

          return {
            success: true,
            data: {
              loggedIn: true,
              ...accountInfo,
            },
          };
        } else {
          // QR code present, wait for login
          this.logger.log(`Waiting for QR scan...`);
          await page.waitForSelector('.conversation-list', { timeout: 120000 });

          const accountInfo = await this.extractAccountInfo(page);
          await browser.close();

          this.logger.log(`Login successful: ${accountInfo.displayName}`);

          return {
            success: true,
            data: {
              loggedIn: true,
              newLogin: true,
              ...accountInfo,
            },
          };
        }
      } catch (error) {
        await browser.close();
        return {
          success: false,
          error: `Login timeout or error: ${error.message}`,
        };
      }
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      this.logger.error(`Browser login failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract account info from logged-in page
   */
  private async extractAccountInfo(
    page: Page,
  ): Promise<{ displayName: string; avatarUrl: string }> {
    return page.evaluate(() => {
      const nameEl = document.querySelector('.user-name, .profile-name');
      const avatarEl = document.querySelector(
        '.user-avatar img, .profile-avatar img',
      );
      return {
        displayName: nameEl?.textContent?.trim() || '',
        avatarUrl: avatarEl?.getAttribute('src') || '',
      };
    });
  }

  /**
   * Get credentials file path for account
   */
  private getCredentialsPath(accountId: number): string {
    return path.join(this.profilesPath, `zalo_${accountId}_credentials.json`);
  }

  /**
   * Save credentials to file
   */
  private async saveCredentials(
    accountId: number,
    credentials: Credentials,
  ): Promise<void> {
    const credPath = this.getCredentialsPath(accountId);
    const dir = path.dirname(credPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));
    this.logger.log(`Saved credentials for account ${accountId}`);
  }

  /**
   * Load credentials from file
   */
  private async loadCredentials(accountId: number): Promise<Credentials | null> {
    const credPath = this.getCredentialsPath(accountId);

    if (!fs.existsSync(credPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(credPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to load credentials: ${error.message}`);
      return null;
    }
  }

  /**
   * Login with ZCA-JS using QR code
   */
  async loginWithZCA(accountId: number): Promise<{
    success: boolean;
    qrCodeImage?: string;
    status: string;
    message?: string;
    data?: any;
  }> {
    try {
      this.logger.log(`Starting ZCA login for account ${accountId}`);

      // Initialize session
      this.loginSessions.set(accountId, {
        status: 'waiting',
        message: 'Initializing QR code...',
      });

      const zalo = new ZCA.Zalo({});
      const qrPath = path.join(this.profilesPath, `zalo_${accountId}_qr.png`);

      // Create directory if not exists
      const dir = path.dirname(qrPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

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
              const qrImage = fs.readFileSync(qrPath);
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
      this.apiInstances.set(accountId, api);

      // Get user info - use fetchAccountInfo() instead of getAccountInfo()
      const userInfo = await api.fetchAccountInfo();
      this.logger.log(`User info fetched: ${JSON.stringify(userInfo)}`);

      // Save credentials for future use
      // Note: getCookie() returns CookieJar, we need to serialize it
      const cookieJar = api.getCookie();
      const cookieJson = cookieJar.toJSON();

      const credentials: Credentials = {
        imei: api.getContext().imei,
        cookie: cookieJson.cookies || [], // Extract cookies array from CookieJar JSON
        userAgent: api.getContext().userAgent,
        language: api.getContext().language,
      };
      await this.saveCredentials(accountId, credentials);

      // Update account status in database
      // Note: fetchAccountInfo returns nested structure with 'profile' object
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
      if (fs.existsSync(qrPath)) {
        fs.unlinkSync(qrPath);
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
   * Get current login status
   */
  async getLoginStatus(accountId: number): Promise<{
    success: boolean;
    status: string;
    qrCodeImage?: string;
    message?: string;
    data?: any;
  }> {
    const session = this.loginSessions.get(accountId);

    if (!session) {
      // Check if credentials exist (already logged in before)
      const credentials = await this.loadCredentials(accountId);
      if (credentials) {
        return {
          success: true,
          status: 'logged-in',
          message: 'Account is already logged in',
        };
      }

      return {
        success: false,
        status: 'not-started',
        message: 'No login session found',
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
   * Get API instance for account (lazy load from credentials if needed)
   */
  async getAPI(accountId: number): Promise<any | null> {
    // Return cached instance
    if (this.apiInstances.has(accountId)) {
      return this.apiInstances.get(accountId);
    }

    // Try to load from credentials
    const credentials = await this.loadCredentials(accountId);
    if (!credentials) {
      return null;
    }

    try {
      const zalo = new ZCA.Zalo({});
      const api = await zalo.login(credentials);
      this.apiInstances.set(accountId, api);
      return api;
    } catch (error) {
      this.logger.error(
        `Failed to restore session from credentials: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Scrape group members using zca-js API (without browser automation)
   */
  async scrapeGroupWithAPI(
    accountId: number,
    groupLink: string,
    maxPages: number = 10,
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      this.logger.log(
        `Starting API-based group scrape for account ${accountId}, group: ${groupLink}`,
      );

      // Get API instance (will auto-load from credentials if needed)
      const api = await this.getAPI(accountId);
      if (!api) {
        return {
          success: false,
          error: 'No active session found. Please login first.',
        };
      }

      // Get group info and members from link
      // Use getGroupLinkInfo - memberPage indicates WHICH page (1, 2, 3...), not how many
      this.logger.log(`Fetching group info from link: ${groupLink}`);

      // Fetch page 1 first
      const groupLinkInfo = await api.getGroupLinkInfo({
        link: groupLink,
        memberPage: 1, // Start with page 1
      });

      this.logger.log(`==== GROUP LINK INFO (Page 1) ====`);
      this.logger.log(JSON.stringify(groupLinkInfo, null, 2));
      this.logger.log(`==================================`);

      if (!groupLinkInfo || !groupLinkInfo.groupId) {
        return {
          success: false,
          error: 'Failed to get group info from link',
        };
      }

      const groupId = groupLinkInfo.groupId;
      const groupName = groupLinkInfo.name || '';
      const totalMembers = groupLinkInfo.totalMember || 0;

      // Collect members from page 1
      let currentMems = [...(groupLinkInfo.currentMems || [])];
      this.logger.log(`Page 1: Found ${currentMems.length} members`);

      // Fetch additional pages if needed
      if (groupLinkInfo.hasMoreMember && maxPages > 1) {
        this.logger.log(`hasMoreMember=1, fetching more pages (up to ${maxPages} pages)...`);

        for (let page = 2; page <= maxPages; page++) {
          try {
            this.logger.log(`Fetching page ${page}...`);
            const pageInfo = await api.getGroupLinkInfo({
              link: groupLink,
              memberPage: page,
            });

            const pageMembers = pageInfo.currentMems || [];
            this.logger.log(`Page ${page}: ${pageMembers.length} members`);

            if (pageMembers.length === 0) {
              this.logger.log(`No members on page ${page}, stopping`);
              break;
            }

            currentMems.push(...pageMembers);

            if (!pageInfo.hasMoreMember) {
              this.logger.log(`hasMoreMember=0, stopping`);
              break;
            }

            if (currentMems.length >= totalMembers) {
              this.logger.log(`Collected all ${totalMembers} members`);
              break;
            }
          } catch (err) {
            this.logger.warn(`Page ${page} error: ${err.message}`);
            break;
          }
        }
      }

      this.logger.log(`Total collected: ${currentMems.length}/${totalMembers} members`);

      // Try multiple methods to get group members
      let allMembers: any[] = [];

      // Use whichever method returned more members
      const finalMembers = allMembers.length > 0 ? allMembers : currentMems;

      // Transform to standard format
      const members = finalMembers.map((member: any) => ({
        userId: member.id || member.userId,
        displayName: member.dName || member.displayName || member.zaloName,
        zaloName: member.zaloName,
        avatar: member.avatar,
        accountStatus: member.accountStatus,
        type: member.type,
      }));

      // Save to database
      try {
        this.logger.log(`Saving group and members to database...`);

        // Find or create ZaloGroup record
        let zaloGroup = await this.zaloGroupRepository.findOne({
          where: {
            zaloAccountId: accountId,
            groupId: groupId,
          },
        });

        if (zaloGroup) {
          // Update existing group
          zaloGroup.groupName = groupName;
          zaloGroup.groupLink = groupLink;
          zaloGroup.memberCount = totalMembers;
          zaloGroup.lastScrapedAt = new Date();
          await this.zaloGroupRepository.save(zaloGroup);
          this.logger.log(`Updated existing group record: ${groupName}`);
        } else {
          // Create new group
          zaloGroup = this.zaloGroupRepository.create({
            zaloAccountId: accountId,
            groupId: groupId,
            groupName: groupName,
            groupLink: groupLink,
            memberCount: totalMembers,
            isJoined: false,
            lastScrapedAt: new Date(),
          });
          await this.zaloGroupRepository.save(zaloGroup);
          this.logger.log(`Created new group record: ${groupName}`);
        }

        // Upsert members: update existing, insert new
        if (members.length > 0) {
          this.logger.log(`Upserting ${members.length} members (update existing, insert new)...`);

          let updatedCount = 0;
          let insertedCount = 0;

          // Process in batches to avoid memory issues
          const batchSize = 100;
          for (let i = 0; i < members.length; i += batchSize) {
            const batch = members.slice(i, i + batchSize);

            for (const member of batch) {
              // Check if member already exists
              const existingMember = await this.zaloGroupMemberRepository.findOne({
                where: {
                  groupId: zaloGroup.id,
                  zaloId: member.userId,
                },
              });

              if (existingMember) {
                // Update existing member (keep phone number if already exists)
                existingMember.displayName = member.displayName;
                existingMember.avatarUrl = member.avatar;
                existingMember.scrapedAt = new Date();
                // Note: phoneNumber is NOT updated here - we keep the old value
                await this.zaloGroupMemberRepository.save(existingMember);
                updatedCount++;
              } else {
                // Insert new member
                const newMember = this.zaloGroupMemberRepository.create({
                  groupId: zaloGroup.id,
                  zaloId: member.userId,
                  displayName: member.displayName,
                  avatarUrl: member.avatar,
                  role: MemberRole.MEMBER,
                  scrapedAt: new Date(),
                });
                await this.zaloGroupMemberRepository.save(newMember);
                insertedCount++;
              }
            }

            this.logger.log(
              `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(members.length / batchSize)}`,
            );
          }

          this.logger.log(`Upsert completed: ${updatedCount} updated, ${insertedCount} new members`);
        
        }
      } catch (dbError) {
        this.logger.error(`Database save error: ${dbError.message}`);
        this.logger.error(dbError.stack);
        // Continue execution - don't fail the whole scrape if DB save fails
      }

      return {
        success: true,
        data: {
          group: {
            groupId: groupId,
            groupName: groupName,
            totalMembers: totalMembers,
            description: groupLinkInfo.desc || '',
            avatar: groupLinkInfo.fullAvt || groupLinkInfo.avt || '',
            creatorId: groupLinkInfo.creatorId || '',
            adminIds: groupLinkInfo.adminIds || [],
          },
          members: members,
          total: members.length,
          hasMore: groupLinkInfo.hasMoreMember === 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `API-based group scrape failed: ${error.message}`,
      );
      this.logger.error(error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
