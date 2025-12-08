import * as fs from 'fs/promises';
import * as path from 'path';
import { chromium, BrowserContext } from 'playwright';

// Import zca-js
const ZCA = require('zca-js');

interface ZaloSession {
  cookies: string;
  imei: string;
  userAgent: string;
}

interface Credentials {
  imei: string;
  cookie: any[];
  userAgent: string;
  language?: string;
}

export interface LoginResult {
  success: boolean;
  qrCode?: string;
  data?: any;
  error?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  sentAt?: Date;
  error?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    groupId: string;
    groupName: string;
    members: Array<{
      userId: string;
      displayName: string;
      avatar?: string;
      role?: string;
    }>;
    total: number;
  };
  error?: string;
}

export class ZaloClient {
  private readonly sessionsPath: string;
  private readonly profilesPath: string;
  private apiInstances: Map<number, any> = new Map();
  private loginSessions: Map<number, any> = new Map();
  private db: any;

  constructor(
    sessionsPath: string = './data/sessions',
    profilesPath: string = './data/browser_profiles',
    db?: any,
  ) {
    this.sessionsPath = sessionsPath;
    this.profilesPath = profilesPath;
    this.db = db;
  }

  /**
   * Get session file path
   */
  private getSessionFilePath(accountId: number): string {
    return path.join(this.sessionsPath, `${accountId}.json`);
  }

  /**
   * Get browser profile path
   */
  private getProfilePath(accountId: number): string {
    return path.join(this.profilesPath, `zalo_${accountId}`);
  }

