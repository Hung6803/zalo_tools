import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { LocalDatabase, CampaignRecord } from './local-db';
import { ZaloClient } from './zalo-client';
import { SyncService } from './sync-service';

// Load environment variables
dotenv.config();

const app = express();

// Helper function to update .env file
function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';

  // Read existing .env file if exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Parse existing content into key-value pairs
  const envLines = envContent.split('\n');
  const envMap: Record<string, string> = {};

  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        envMap[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  // Apply updates
  Object.assign(envMap, updates);

  // Write back to .env file
  const newContent = Object.entries(envMap)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, newContent + '\n', 'utf-8');
  console.log('✅ Updated .env file with new config');
}
const PORT = process.env.WORKER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh hoặc tài liệu!'));
    }
  }
});

// Initialize services
const db = new LocalDatabase('./data/app.db');
const zaloClient = new ZaloClient(undefined, undefined, db);

let syncService: SyncService | null = null;

// Initialize sync service if API key is configured
const hasValidApiKey = process.env.AGENT_API_KEY && process.env.AGENT_API_KEY.trim().length > 0;
const hasValidBackendUrl = process.env.BACKEND_URL && process.env.BACKEND_URL.trim().length > 0;

if (hasValidApiKey && hasValidBackendUrl) {
  syncService = new SyncService(
    process.env.BACKEND_URL!,
    process.env.AGENT_API_KEY!,
    db
  );

  // Validate API key before starting sync
  syncService.validateApiKey().then((isValid) => {
    if (isValid) {
      syncService!.startAutoSync();
      syncService!.startHeartbeat();
      console.log('✅ Sync service initialized with backend:', process.env.BACKEND_URL);
    } else {
      console.warn('⚠️  API key không hợp lệ. Vui lòng đăng nhập lại từ trang Login.');
      console.warn('   Sync service sẽ không hoạt động cho đến khi đăng nhập thành công.');
      // Don't null out syncService - keep it so user can re-login and it will work
    }
  }).catch((err) => {
    console.error('❌ Failed to validate API key:', err.message);
    // Start anyway in case of network issues
    syncService!.startAutoSync();
    syncService!.startHeartbeat();
  });
} else {
  console.warn('⚠️  Sync service disabled. Để bật:');
  console.warn('   1. Vào Settings → Nhập Backend URL');
  console.warn('   2. Đăng nhập để nhận Agent API Key');
  console.warn('   3. Sync sẽ tự động bật sau khi đăng nhập thành công');
}

// ==================== HEALTH ====================

app.get('/health', (req: Request, res: Response) => {
  const stats = db.getStats();
  res.json({
    status: 'ok',
    syncEnabled: syncService !== null,
    database: stats,
    timestamp: new Date(),
  });
});