  /**
   * Save session to file
   */
  private async saveSession(accountId: number, session: ZaloSession): Promise<void> {
    const filePath = this.getSessionFilePath(accountId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    console.log(`✅ Session saved for account ${accountId}`);
  }

  /**
   * Load session from file
   */
  private async loadSession(accountId: number): Promise<ZaloSession | null> {
    try {
      const filePath = this.getSessionFilePath(accountId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup session files when deleting account
   */
  async cleanupSession(accountId: number): Promise<void> {
    try {
      // Remove session file
      const sessionPath = this.getSessionFilePath(accountId);
      await fs.unlink(sessionPath).catch(() => {});

      // Remove browser profile directory
      const profilePath = this.getProfilePath(accountId);
      await fs.rm(profilePath, { recursive: true, force: true }).catch(() => {});

      // Remove from memory caches
      this.apiInstances.delete(accountId);
      this.loginSessions.delete(accountId);

      console.log(`🧹 Cleaned up session files for account ${accountId}`);
    } catch (error) {
      console.error(`Failed to cleanup session for account ${accountId}:`, error);
    }
  }

  /**
   * Load credentials from file (new format for zca-js Zalo.login)
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
   * Save credentials to file (new format for zca-js Zalo.login)
   */
  private async saveCredentials(accountId: number, credentials: Credentials): Promise<void> {
    const filePath = this.getSessionFilePath(accountId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(credentials, null, 2));
    console.log(`✅ Credentials saved for account ${accountId}`);
  }

  /**
   * Get or restore API instance
   */
  async getAPI(accountId: number): Promise<any> {
    // Check if API instance exists
    if (this.apiInstances.has(accountId)) {
      const api = this.apiInstances.get(accountId);

      // Verify it's still valid
      try {
        await api.getOwnId();
        return api;
      } catch (error) {
        console.warn(`⚠️  Cached API instance invalid for account ${accountId}, reloading...`);
        this.apiInstances.delete(accountId);
        // Continue to restore from credentials
      }
    }

    // Try to restore from credentials (new format)
    const credentials = await this.loadCredentials(accountId);
    if (!credentials) {
      throw new Error(`No session found for account ${accountId}. Please login first.`);
    }

    // Validate credentials have required fields
    if (!credentials.cookie || !Array.isArray(credentials.cookie) || credentials.cookie.length === 0) {
      console.error(`❌ Invalid credentials for account ${accountId}:`, credentials);
      throw new Error(`Session expired or invalid for account ${accountId}. Please login again.`);
    }

    // Create API instance with correct format
    // ZCA.API expects (cookie: any[], imei: string, userAgent: string)
    try {
      const api = new ZCA.API(credentials.cookie, credentials.imei, credentials.userAgent);

      // Verify session is still valid
      await api.getOwnId();
      this.apiInstances.set(accountId, api);

      console.log(`✅ API instance restored for account ${accountId}`);
      return api;
    } catch (error: any) {
      console.error(`❌ Failed to create API instance for account ${accountId}:`, error.message);

      // Update account status to inactive
      this.db.updateAccountStatus(accountId, 'inactive');

      throw new Error(`Session expired for account ${accountId}. Please login again.`);
    }
  }

  /**
   * Login with QR code using ZCA-JS (similar to backend service)
   */
  async login(accountId: number): Promise<LoginResult> {
    try {
      console.log(`[LOGIN] Starting login for account ${accountId}`);

      // Check if credentials exist (already logged in before)
      const existingCredentials = await this.loadCredentials(accountId);
      console.log(`[LOGIN] Existing credentials:`, existingCredentials ? 'Found' : 'Not found');

      if (existingCredentials) {
        console.log(`Found existing credentials for account ${accountId}, attempting to restore session`);

        try {
          const zalo = new ZCA.Zalo({});
          const api = await zalo.login(existingCredentials);

          // Verify session by getting user info
          const userInfo = await api.fetchAccountInfo();

          // Session is valid, save API instance
          this.apiInstances.set(accountId, api);

          console.log(`✅ Session restored successfully for account ${accountId}: ${userInfo.profile.displayName}`);

          return {
            success: true,
            qrCode: undefined,
            data: {
              displayName: userInfo.profile.displayName,
              zaloId: userInfo.profile.userId,
              avatar: userInfo.profile.avatar,
              restored: true,
            },
          };
        } catch (error: any) {
          console.warn(`Failed to restore session for account ${accountId}: ${error.message}, will create new login`);
          // Continue to QR login
        }
      }

      console.log(`Starting new ZCA QR login for account ${accountId}`);

      // Initialize session
      this.loginSessions.set(accountId, {
        status: 'waiting',
        message: 'Initializing QR code...',
      });

      const zalo = new ZCA.Zalo({});
      const qrPath = path.join(this.sessionsPath, `zalo_${accountId}_qr.png`);

      // Create directory if not exists
      await fs.mkdir(path.dirname(qrPath), { recursive: true });

      // Start login in background (don't await - let it run async!)
      zalo.loginQR(
        {
          qrPath, // Save QR code as image
        },
        async (event: any) => {
          console.log(`QR Login Event Type: ${event.type}`);

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

              console.log(`QR code generated and converted to base64 for account ${accountId}`);
            } catch (error: any) {
              console.error(`Failed to read QR code image: ${error.message}`);
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
      ).then(async (api: any) => {
        // This runs when login completes (after user scans QR)
        console.log(`✅ QR Login completed for account ${accountId}`);

        // Save API instance
        this.apiInstances.set(accountId, api);

        try {
          // Get user info using fetchAccountInfo()
          const userInfo = await api.fetchAccountInfo();
          console.log(`User info fetched: ${JSON.stringify(userInfo)}`);

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

          // Update session
          this.loginSessions.set(accountId, {
            status: 'success',
            message: 'Login successful!',
            data: {
              displayName: userInfo.profile.displayName,
              zaloId: userInfo.profile.userId,
              avatar: userInfo.profile.avatar,
            },
          });

          console.log(`✅ Login successful for account ${accountId}: ${userInfo.profile.displayName}`);

          // Clean up QR image
          try {
            await fs.unlink(qrPath);
          } catch (error) {
            // Ignore cleanup errors
          }
        } catch (error: any) {
          console.error(`Failed to complete login: ${error.message}`);
          this.loginSessions.set(accountId, {
            status: 'error',
            message: `Login failed: ${error.message}`,
          });
        }
      }).catch((error: any) => {
        console.error(`Login QR failed: ${error.message}`);
        this.loginSessions.set(accountId, {
          status: 'error',
          message: `Login failed: ${error.message}`,
        });
      });

      // Wait a bit for QR code to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Return immediately with waiting status
      const currentSession = this.loginSessions.get(accountId);
      return {
        success: true,
        qrCode: currentSession?.qrCodeImage,
        data: {
          message: 'QR code generation in progress',
        },
      };
    } catch (error: any) {
      console.error(`❌ ZCA Login failed: ${error.message}`);

      this.loginSessions.set(accountId, {
        status: 'error',
        message: `Login failed: ${error.message}`,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current login status (for polling)
   */
  getLoginStatus(accountId: number): {
    success: boolean;
    status: string;
    qrCodeImage?: string;
    message?: string;
    data?: any;
  } {
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
   * Login using browser automation - simplified like backend service
   */
  async loginWithBrowser(accountId: number): Promise<LoginResult> {
    let browser: BrowserContext | null = null;

    try {
      console.log(`🌐 Opening browser for Zalo login (account ${accountId})...`);

      // Launch browser (must be visible for QR scan)
      browser = await chromium.launchPersistentContext(
        this.getProfilePath(accountId),
        {
          headless: false,
          viewport: { width: 1280, height: 720 },
          locale: 'vi-VN',
        }
      );

      // Use the default page
      const pages = browser.pages();
      const page = pages[0];

      await page.goto('https://chat.zalo.me', { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for QR code OR already logged in
      console.log('⏳ Waiting for login...');
      try {
        await page.waitForSelector('.qr-code, .conversation-list, [class*="conversation"]', {
          timeout: 10000,
        });

        // Check if already logged in
        const isLoggedIn = await page.isVisible('.conversation-list, [class*="conversation"]').catch(() => false);

        if (isLoggedIn) {
          console.log('✅ Already logged in, extracting session...');
          return await this.extractAndSaveSession(accountId, browser, page);
        }

        // Not logged in - wait for user to scan QR (max 120 seconds)
        console.log('📱 Please scan QR code on the browser...');
        await page.waitForSelector('.conversation-list, [class*="conversation"]', {
          timeout: 120000, // 2 minutes
        });

        console.log('✅ Login successful, extracting session...');
        return await this.extractAndSaveSession(accountId, browser, page);
      } catch (error) {
        await browser.close();
        return {
          success: false,
          error: 'Login timeout - QR code was not scanned within 2 minutes',
        };
      }
    } catch (error: any) {
      if (browser) {
        await browser.close();
      }
      console.error('❌ Login failed:', error);
      return {
        success: false,
        error: `Browser login failed: ${error.message}`,
      };
    }
  }

  /**
   * Extract session from logged-in browser and save
   */
  private async extractAndSaveSession(
    accountId: number,
    browser: BrowserContext,
    page: any,
  ): Promise<LoginResult> {
    try {
      // Get cookies
      const cookies = await browser.cookies();
      const cookieString = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

      // Get user agent
      const userAgent = await page.evaluate(() => navigator.userAgent);

      // Save session
      const zaloSession: ZaloSession = {
        cookies: cookieString,
        imei: '',
        userAgent,
      };
      await this.saveSession(accountId, zaloSession);

      // Create API instance
      const api = new ZCA.API(cookieString, '', userAgent);
      const ownId = await api.getOwnId();

      if (ownId) {
        this.apiInstances.set(accountId, api);
        const accountInfo = await api.fetchAccountInfo();

        await browser.close();

        return {
          success: true,
          data: {
            zaloId: ownId,
            displayName: accountInfo.displayName || accountInfo.zaloName,
            avatar: accountInfo.avatar,
            message: 'Login successful',
          },
        };
      }

      await browser.close();
      return {
        success: false,
        error: 'Failed to get account info',
      };
    } catch (error: any) {
      await browser.close();
      return {
        success: false,
        error: `Session extraction failed: ${error.message}`,
      };
    }
  }

  /**
   * Check login status (polling for QR scan completion)
   */
  async checkLoginStatus(accountId: number): Promise<LoginResult> {
    const session = this.loginSessions.get(accountId);
    if (!session) {
      return {
        success: false,
        error: 'No pending login session',
      };
    }

    try {
      // Check if this is a browser-based login
      if (session.browser && session.page) {
        // Check if user has logged in on browser
        const isLoggedIn = await session.page.evaluate(() => {
          return document.querySelector('[data-translate-inner="STR_PROFILE"]') !== null;
        });

        if (!isLoggedIn) {
          return {
            success: false,
            data: { message: 'QR code not scanned yet' },
          };
        }

        // Login successful, extract cookies
        const cookies = await session.browser.cookies();
        const cookieString = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
        const userAgent = await session.page.evaluate(() => navigator.userAgent);

        // Save session
        const zaloSession: ZaloSession = {
          cookies: cookieString,
          imei: '',
          userAgent,
        };
        await this.saveSession(accountId, zaloSession);

        // Create API instance
        const api = new ZCA.API(cookieString, '', userAgent);
        const ownId = await api.getOwnId();

        if (ownId) {
          this.apiInstances.set(accountId, api);
          const accountInfo = await api.fetchAccountInfo();

          // Close browser
          await session.browser.close();

          // Clean up login session
          this.loginSessions.delete(accountId);

          return {
            success: true,
            data: {
              zaloId: ownId,
              displayName: accountInfo.displayName || accountInfo.zaloName,
              avatar: accountInfo.avatar,
              message: 'Login successful',
            },
          };
        }
      }

      // Legacy ZCA-based login check
      if (session.api) {
        const ownId = await session.api.getOwnId();
        if (!ownId) {
          return {
            success: false,
            data: { message: 'QR code not scanned yet' },
          };
        }

        // Login successful, get account info
        const accountInfo = await session.api.fetchAccountInfo();

        // Get session data
        const cookies = session.api.getCookies();
        const zaloSession: ZaloSession = {
          cookies: cookies,
          imei: session.api.getImei(),
          userAgent: session.api.getUserAgent(),
        };

        // Save session
        await this.saveSession(accountId, zaloSession);

        // Store API instance
        this.apiInstances.set(accountId, session.api);

        // Clean up login session
        this.loginSessions.delete(accountId);

        return {
          success: true,
          data: {
            zaloId: ownId,
            displayName: accountInfo.displayName || accountInfo.zaloName,
            avatar: accountInfo.avatar,
            phoneNumber: accountInfo.phoneNumber,
            message: 'Login successful',
          },
        };
      }

      return {
        success: false,
        error: 'Invalid login session',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete login after QR scan (polling)
   */
  async completeLogin(accountId: number): Promise<LoginResult> {
    const session = this.loginSessions.get(accountId);
    if (!session) {
      return {
        success: false,
        error: 'No pending login session',
      };
    }

    try {
      const ownId = await session.api.getOwnId();
      if (!ownId) {
        return {
          success: false,
          data: { message: 'QR code not scanned yet' },
        };
      }

      // Get credentials in new format (Credentials)
      const credentials: Credentials = {
        cookie: session.api.getCookies(), // This returns array
        imei: session.api.getImei(),
        userAgent: session.api.getUserAgent(),
        language: 'vi',
      };

      // Save credentials (new format)
      await this.saveCredentials(accountId, credentials);

      // Store API instance
      this.apiInstances.set(accountId, session.api);

      // Clean up login session
      this.loginSessions.delete(accountId);

      console.log(`✅ Login completed successfully for account ${accountId}`);

      return {
        success: true,
        data: { zaloId: ownId, message: 'Login successful' },
      };
    } catch (error: any) {
      console.error(`❌ Complete login failed for account ${accountId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(accountId: number): Promise<any> {
    const api = await this.getAPI(accountId);
    const accountInfo = await api.fetchAccountInfo();

    return {
      profile: accountInfo.profile,
      setting: accountInfo.setting,
    };
  }

  /**
   * Send message to user
   */
  async sendMessage(
    accountId: number,
    userId: string,
    message: string,
    isGroup: boolean = false,
  ): Promise<SendMessageResult> {
    try {
      const api = await this.getAPI(accountId);
      // ThreadType: 0 = User, 1 = Group
      const threadType = isGroup ? 1 : 0;
      const result = await api.sendMessage(message, userId, threadType);

      return {
        success: true,
        messageId: result.message?.msgId || result.data?.msgId,
        sentAt: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send image from URL to user or group
   */
  async sendImageMessage(
    accountId: number,
    userId: string,
    imageUrl: string,
    isGroup: boolean = false,
  ): Promise<SendMessageResult> {
    try {
      const api = await this.getAPI(accountId);

      // ThreadType: 0 = User, 1 = Group
      const threadType = isGroup ? 1 : 0;

      // Use zca-js sendImageUrl method to send image from URL
      // The API will download and upload the image automatically
      const result = await api.sendImageUrl(imageUrl, userId, 0, 0, threadType);

      return {
        success: true,
        messageId: result.message?.msgId || result.data?.msgId,
        sentAt: new Date(),
      };
    } catch (error: any) {
      console.error(`Failed to send image to ${userId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(accountId: number, userId: string, message?: string): Promise<any> {
    const api = await this.getAPI(accountId);
    const msg = message || 'Xin chào, tôi muốn kết bạn với bạn!';
    const result = await api.sendFriendRequest(msg, userId);
    return result;
  }

  /**
   * Find user by phone number
   */
  async findUser(accountId: number, phoneNumber: string): Promise<any> {
    const api = await this.getAPI(accountId);
    const result = await api.findUser(phoneNumber);
    return result;
  }

  /**
   * Get user information by user ID
   */
  async getUserInfo(accountId: number, userId: string | string[]): Promise<any> {
    try {
      const api = await this.getAPI(accountId);
      if (!api) {
        return {
          success: false,
          error: 'No active session found',
        };
      }

      // Call getUserInfo API
      const response = await api.getUserInfo(userId);

      // Response format: { changed_profiles: { [userId]: ProfileInfo }, unchanged_profiles: {...} }
      const profiles = response.changed_profiles || {};

      // If single userId, return single profile
      if (typeof userId === 'string') {
        const profile = profiles[userId];
        if (!profile) {
          return {
            success: false,
            error: 'User not found',
          };
        }
        return {
          success: true,
          data: profile,
        };
      }

      // If array of userIds, return all profiles
      return {
        success: true,
        data: profiles,
      };
    } catch (error: any) {
      console.error(`❌ Failed to get user info: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get list of groups that user has joined from Zalo API
   */
  async getJoinedGroups(accountId: number): Promise<any> {
    try {
      console.log(`📥 Fetching joined groups for account ${accountId}...`);

      const api = await this.getAPI(accountId);
      if (!api) {
        return {
          success: false,
          error: 'No active session found',
        };
      }

      // Use getAllGroups to get list of group IDs
      const allGroupsResponse = await api.getAllGroups();
      console.log(`📊 getAllGroups response:`, JSON.stringify(allGroupsResponse, null, 2));

      const groupIds = Object.keys(allGroupsResponse.gridVerMap || {});
      console.log(`✅ Found ${groupIds.length} group IDs`);

      if (groupIds.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Fetch detailed info for each group
      const groupsDetails = [];
      for (const groupId of groupIds) {
        try {
          const response = await api.getGroupInfo(groupId);

          // Parse response structure: { gridInfoMap: { [groupId]: groupData } }
          const groupData = response.gridInfoMap?.[groupId];

          if (!groupData) {
            console.warn(`⚠️  No data found for group ${groupId}`);
            continue;
          }

          groupsDetails.push({
            groupId: groupData.groupId || groupId,
            groupName: groupData.name || 'Unknown Group',
            avatar: groupData.avt || groupData.fullAvt,
            memberCount: groupData.totalMember || 0,
          });

          // Log first group for debugging
          if (groupsDetails.length === 1) {
            console.log(`📊 First group parsed:`, {
              groupId: groupData.groupId,
              name: groupData.name,
              members: groupData.totalMember,
            });
          }
        } catch (err: any) {
          console.warn(`⚠️  Failed to get info for group ${groupId}:`, err.message);
        }
      }

      console.log(`✅ Successfully loaded ${groupsDetails.length} groups with details`);

      return {
        success: true,
        data: groupsDetails,
      };
    } catch (error: any) {
      console.error(`❌ Failed to get joined groups: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Load group members with roles from existing joined group
   */
  async loadGroupMembersWithRoles(accountId: number, groupId: string): Promise<any> {
    try {
      console.log(`📥 Loading members for group ${groupId}...`);

      const api = await this.getAPI(accountId);
      if (!api) {
        return {
          success: false,
          error: 'No active session found',
        };
      }

      // Get group info to extract creator, admin IDs, and member list
      const groupInfoResponse = await api.getGroupInfo(groupId);
      const groupData = groupInfoResponse.gridInfoMap?.[groupId];

      if (!groupData) {
        return {
          success: false,
          error: 'Group not found',
        };
      }

      const creatorId = groupData.creatorId;
      const adminIds = groupData.adminIds || [];
      const memVerList = groupData.memVerList || [];

      console.log(`🔍 Group roles - Owner: ${creatorId}, Admins: ${adminIds.join(', ') || 'None'}`);
      console.log(`📋 Found ${memVerList.length} members in memVerList`);

      // Extract user IDs from memVerList (format: "userId_version")
      const memberIds = memVerList.map((memVer: string) => memVer.split('_')[0]);

      if (memberIds.length === 0) {
        return {
          success: false,
          error: 'No members found in group',
        };
      }

      // Get member profiles using getGroupMembersInfo with member IDs
      console.log(`🔄 Fetching profiles for ${memberIds.length} members...`);
      const membersInfoResponse = await api.getGroupMembersInfo(memberIds);

      // Parse response: { profiles: { [memberId]: ProfileData }, unchangeds_profile: [...] }
      const profiles = membersInfoResponse.profiles || {};
      const unchangedProfiles = membersInfoResponse.unchangeds_profile || [];

      console.log(`📊 Got ${Object.keys(profiles).length} profiles, ${unchangedProfiles.length} unchanged`);

      // Map members with roles
      const membersWithRoles = memberIds.map((memberId: string) => {
        const profile = profiles[memberId];
        let role = 'MEMBER';

        if (memberId === creatorId) {
          role = 'OWNER';
        } else if (adminIds.includes(memberId)) {
          role = 'ADMIN';
        }

        return {
          userId: memberId,
          displayName: profile?.displayName || profile?.zaloName || 'Unknown',
          avatar: profile?.avatar || '',
          role: role,
        };
      });

      console.log(`✅ Loaded ${membersWithRoles.length} members with roles`);

      // Save to database for caching
      if (this.db) {
        try {
          this.db.upsertGroup({
            accountId,
            groupId,
            groupName: groupData.name,
            memberCount: groupData.totalMember,
            scrapedAt: new Date().toISOString(),
            synced: 0,
          });

          const memberRecords = membersWithRoles.map((member: any) => ({
            accountId,
            groupId,
            userId: member.userId,
            displayName: member.displayName,
            avatar: member.avatar,
            role: member.role,
            synced: 0,
          }));
          this.db.insertGroupMembers(memberRecords);
          console.log(`💾 Saved ${memberRecords.length} members to database`);
        } catch (dbError) {
          console.warn('⚠️  Failed to save to DB:', dbError);
        }
      }

      return {
        success: true,
        data: membersWithRoles,
      };
    } catch (error: any) {
      console.error(`❌ Failed to load group members: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Scrape group members using zca-js API (faster and more reliable than browser automation)
   * Based on backend-nestjs implementation
   */
  async scrapeGroup(
    accountId: number,
    groupLink: string,
    maxPages?: number, // Optional - undefined = fetch ALL pages
  ): Promise<ScrapeResult> {
    try {
      console.log(`🚀 Starting API-based group scrape for account ${accountId}, group: ${groupLink}`);

      // Get API instance
      const api = await this.getAPI(accountId);
      if (!api) {
        return {
          success: false,
          error: 'No active session found. Please login first.',
        };
      }

      // Fetch page 1 first
      console.log(`📥 Fetching group info from link (page 1)...`);
      const groupLinkInfo = await api.getGroupLinkInfo({
        link: groupLink,
        memberPage: 1,
      });

      console.log(`📊 Group info (page 1):`, JSON.stringify(groupLinkInfo, null, 2));

      if (!groupLinkInfo || !groupLinkInfo.groupId) {
        return {
          success: false,
          error: 'Failed to get group info from link. Link may be invalid or private.',
        };
      }

      const groupId = groupLinkInfo.groupId;
      const groupName = groupLinkInfo.name || 'Unknown Group';
      const totalMembers = groupLinkInfo.totalMember || 0;

      // Collect members from page 1
      let allMembers = [...(groupLinkInfo.currentMems || [])];
      console.log(`✅ Page 1: Found ${allMembers.length}/${totalMembers} members`);

      // Fetch ALL pages until no more members (unless maxPages is specified)
      if (groupLinkInfo.hasMoreMember) {
        console.log(`📄 Fetching all remaining pages...`);
        let page = 2;

        while (true) {
          // Stop if maxPages limit reached
          if (maxPages && page > maxPages) {
            console.log(`⏹️  Reached maxPages limit (${maxPages}), stopping`);
            break;
          }
          try {
            console.log(`📥 Fetching page ${page}...`);
            const pageInfo = await api.getGroupLinkInfo({
              link: groupLink,
              memberPage: page,
            });

            const pageMembers = pageInfo.currentMems || [];
            console.log(`✅ Page ${page}: ${pageMembers.length} members (Total: ${allMembers.length + pageMembers.length}/${totalMembers})`);

            if (pageMembers.length === 0) {
              console.log(`⏹️  No members on page ${page}, stopping`);
              break;
            }

            allMembers.push(...pageMembers);

            if (!pageInfo.hasMoreMember) {
              console.log(`✅ No more pages, completed at page ${page}`);
              break;
            }

            if (allMembers.length >= totalMembers) {
              console.log(`✅ Collected all ${totalMembers} members`);
              break;
            }

            // Small delay between pages to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
            page++;
          } catch (err: any) {
            console.warn(`⚠️  Page ${page} error: ${err.message}`);
            break;
          }
        }
      }

      console.log(`✅ Total collected: ${allMembers.length}/${totalMembers} members`);

      // Get ACCURATE creator and admin IDs from getGroupInfo (more reliable than getGroupLinkInfo)
      console.log(`🔄 Fetching accurate group role info from getGroupInfo...`);
      let creatorId = groupLinkInfo.creatorId;
      let adminIds = groupLinkInfo.adminIds || [];

      try {
        const groupInfoResponse = await api.getGroupInfo(groupId);
        const groupData = groupInfoResponse.gridInfoMap?.[groupId];

        if (groupData) {
          creatorId = groupData.creatorId;
          adminIds = groupData.adminIds || [];
          console.log(`✅ Got accurate role info from getGroupInfo`);
        } else {
          console.log(`⚠️  getGroupInfo failed, using getGroupLinkInfo data`);
        }
      } catch (err) {
        console.warn(`⚠️  Failed to get group info, using getGroupLinkInfo data:`, err);
      }

      console.log(`\n🔍 Group Roles:`);
      console.log(`   Trưởng nhóm (OWNER): ${creatorId}`);
      console.log(`   Phó nhóm (ADMIN): ${adminIds.length > 0 ? adminIds.join(', ') : 'Không có'}`);

      // LOG RAW DATA - Debug member structure
      console.log('\n🔍 ===== RAW MEMBER DATA (first 5 members) =====');
      allMembers.slice(0, 5).forEach((member: any, index: number) => {
        console.log(`\nMember ${index + 1}:`, JSON.stringify(member, null, 2));
      });
      console.log('🔍 ===== END RAW MEMBER DATA =====\n');

      // Transform to standard format
      // Role detection based on creatorId and adminIds
      const members = allMembers.map((member: any, index: number) => {
        const memberId = member.id || member.userId;
        let role = 'MEMBER';

        // Check if creator (OWNER)
        if (memberId === creatorId) {
          role = 'OWNER';
        }
        // Check if in admin list (ADMIN)
        else if (adminIds.includes(memberId)) {
          role = 'ADMIN';
        }

        const transformed = {
          userId: memberId,
          displayName: member.dName || member.displayName || member.zaloName || 'Unknown',
          avatar: member.avatar,
          role: role,
        };

        // Log role mapping for debugging
        if (index < 5) {
          console.log(`Member ${index + 1} role mapping: id=${memberId} → role=${role} (${member.dName})`);
        }

        return transformed;
      });

      // Save to local database
      if (this.db) {
        try {
          console.log(`💾 Saving ${members.length} members to local database...`);

          // Save group info
          this.db.upsertGroup({
            accountId,
            groupId,
            groupName,
            memberCount: totalMembers,
            scrapedAt: new Date().toISOString(),
            synced: 0,
          });

          // Save members (batch processing)
          const memberRecords = members.map((member: any) => ({
            accountId,
            groupId,
            userId: member.userId,
            displayName: member.displayName,
            avatar: member.avatar,
            role: member.role,
            synced: 0,
          }));
          this.db.insertGroupMembers(memberRecords);

          console.log(`✅ Saved to database successfully`);
        } catch (dbError: any) {
          console.error(`⚠️  Database save error: ${dbError.message}`);
          // Continue execution - don't fail the whole scrape if DB save fails
        }
      }

      return {
        success: true,
        data: {
          groupId,
          groupName,
          members,
          total: members.length,
        },
      };
    } catch (error: any) {
      console.error(`❌ API-based group scrape failed: ${error.message}`);
      console.error(error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Merge account: Move credentials and API instance from newAccountId to existingAccountId
   * Used when user re-login with same Zalo account
   */
  async mergeAccount(newAccountId: number, existingAccountId: number): Promise<void> {
    console.log(`🔄 Merging account ${newAccountId} → ${existingAccountId}`);

    // Move API instance if exists
    const newApi = this.apiInstances.get(newAccountId);
    if (newApi) {
      this.apiInstances.set(existingAccountId, newApi);
      this.apiInstances.delete(newAccountId);
    }

    // Move login session if exists
    const newSession = this.loginSessions.get(newAccountId);
    if (newSession) {
      this.loginSessions.set(existingAccountId, newSession);
      this.loginSessions.delete(newAccountId);
    }

    // Move credentials file
    try {
      const oldFilePath = this.getSessionFilePath(newAccountId);
      const newFilePath = this.getSessionFilePath(existingAccountId);

      // Check if new credentials exist
      try {
        await fs.access(oldFilePath);
        // Move/rename the file
        await fs.rename(oldFilePath, newFilePath);
        console.log(`✅ Credentials moved: ${newAccountId} → ${existingAccountId}`);
      } catch (error) {
        // Old file doesn't exist, no need to move
        console.log(`ℹ️  No credentials file to move for ${newAccountId}`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Failed to move credentials: ${error.message}`);
    }

    // Clean up QR code if exists
    try {
      const qrPath = path.join(this.sessionsPath, `zalo_${newAccountId}_qr.png`);
      await fs.unlink(qrPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    console.log(`✅ Account merge completed: ${newAccountId} → ${existingAccountId}`);
  }

  /**
   * Cancel pending login session
   */
  async cancelLogin(accountId: number): Promise<void> {
    console.log(`🚫 Canceling login for account ${accountId}...`);

    const session = this.loginSessions.get(accountId);
    if (session) {
      // Close browser if exists
      if (session.browser) {
        try {
          await session.browser.close();
          console.log(`✅ Browser closed for account ${accountId}`);
        } catch (error) {
          console.warn(`⚠️  Failed to close browser: ${error}`);
        }
      }

      // Remove login session from memory
      this.loginSessions.delete(accountId);
      console.log(`✅ Login session removed for account ${accountId}`);
    } else {
      console.log(`⚠️  No pending login session found for account ${accountId}`);
    }

    // Do NOT create account in database if login was canceled
    // Do NOT delete session file (in case user is resuming an existing account)

    console.log(`✅ Login canceled for account ${accountId}`);
  }

  /**
   * Logout and clear session
   */
  async logout(accountId: number): Promise<void> {
    console.log(`🚪 Logging out account ${accountId}...`);

    // Remove from memory
    this.apiInstances.delete(accountId);
    this.loginSessions.delete(accountId);

    // Delete session file
    try {
      const filePath = this.getSessionFilePath(accountId);
      await fs.unlink(filePath);
      console.log(`✅ Session file deleted for account ${accountId}`);
    } catch (error) {
      console.warn(`⚠️  Session file not found for account ${accountId}`);
    }

    // Update account status in database
    if (this.db) {
      this.db.updateAccountStatus(accountId, 'inactive');
    }

    console.log(`✅ Account ${accountId} logged out successfully`);
  }
}