app.post('/local/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Return relative path for frontend
    const filePath = `/uploads/${req.file.filename}`;

    console.log(`✅ File uploaded: ${req.file.filename} (${(req.file.size / 1024).toFixed(2)}KB)`);

    res.json({
      success: true,
      filePath,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error: any) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ZALO LOGIN ====================

app.post('/local/login', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ success: false, error: 'accountId is required' });
    }

    const result = await zaloClient.login(accountId);

    // Only create account in DB if session was RESTORED (not just QR generated)
    // QR generation does NOT mean login success yet
    if (result.success && result.data?.restored && result.data?.zaloId) {
      console.log(`✅ Session restored for existing account ${accountId}, updating DB...`);
      db.upsertAccount({
        accountId,
        zaloId: result.data.zaloId,
        displayName: result.data.displayName,
        avatar: result.data.avatar,
        status: 'active',
        lastLoginAt: new Date().toISOString(),
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/check-login', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ success: false, error: 'accountId is required' });
    }

    // Get login status (synchronous, no await needed)
    const result = zaloClient.getLoginStatus(accountId);

    if (result.success && result.data) {
      const zaloId = result.data.zaloId;

      // Check if this zaloId already exists in database
      const existingAccount = db.findAccountByZaloId(zaloId);

      if (existingAccount && existingAccount.accountId !== accountId) {
        // This Zalo account already exists with different accountId
        // Merge the data: use old accountId, update credentials
        console.log(`📌 Zalo account ${zaloId} already exists with accountId ${existingAccount.accountId}, merging...`);

        // Move credentials from new accountId to old accountId
        await zaloClient.mergeAccount(accountId, existingAccount.accountId);

        // Update database with old accountId
        db.upsertAccount({
          accountId: existingAccount.accountId,
          zaloId: result.data.zaloId,
          displayName: result.data.displayName,
          avatar: result.data.avatar,
          status: 'active',
          lastLoginAt: new Date().toISOString(),
        });

        // Return with old accountId so frontend knows
        res.json({
          ...result,
          accountId: existingAccount.accountId,
          merged: true,
        });
      } else {
        // New account or same accountId
        db.upsertAccount({
          accountId,
          zaloId: result.data.zaloId,
          displayName: result.data.displayName,
          avatar: result.data.avatar,
          status: 'active',
          lastLoginAt: new Date().toISOString(),
        });

        res.json(result);
      }
    } else {
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/complete-login', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;

    const result = await zaloClient.completeLogin(accountId);

    if (result.success) {
      // Update local DB
      db.upsertAccount({
        accountId,
        zaloId: result.data?.zaloId,
        status: 'active',
        lastLoginAt: new Date().toISOString(),
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/logout', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;

    // Logout handles updating DB status internally
    await zaloClient.logout(accountId);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/cancel-login', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;

    console.log(`🚫 Received cancel login request for account ${accountId}`);
    await zaloClient.cancelLogin(accountId);

    res.json({ success: true, message: 'Login canceled successfully' });
  } catch (error: any) {
    console.error(`❌ Failed to cancel login:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate all active account sessions
app.post('/local/validate-sessions', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Validating all active account sessions...');

    // Get all accounts with status = 'active'
    const allAccounts = db.getAllAccounts() as Array<{
      accountId: number;
      displayName: string;
      status: string;
    }>;
    const activeAccounts = allAccounts.filter(acc => acc.status === 'active');

    console.log(`📋 Found ${activeAccounts.length} active accounts to validate`);

    const validationResults: Array<{
      accountId: number;
      displayName: string;
      isValid: boolean;
      error?: string;
    }> = [];

    // Validate each account
    for (const account of activeAccounts) {
      try {
        // Try to fetch account info to verify session is still valid
        const accountInfo = await zaloClient.getAccountInfo(account.accountId);

        if (accountInfo && accountInfo.profile) {
          // Session is valid
          validationResults.push({
            accountId: account.accountId,
            displayName: account.displayName || 'Unknown',
            isValid: true,
          });
          console.log(`✅ Account ${account.accountId} (${account.displayName}) session is valid`);
        } else {
          throw new Error('No profile data returned');
        }
      } catch (error: any) {
        // Session is invalid - update status to inactive
        db.updateAccountStatus(account.accountId, 'inactive');

        validationResults.push({
          accountId: account.accountId,
          displayName: account.displayName || 'Unknown',
          isValid: false,
          error: error.message,
        });
        console.log(`❌ Account ${account.accountId} (${account.displayName}) session invalid: ${error.message}`);
      }
    }

    const validCount = validationResults.filter(r => r.isValid).length;
    const invalidCount = validationResults.filter(r => !r.isValid).length;

    console.log(`✅ Validation complete: ${validCount} valid, ${invalidCount} invalid`);

    res.json({
      success: true,
      data: {
        total: activeAccounts.length,
        valid: validCount,
        invalid: invalidCount,
        results: validationResults,
      },
    });
  } catch (error: any) {
    console.error('❌ Session validation failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ACCOUNT INFO ====================

app.get('/local/account-info/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    const accountInfo = await zaloClient.getAccountInfo(accountId);

    res.json({ success: true, data: accountInfo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SEND MESSAGE ====================

app.post('/local/send-message', async (req: Request, res: Response) => {
  try {
    const { accountId, userId, message, imageUrl, isGroup } = req.body;

    if (!accountId || !userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'accountId, userId, and message are required',
      });
    }

    // Send image first if imageUrl is provided
    if (imageUrl) {
      console.log(`📸 Sending image to ${userId}: ${imageUrl}`);
      const imageResult = await zaloClient.sendImageMessage(accountId, userId, imageUrl, isGroup);

      if (!imageResult.success) {
        console.error(`❌ Failed to send image: ${imageResult.error}`);
        // Continue to send text message even if image fails
      } else {
        console.log(`✅ Image sent successfully`);
      }
    }

    // Send text message via Zalo (User's IP)
    const result = await zaloClient.sendMessage(accountId, userId, message, isGroup);

    if (result.success) {
      // Save message to local DB
      db.insertMessage({
        accountId,
        userId,
        message,
        messageId: result.messageId || 'unknown',
        status: 'sent',
        sentAt: result.sentAt?.toISOString() || new Date().toISOString(),
        synced: 0,
      });

      // Auto-save recipient to contacts database
      try {
        // Try to get user info to save full contact details
        const api = await zaloClient.getAPI(accountId);
        const userInfo = await api.fetchAccountInfo(userId);

        db.upsertContact({
          accountId,
          userId,
          displayName: userInfo.displayName || userInfo.zaloName || userId,
          phoneNumber: userInfo.phoneNumber,
          avatar: userInfo.avatar,
          synced: 0,
        });
        console.log(`✅ Contact saved to database: ${userInfo.displayName || userId}`);
      } catch (error) {
        // If we can't fetch user info, save minimal contact
        db.upsertContact({
          accountId,
          userId,
          displayName: userId,
          phoneNumber: undefined,
          avatar: undefined,
          synced: 0,
        });
        console.log(`✅ Minimal contact saved: ${userId}`);
      }

      if (syncService) {
        syncService.syncMessages().catch(console.error);
      }
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SEND FRIEND REQUEST ====================

app.post('/local/send-friend-request', async (req: Request, res: Response) => {
  try {
    const { accountId, userId, message } = req.body;

    if (!accountId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'accountId and userId are required',
      });
    }

    const result = await zaloClient.sendFriendRequest(accountId, userId, message);

    // Auto-save recipient to contacts database
    try {
      const api = await zaloClient.getAPI(accountId);
      const userInfo = await api.fetchAccountInfo(userId);

      db.upsertContact({
        accountId,
        userId,
        displayName: userInfo.displayName || userInfo.zaloName || userId,
        phoneNumber: userInfo.phoneNumber,
        avatar: userInfo.avatar,
        synced: 0,
      });
      console.log(`✅ Contact saved (friend request): ${userInfo.displayName || userId}`);
    } catch (error) {
      // If we can't fetch user info, save minimal contact
      db.upsertContact({
        accountId,
        userId,
        displayName: userId,
        phoneNumber: undefined,
        avatar: undefined,
        synced: 0,
      });
      console.log(`✅ Minimal contact saved (friend request): ${userId}`);
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FIND USER ====================

app.post('/local/find-user', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Find user request received:', req.body);
    const { accountId, phoneNumber } = req.body;

    if (!accountId || !phoneNumber) {
      console.error('❌ Missing accountId or phoneNumber');
      return res.status(400).json({
        success: false,
        error: 'accountId and phoneNumber are required',
      });
    }

    console.log(`🔍 Finding user with phone: ${phoneNumber} using account: ${accountId}`);
    const result = await zaloClient.findUser(accountId, phoneNumber);
    console.log('✅ Find user result:', result);

    // Transform to camelCase format for frontend
    const user = {
      userId: result.uid || result.userId,
      displayName: result.display_name || result.displayName || result.zalo_name || 'Unknown',
      avatar: result.avatar,
      phoneNumber: phoneNumber,
    };

    // Auto-save to contacts database
    try {
      db.upsertContact({
        accountId,
        userId: user.userId,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        synced: 0,
      });
      console.log(`✅ Contact saved to database: ${user.displayName}`);
    } catch (error) {
      console.error('⚠️  Failed to save contact:', error);
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('❌ Find user error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET USER INFO ====================

app.post('/local/get-user-info', async (req: Request, res: Response) => {
  try {
    const { accountId, userId } = req.body;

    if (!accountId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'accountId and userId are required',
      });
    }

    console.log(`📋 Getting user info for userId: ${userId} using account: ${accountId}`);
    const result = await zaloClient.getUserInfo(accountId, userId);

    res.json(result);
  } catch (error: any) {
    console.error('❌ Get user info error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SCRAPE GROUP ====================

app.post('/local/scrape-group', async (req: Request, res: Response) => {
  try {
    const { accountId, groupLink, maxPages } = req.body;

    if (!accountId || !groupLink) {
      return res.status(400).json({
        success: false,
        error: 'accountId and groupLink are required',
      });
    }

    // Scrape using zca-js API (automatically saves group and members to local DB)
    // maxPages is optional - if not provided, will fetch ALL pages
    const result = await zaloClient.scrapeGroup(accountId, groupLink, maxPages);

    if (result.success && result.data) {
      // Also save members as contacts for easy access
      result.data.members.forEach((member: any) => {
        try {
          db.upsertContact({
            accountId,
            userId: member.userId,
            displayName: member.displayName,
            avatar: member.avatar,
            synced: 0,
          });
        } catch (err) {
          console.error(`⚠️  Failed to save contact ${member.userId}:`, err);
        }
      });

      if (syncService) {
        syncService.syncGroups().catch(console.error);
        syncService.syncContacts().catch(console.error);
      }
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== LOAD GROUP MEMBERS ====================

app.post('/local/load-group-members', async (req: Request, res: Response) => {
  try {
    const { accountId, groupId } = req.body;

    if (!accountId || !groupId) {
      return res.status(400).json({
        success: false,
        error: 'accountId and groupId are required',
      });
    }

    // Use zca-js to load members with roles from existing group
    const result = await zaloClient.loadGroupMembersWithRoles(accountId, groupId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET FRIEND SUGGESTIONS ====================

app.post('/local/get-friend-suggestions', async (req: Request, res: Response) => {
  try {
    const { accountId, limit } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'accountId is required',
      });
    }

    const api = await zaloClient.getAPI(accountId);
    const suggestions = await api.getFriendSuggestions(limit || 20);

    res.json({ success: true, data: suggestions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CANCEL FRIEND REQUEST ====================

app.post('/local/cancel-friend-request', async (req: Request, res: Response) => {
  try {
    const { accountId, userId } = req.body;

    if (!accountId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'accountId and userId are required',
      });
    }

    const api = await zaloClient.getAPI(accountId);
    await api.cancelFriendRequest(userId);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ADD MEMBERS TO GROUP ====================

app.post('/local/add-members-to-group', async (req: Request, res: Response) => {
  try {
    const { accountId, groupId, userIds } = req.body;

    if (!accountId || !groupId || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        error: 'accountId, groupId, and userIds (array) are required',
      });
    }

    const api = await zaloClient.getAPI(accountId);
    const results = [];

    for (const userId of userIds) {
      try {
        await api.addMemberToGroup(groupId, userId);
        results.push({ userId, success: true });
      } catch (err: any) {
        results.push({ userId, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: results.length,
        successCount,
        failedCount,
        results,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== JOIN GROUP BY LINK ====================

app.post('/local/join-group', async (req: Request, res: Response) => {
  try {
    const { accountId, groupLink } = req.body;

    if (!accountId || !groupLink) {
      return res.status(400).json({
        success: false,
        error: 'accountId and groupLink are required',
      });
    }

    const api = await zaloClient.getAPI(accountId);
    const result = await api.joinGroupByLink(groupLink);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET CONTACTS WITH BIRTHDAY ====================

app.get('/local/contacts-with-birthday/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const today = req.query.today === 'true';

    const allContacts = db.getContacts(accountId);

    // Filter contacts with birthday info
    const contactsWithBirthday = allContacts.filter((contact: any) => {
      if (!contact.birthday) return false;

      if (today) {
        // Check if birthday is today
        const now = new Date();
        const birthday = new Date(contact.birthday);
        return (
          birthday.getMonth() === now.getMonth() && birthday.getDate() === now.getDate()
        );
      }

      return true;
    });

    res.json({ success: true, data: contactsWithBirthday });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== LOCAL DATA QUERIES ====================

app.get('/local/messages/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const limit = parseInt(req.query.limit as string) || 100;

    const messages = db.getMessages(accountId, limit);

    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/messages/:accountId/filter', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const { startDate, endDate, status, search, limit, offset } = req.query;

    const result = db.getMessagesWithFilter(accountId, {
      startDate: startDate as string,
      endDate: endDate as string,
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({ success: true, data: result.messages, total: result.total });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/contacts/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    const contacts = db.getContacts(accountId);

    res.json({ success: true, data: contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get filtered contacts with pagination
app.get('/local/contacts/:accountId/filter', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const { search, groupId, startDate, endDate, limit, offset } = req.query;

    const params = {
      accountId,
      search: search as string | undefined,
      groupId: groupId ? parseInt(groupId as string) : undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = db.getContactsFiltered(params);

    res.json({ success: true, data: result.contacts, total: result.total });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single contact by ID
app.get('/local/contacts/detail/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const contact = db.getContactById(id);

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    res.json({ success: true, data: contact });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create or update contact
app.post('/local/contacts', (req: Request, res: Response) => {
  try {
    const { accountId, userId, displayName, phoneNumber, avatar } = req.body;

    if (!accountId || !userId || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountId, userId, displayName',
      });
    }

    db.upsertContact({
      accountId,
      userId,
      displayName,
      phoneNumber: phoneNumber || null,
      avatar: avatar || null,
      synced: 0,
    });

    res.json({ success: true, message: 'Contact saved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete contact
app.delete('/local/contacts/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    db.deleteContact(id);

    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk delete contacts
app.post('/local/contacts/bulk-delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids must be a non-empty array',
      });
    }

    db.bulkDeleteContacts(ids);

    res.json({ success: true, message: `${ids.length} contacts deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/group-members/:accountId/:groupId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const groupId = req.params.groupId;

    const members = db.getGroupMembers(accountId, groupId);

    // LOG: Debug member roles from database
    console.log(`\n🔍 Loading group members from DB: account=${accountId}, group=${groupId}`);
    console.log(`Total members: ${members.length}`);
    if (members.length > 0) {
      console.log('First 3 members from DB:');
      console.log(members.slice(0, 3));
    }

    res.json({ success: true, data: members });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/accounts', (req: Request, res: Response) => {
  try {
    const accounts = db.getAllAccounts();

    // Transform all accounts to match UI interface (including inactive ones)
    const transformedAccounts = accounts.map((acc: any) => ({
      id: acc.accountId,
      displayName: acc.displayName || 'Zalo Account',
      avatar: acc.avatar,
      phoneNumber: acc.phoneNumber || '',
      userId: acc.zaloId || String(acc.accountId),
      status: acc.status || 'active', // Default to active if not set
    }));

    res.json(transformedAccounts);
  } catch (error: any) {
    res.status(500).json([]);
  }
});

// Delete Zalo account and all related data
app.delete('/local/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'accountId không hợp lệ',
      });
    }

    console.log(`🗑️ Deleting account ${accountId} and all related data...`);

    // Delete from database
    const result = db.deleteZaloAccount(accountId);

    // Also try to clean up session files
    try {
      await zaloClient.cleanupSession(accountId);
    } catch (cleanupError) {
      console.warn(`⚠️ Could not cleanup session files for account ${accountId}:`, cleanupError);
    }

    console.log(`✅ Account ${accountId} deleted successfully:`, result.deletedData);

    res.json({
      success: true,
      message: `Đã xóa tài khoản và ${result.deletedData.campaignsCount} chiến dịch, ${result.deletedData.messagesCount} tin nhắn, ${result.deletedData.contactsCount} danh bạ, ${result.deletedData.groupsCount} nhóm`,
      deletedData: result.deletedData,
    });
  } catch (error: any) {
    console.error('❌ Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Không thể xóa tài khoản',
    });
  }
});

app.get('/local/groups/:accountId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const source = req.query.source || 'live'; // 'live' or 'db'

    if (source === 'db') {
      // Get from database (scraped groups)
      const groups = db.getGroups(accountId);
      res.json({ success: true, data: groups });
    } else {
      // Get from Zalo API (joined groups)
      const result = await zaloClient.getJoinedGroups(accountId);
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CONFIG & REGISTRATION ====================

app.get('/local/config', (req: Request, res: Response) => {
  try {
    res.json({
      apiUrl: process.env.BACKEND_URL || '',
      agentId: process.env.AGENT_ID || '',
      apiKey: process.env.AGENT_API_KEY || '',
      userId: process.env.USER_ID || '',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/local/config', (req: Request, res: Response) => {
  try {
    const { apiUrl, agentId, apiKey } = req.body;

    // Update environment variables
    if (apiUrl) process.env.BACKEND_URL = apiUrl;
    if (agentId) process.env.AGENT_ID = agentId;
    if (apiKey) process.env.AGENT_API_KEY = apiKey;

    // Save to .env file would be better, but for now just in memory
    // TODO: Write to .env file for persistence

    // Reinitialize sync service if all required values are present
    if (process.env.BACKEND_URL && process.env.AGENT_API_KEY) {
      if (syncService) {
        syncService.stopAutoSync();
        syncService.stopHeartbeat();
      }

      syncService = new SyncService(process.env.BACKEND_URL, process.env.AGENT_API_KEY, db);
      syncService.startAutoSync();
      syncService.startHeartbeat();
      console.log('✅ Sync service reinitialized');
    }

    res.json({ success: true, message: 'Config saved successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/register-agent', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Get backend URL from config (Settings)
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      return res.status(400).json({
        success: false,
        error: 'Backend URL chưa được cấu hình. Vui lòng vào Settings và nhập Backend URL trước.',
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email và mật khẩu là bắt buộc',
      });
    }

    // Login to backend to get JWT token
    const axios = require('axios');
    let loginResponse;

    try {
      loginResponse = await axios.post(`${backendUrl}/api/auth/login`, {
        email: username, // Backend expects 'email' not 'username'
        password,
      });
    } catch (loginError: any) {
      // Handle login-specific errors
      const errorMsg = loginError.response?.data?.message || loginError.message;
      console.error('Login failed:', errorMsg);

      return res.status(loginError.response?.status || 401).json({
        success: false,
        error: errorMsg === 'Invalid credentials'
          ? 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'
          : `Đăng nhập thất bại: ${errorMsg}`,
      });
    }

    const token = loginResponse.data.tokens?.accessToken || loginResponse.data.access_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Login failed - no token received',
      });
    }

    // Register this desktop as an agent
    const os = require('os');
    const registerResponse = await axios.post(
      `${backendUrl}/api/agents/register`,
      {
        computerName: os.hostname(),
        ipAddress: '', // Backend will detect from request
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { agentId, apiKey } = registerResponse.data;
    const userId = loginResponse.data.user?.id;

    // Save config locally and persist to .env file
    process.env.AGENT_ID = agentId;
    process.env.AGENT_API_KEY = apiKey;
    if (userId) {
      process.env.USER_ID = String(userId);
    }

    // Persist to .env file so it survives restart
    try {
      updateEnvFile({
        BACKEND_URL: backendUrl,
        AGENT_ID: agentId,
        AGENT_API_KEY: apiKey,
        USER_ID: userId ? String(userId) : '',
      });
    } catch (envError) {
      console.error('⚠️ Failed to update .env file:', envError);
    }

    // Initialize sync service with new API key
    if (syncService) {
      syncService.stopAutoSync();
      syncService.stopHeartbeat();
    }

    syncService = new SyncService(backendUrl, apiKey, db);
    syncService.startAutoSync();
    syncService.startHeartbeat();

    // Reset API key validation status so it gets re-checked
    apiKeyValid = true; // We just registered, so it's valid
    console.log('✅ Agent registered and sync service started');

    res.json({
      success: true,
      agentId,
      apiKey,
      userId,
    });
  } catch (error: any) {
    console.error('Register agent error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Registration failed',
    });
  }
});

// ==================== SYNC CONTROLS ====================

app.post('/local/sync/manual', async (req: Request, res: Response) => {
  try {
    if (!syncService) {
      return res.status(400).json({
        success: false,
        error: 'Sync service not configured. Vui lòng đăng nhập để bật đồng bộ.',
      });
    }

    await syncService.manualSync();

    res.json({ success: true, message: 'Manual sync completed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track API key validation status
let apiKeyValid: boolean | null = null; // null = not checked, true = valid, false = invalid

app.get('/local/sync/status', async (req: Request, res: Response) => {
  try {
    const stats = db.getStats();

    // Check API key validity if sync service exists and we haven't checked yet
    if (syncService && apiKeyValid === null) {
      try {
        apiKeyValid = await syncService.validateApiKey();
      } catch {
        apiKeyValid = null;
      }
    }

    res.json({
      lastSyncAt: syncService ? new Date().toISOString() : undefined,
      unsyncedMessages: stats.unsyncedMessages || 0,
      unsyncedContacts: stats.unsyncedContacts || 0,
      unsyncedGroupMembers: stats.unsyncedGroupMembers || 0,
      syncEnabled: syncService !== null,
      apiKeyValid: apiKeyValid,
      hasApiKey: !!(process.env.AGENT_API_KEY && process.env.AGENT_API_KEY.trim().length > 0),
      hasBackendUrl: !!(process.env.BACKEND_URL && process.env.BACKEND_URL.trim().length > 0),
    });
  } catch (error: any) {
    res.status(500).json({
      unsyncedMessages: 0,
      unsyncedContacts: 0,
      unsyncedGroupMembers: 0,
      syncEnabled: false,
      apiKeyValid: null,
      hasApiKey: false,
      hasBackendUrl: false,
    });
  }
});

app.post('/local/sync/trigger', async (req: Request, res: Response) => {
  try {
    if (!syncService) {
      return res.status(400).json({
        success: false,
        error: 'Sync service not configured. Vui lòng đăng nhập để bật đồng bộ.',
      });
    }

    await syncService.syncAll();

    res.json({ success: true, message: 'Sync triggered successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pull sync from backend to desktop (for machine transfer)
app.post('/local/sync/pull', async (req: Request, res: Response) => {
  try {
    if (!syncService) {
      return res.status(400).json({
        success: false,
        error: 'Sync service not configured. Vui lòng đăng nhập để bật đồng bộ.',
      });
    }

    const { zaloAccountId } = req.body;
    const results = await syncService.pullAll(zaloAccountId);

    res.json({
      success: true,
      message: 'Pull sync completed',
      data: results,
    });
  } catch (error: any) {
    console.error('❌ Pull sync failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TEMPLATES ====================

app.post('/local/templates', (req: Request, res: Response) => {
  try {
    const { name, content, variables, category, description, isActive } = req.body;
    const agentId = process.env.USER_ID;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng đăng nhập để tạo template',
      });
    }

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'name và content là bắt buộc',
      });
    }

    const templateId = db.createTemplate({
      agentId,
      name,
      content,
      variables: variables ? JSON.stringify(variables) : undefined,
      category,
      description,
      isActive: isActive !== undefined ? isActive : 1,
      usageCount: 0,
    });

    const template = db.getTemplateById(templateId);

    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/templates', (req: Request, res: Response) => {
  try {
    const agentId = process.env.USER_ID;
    const activeOnly = req.query.activeOnly === 'true';

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng đăng nhập để xem templates',
      });
    }

    const templates = db.getTemplates(agentId, activeOnly);

    // Parse variables JSON string to array
    const parsedTemplates = templates.map((t) => ({
      ...t,
      variables: t.variables ? JSON.parse(t.variables) : [],
    }));

    res.json({ success: true, data: parsedTemplates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/templates/detail/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const template = db.getTemplateById(id);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Parse variables JSON string to array
    const parsedTemplate = {
      ...template,
      variables: template.variables ? JSON.parse(template.variables) : [],
    };

    res.json({ success: true, data: parsedTemplate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/local/templates/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, content, variables, category, description, isActive } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;
    if (variables !== undefined) updates.variables = JSON.stringify(variables);
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    db.updateTemplate(id, updates);

    const template = db.getTemplateById(id);
    const parsedTemplate = template
      ? {
          ...template,
          variables: template.variables ? JSON.parse(template.variables) : [],
        }
      : null;

    res.json({ success: true, data: parsedTemplate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/local/templates/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    db.deleteTemplate(id);

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/templates/preview', (req: Request, res: Response) => {
  try {
    const { content, variables } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    let preview = content;

    // Replace variables {name}, {phone}, etc.
    if (variables && typeof variables === 'object') {
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        preview = preview.replace(regex, variables[key]);
      });
    }

    res.json({ success: true, data: { preview } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CAMPAIGNS ====================

app.post('/local/campaigns', (req: Request, res: Response) => {
  try {
    const {
      accountId,
      name,
      description,
      campaignType,
      templateId,
      recipients,
      targetSource,
      groupId,
      automationRules,
      contactGroupId,
      scheduledAt,
      rateLimit,
      delayMs,
      maxRetries,
    } = req.body;

    console.log('📝 Creating campaign:', {
      name,
      campaignType,
      recipientsCount: recipients?.length || 0,
      contactGroupId,
      groupId
    });

    if (!accountId || !name || !campaignType) {
      return res.status(400).json({
        success: false,
        error: 'accountId, name, and campaignType are required',
      });
    }

    // Load recipients from contact group if contactGroupId is provided
    let finalRecipients = recipients || [];
    if (contactGroupId && (!recipients || recipients.length === 0)) {
      try {
        const members = db.getContactGroupMembers(contactGroupId);
        // Filter members by accountId to ensure they belong to the campaign's account
        const filteredMembers = members.filter((m: any) => m.accountId === accountId);
        finalRecipients = filteredMembers.map((m: any) => ({
          userId: m.userId,
          displayName: m.displayName,
          phoneNumber: m.phoneNumber,
        }));
        console.log(`✅ Loaded ${finalRecipients.length} recipients from contact group ${contactGroupId}`);
      } catch (err: any) {
        console.error('❌ Error loading contact group members:', err.message);
        return res.status(500).json({
          success: false,
          error: `Không thể tải thành viên từ nhóm danh bạ: ${err.message}`,
        });
      }
    }

    // Load recipients from Zalo group if groupId is provided
    if (groupId && (!recipients || recipients.length === 0)) {
      try {
        const members = db.getGroupMembers(accountId, groupId);
        finalRecipients = members.map((m: any) => ({
          userId: m.userId,
          displayName: m.displayName,
          role: m.role,
        }));
        console.log(`✅ Loaded ${finalRecipients.length} recipients from Zalo group ${groupId}`);
      } catch (err: any) {
        console.error('❌ Error loading group members:', err.message);
        return res.status(500).json({
          success: false,
          error: `Không thể tải thành viên từ group Zalo: ${err.message}`,
        });
      }
    }

    // Validate that we have recipients (except for campaigns that send to group chat directly)
    const campaignTypesWithoutRecipients = ['message_to_group', 'join_group_by_link'];
    const needsRecipients = !campaignTypesWithoutRecipients.includes(campaignType);

    if (needsRecipients && (!finalRecipients || finalRecipients.length === 0)) {
      console.warn('⚠️ No recipients provided for campaign');
      return res.status(400).json({
        success: false,
        error: 'Không có người nhận. Vui lòng thêm người nhận, chọn nhóm danh bạ, hoặc load thành viên từ group Zalo',
      });
    }

    // For message_to_group, validate that groupId is provided
    if (campaignType === 'message_to_group' && !groupId) {
      return res.status(400).json({
        success: false,
        error: 'Loại chiến dịch "Gửi tin nhắn đến Group" yêu cầu chọn nhóm Zalo',
      });
    }

    // For campaigns without recipients (like message_to_group), set empty array
    if (!needsRecipients && (!finalRecipients || finalRecipients.length === 0)) {
      finalRecipients = [];
    }

    const recipientsStr = typeof finalRecipients === 'string' ? finalRecipients : JSON.stringify(finalRecipients);
    const totalRecipients = JSON.parse(recipientsStr).length;

    // Determine status: 'scheduled' if scheduledAt is provided, otherwise 'draft'
    const status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'stopped' = scheduledAt ? 'scheduled' : 'draft';

    console.log('💾 Saving campaign to database:', {
      totalRecipients,
      status,
      templateId,
      delayMs: delayMs || 2000,
      maxRetries: maxRetries || 2
    });

    // Ensure all fields are properly typed (undefined -> null for database)
    const campaignData: Omit<CampaignRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      accountId,
      name,
      description: description || undefined,
      campaignType,
      templateId: templateId || undefined,
      recipients: recipientsStr,
      targetSource: targetSource || undefined,
      groupId: groupId || undefined,
      automationRules: automationRules || undefined,
      contactGroupId: contactGroupId || undefined,
      scheduledAt: scheduledAt || undefined,
      rateLimit: rateLimit || undefined,
      delayMs: delayMs || 2000,
      maxRetries: maxRetries || 2,
      status,
      totalRecipients,
      sentCount: 0,
      failedCount: 0,
      startedAt: undefined,
      completedAt: undefined,
    };

    const campaignId = db.createCampaign(campaignData);

    console.log(`✅ Campaign created successfully with ID: ${campaignId}`);

    const campaign = db.getCampaignById(campaignId);

    res.json({ success: true, data: campaign });
  } catch (error: any) {
    console.error('❌ Error creating campaign:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/campaigns/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const status = req.query.status as string | undefined;

    const campaigns = db.getCampaigns(accountId, status);

    // Parse recipients JSON string to array
    const parsedCampaigns = campaigns.map((c) => ({
      ...c,
      recipients: c.recipients ? JSON.parse(c.recipients) : [],
    }));

    res.json({ success: true, data: parsedCampaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/campaigns/detail/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const campaign = db.getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Parse recipients JSON string to array
    const parsedCampaign = {
      ...campaign,
      recipients: campaign.recipients ? JSON.parse(campaign.recipients) : [],
    };

    res.json({ success: true, data: parsedCampaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get previous recipients for re-marketing (with optional date filter)
app.get('/local/campaigns/previous-recipients/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const { dateFrom, dateTo } = req.query;

    const recipients = db.getPreviousRecipients(
      accountId,
      dateFrom as string | undefined,
      dateTo as string | undefined
    );

    res.json({
      success: true,
      data: recipients,
      total: recipients.length,
    });
  } catch (error: any) {
    console.error('Error getting previous recipients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/local/campaigns/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      name,
      description,
      campaignType,
      templateId,
      recipients,
      targetSource,
      groupId,
      automationRules,
      contactGroupId,
      scheduledAt,
      rateLimit,
      delayMs,
      maxRetries,
      status,
      sentCount,
      failedCount,
      startedAt,
      completedAt,
    } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (campaignType !== undefined) updates.campaignType = campaignType;
    if (templateId !== undefined) updates.templateId = templateId;
    if (recipients !== undefined) {
      updates.recipients = typeof recipients === 'string' ? recipients : JSON.stringify(recipients);
      updates.totalRecipients = JSON.parse(updates.recipients).length;
    }
    if (targetSource !== undefined) updates.targetSource = targetSource;
    if (groupId !== undefined) updates.groupId = groupId;
    if (automationRules !== undefined) updates.automationRules = automationRules;
    if (contactGroupId !== undefined) updates.contactGroupId = contactGroupId;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt;
    if (rateLimit !== undefined) updates.rateLimit = rateLimit;
    if (delayMs !== undefined) updates.delayMs = delayMs;
    if (maxRetries !== undefined) updates.maxRetries = maxRetries;
    if (status !== undefined) updates.status = status;
    if (sentCount !== undefined) updates.sentCount = sentCount;
    if (failedCount !== undefined) updates.failedCount = failedCount;
    if (startedAt !== undefined) updates.startedAt = startedAt;
    if (completedAt !== undefined) updates.completedAt = completedAt;

    db.updateCampaign(id, updates);

    const campaign = db.getCampaignById(id);
    const parsedCampaign = campaign
      ? {
          ...campaign,
          recipients: campaign.recipients ? JSON.parse(campaign.recipients) : [],
        }
      : null;

    res.json({ success: true, data: parsedCampaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/local/campaigns/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    db.deleteCampaign(id);

    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CONTACT GROUPS ====================

app.get('/local/contact-groups/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const groups = db.getContactGroups(accountId);

    res.json({ success: true, data: groups });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/contact-groups', (req: Request, res: Response) => {
  try {
    const { accountId, name, description, color } = req.body;

    if (!accountId || !name) {
      return res.status(400).json({
        success: false,
        error: 'accountId and name are required',
      });
    }

    const groupId = db.createContactGroup({
      accountId,
      name,
      description,
      color: color || '#1976d2',
      memberCount: 0,
    });

    const group = db.getContactGroupById(groupId);

    res.json({ success: true, data: group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/contact-groups/detail/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const group = db.getContactGroupById(id);

    if (!group) {
      return res.status(404).json({ success: false, error: 'Contact group not found' });
    }

    res.json({ success: true, data: group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/local/contact-groups/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, color } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;

    db.updateContactGroup(id, updates);

    const group = db.getContactGroupById(id);

    res.json({ success: true, data: group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/local/contact-groups/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    db.deleteContactGroup(id);

    res.json({ success: true, message: 'Contact group deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/contact-groups/:id/members', (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'contactId is required',
      });
    }

    db.addContactToGroup(groupId, contactId);

    const group = db.getContactGroupById(groupId);

    res.json({ success: true, data: group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/local/contact-groups/:id/members/:contactId', (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const contactId = parseInt(req.params.contactId);

    db.removeContactFromGroup(groupId, contactId);

    const group = db.getContactGroupById(groupId);

    res.json({ success: true, data: group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/contact-groups/:id/members', (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const members = db.getContactGroupMembers(groupId);

    res.json({ success: true, data: members });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch assign contacts to group
app.post('/local/contact-groups/assign', (req: Request, res: Response) => {
  try {
    const { contactGroupId, contactIds } = req.body;

    if (!contactGroupId || !contactIds || !Array.isArray(contactIds)) {
      return res.status(400).json({
        success: false,
        error: 'contactGroupId and contactIds (array) are required',
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const contactId of contactIds) {
      try {
        db.addContactToGroup(contactGroupId, contactId);
        successCount++;
      } catch (err) {
        // Skip duplicates or errors
        errorCount++;
      }
    }

    const group = db.getContactGroupById(contactGroupId);

    res.json({
      success: true,
      data: {
        group,
        successCount,
        errorCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AUTO REPLY RULES ====================

app.get('/local/auto-reply-rules/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const activeOnly = req.query.activeOnly === 'true';

    const rules = db.getAutoReplyRules(accountId, activeOnly);

    // Parse keywords JSON
    const parsedRules = rules.map(rule => ({
      ...rule,
      keywords: JSON.parse(rule.keywords),
    }));

    res.json({ success: true, data: parsedRules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/local/auto-reply-rules', (req: Request, res: Response) => {
  try {
    const { accountId, name, description, keywords, replyMessage, isActive, priority, matchType } = req.body;

    if (!accountId || !name || !keywords || !replyMessage) {
      return res.status(400).json({
        success: false,
        error: 'accountId, name, keywords, and replyMessage are required',
      });
    }

    const keywordsStr = typeof keywords === 'string' ? keywords : JSON.stringify(keywords);

    const ruleId = db.createAutoReplyRule({
      accountId,
      name,
      description,
      keywords: keywordsStr,
      replyMessage,
      isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
      priority: priority || 0,
      matchType: matchType || 'contains',
    });

    const rule = db.getAutoReplyRuleById(ruleId);
    const parsedRule = rule ? {
      ...rule,
      keywords: JSON.parse(rule.keywords),
    } : null;

    res.json({ success: true, data: parsedRule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/auto-reply-rules/detail/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const rule = db.getAutoReplyRuleById(id);

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Auto-reply rule not found' });
    }

    const parsedRule = {
      ...rule,
      keywords: JSON.parse(rule.keywords),
    };

    res.json({ success: true, data: parsedRule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/local/auto-reply-rules/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, keywords, replyMessage, isActive, priority, matchType } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (keywords !== undefined) {
      updates.keywords = typeof keywords === 'string' ? keywords : JSON.stringify(keywords);
    }
    if (replyMessage !== undefined) updates.replyMessage = replyMessage;
    if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;
    if (priority !== undefined) updates.priority = priority;
    if (matchType !== undefined) updates.matchType = matchType;

    db.updateAutoReplyRule(id, updates);

    const rule = db.getAutoReplyRuleById(id);
    const parsedRule = rule ? {
      ...rule,
      keywords: JSON.parse(rule.keywords),
    } : null;

    res.json({ success: true, data: parsedRule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/local/auto-reply-rules/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    db.deleteAutoReplyRule(id);

    res.json({ success: true, message: 'Auto-reply rule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ANALYTICS ====================

app.get('/local/analytics/campaigns/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, error: 'Invalid accountId' });
    }

    const stats = db.getCampaignStatistics(accountId);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Analytics campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/analytics/template-usage/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, error: 'Invalid accountId' });
    }

    const stats = db.getTemplateUsageStatistics(accountId);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Analytics template-usage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/analytics/campaign-types/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, error: 'Invalid accountId' });
    }

    const stats = db.getCampaignTypeStatistics(accountId);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Analytics campaign-types error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/analytics/messages-by-date/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, error: 'Invalid accountId' });
    }

    const days = parseInt(req.query.days as string) || 30;
    const stats = db.getMessageStatisticsByDate(accountId, days);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Analytics messages-by-date error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/analytics/contact-groups/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, error: 'Invalid accountId' });
    }

    const stats = db.getContactGroupStatistics(accountId);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Analytics contact-groups error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/local/analytics/auto-reply/:accountId', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);

    if (isNaN(accountId)) {
      return res.status(400).json({ success: false, error: 'Invalid accountId' });
    }

    const stats = db.getAutoReplyStatistics(accountId);

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Analytics auto-reply error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CAMPAIGN SCHEDULER ====================

/**
 * Campaign Scheduler - checks every minute for scheduled campaigns that should run
 */
function startCampaignScheduler() {
  console.log('📅 Campaign Scheduler started');

  // Check immediately on startup
  checkScheduledCampaigns();

  // Then check every minute
  setInterval(() => {
    checkScheduledCampaigns();
  }, 60000); // 60 seconds
}

async function checkScheduledCampaigns() {
  try {
    const campaignsToRun = db.getScheduledCampaignsToRun();

    if (campaignsToRun.length > 0) {
      console.log(`⏰ Found ${campaignsToRun.length} scheduled campaign(s) ready to run`);

      for (const campaign of campaignsToRun) {
        console.log(`📢 Campaign "${campaign.name}" (ID: ${campaign.id}) is scheduled to run`);
        console.log(`   Scheduled time: ${campaign.scheduledAt}`);
        console.log(`   Current time: ${new Date().toISOString()}`);

        // Update campaign status from 'scheduled' to 'draft' so it's ready to execute
        // The user can then manually click run, or we can implement auto-execution later
        db.updateCampaign(campaign.id!, {
          status: 'draft',
        });

        console.log(`✅ Campaign "${campaign.name}" status updated to 'draft' - ready to run`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error in campaign scheduler:', error.message);
  }
}

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Zalo Marketing Desktop Worker           ║
║   📡 Local API: http://localhost:${PORT}       ║
║   💾 Database: ${db ? 'Connected' : 'Disconnected'}                    ║
║   🔄 Sync: Disabled (temp)                    ║
║   📅 Scheduler: Running                       ║
╚═══════════════════════════════════════════════╝
  `);

  // Start campaign scheduler
  startCampaignScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');

  // TEMP: Comment sync service
  // if (syncService) {
  //   syncService.stopAutoSync();
  //   syncService.stopHeartbeat();
  // }

  server.close(() => {
    console.log('✅ Server closed');
    db.close();
    process.exit(0);
  });
});

export default app;
