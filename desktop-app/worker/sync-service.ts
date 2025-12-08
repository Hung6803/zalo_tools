import axios, { AxiosInstance } from 'axios';
import { LocalDatabase } from './local-db';

export class SyncService {
  private readonly backendUrl: string;
  private readonly apiKey: string;
  private readonly db: LocalDatabase;
  private readonly api: AxiosInstance;
  private syncInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatFailCount: number = 0;
  private maxHeartbeatFailBeforeSilence: number = 3; // Sau 3 lần fail thì im lặng

  constructor(backendUrl: string, apiKey: string, db: LocalDatabase) {
    this.backendUrl = backendUrl;
    this.apiKey = apiKey;
    this.db = db;

    // Create axios instance with default config
    this.api = axios.create({
      baseURL: backendUrl,
      headers: {
        'X-Agent-Key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Start auto sync (every 5 minutes)
   */
  startAutoSync(intervalMs: number = 5 * 60 * 1000) {
    console.log(`🔄 Starting auto sync (every ${intervalMs / 1000}s)`);

    // Initial sync
    this.syncAll().catch(console.error);

    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.syncAll().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop auto sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto sync stopped');
    }
  }

  /**
   * Start heartbeat (every 30 seconds)
   */
  startHeartbeat(intervalMs: number = 30 * 1000) {
    console.log(`💓 Starting heartbeat (every ${intervalMs / 1000}s)`);

    // Initial heartbeat
    this.sendHeartbeat().catch(console.error);

    // Schedule periodic heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('🛑 Heartbeat stopped');
    }
  }

  /**
   * Send heartbeat to backend
   */
  async sendHeartbeat() {
    try {
      const activeAccounts = this.db.getActiveAccounts();

      // Chỉ log lần đầu hoặc sau khi recover từ lỗi
      if (this.heartbeatFailCount === 0) {
        console.log(`💓 Sending heartbeat with API key: ${this.apiKey.substring(0, 10)}...`);
      }

      await this.api.post('/api/agents/heartbeat', {
        zaloAccountIds: activeAccounts,
        status: 'online',
      });

      // Reset fail count khi thành công
      if (this.heartbeatFailCount > 0) {
        console.log(`✅ Heartbeat recovered after ${this.heartbeatFailCount} failures`);
        this.heartbeatFailCount = 0;
      }
    } catch (error: any) {
      this.heartbeatFailCount++;

      // Chỉ log 3 lần đầu, sau đó im lặng
      if (this.heartbeatFailCount <= this.maxHeartbeatFailBeforeSilence) {
        console.error(`❌ Heartbeat failed (${this.heartbeatFailCount}/${this.maxHeartbeatFailBeforeSilence}):`, error.response?.data || error.message);

        if (this.heartbeatFailCount === this.maxHeartbeatFailBeforeSilence) {
          console.warn('⚠️  Heartbeat sẽ tiếp tục chạy nhưng không log lỗi nữa. Vui lòng kiểm tra:');
          console.warn('   1. Backend server có đang chạy không?');
          console.warn('   2. API Key có hợp lệ không? (Vào Settings để đăng ký agent)');
        }
      }
    }
  }

  /**
   * Sync all data types
   */
  async syncAll() {
    console.log('🔄 Starting sync...');

    try {
      await Promise.all([
        this.syncMessages(),
        this.syncContacts(),
        this.syncGroups(),
        this.syncGroupMembers(),
      ]);

      console.log('✅ Sync completed successfully');
    } catch (error: any) {
      console.error('❌ Sync failed:', error.message);
    }
  }

  /**
   * Sync messages
   */
  async syncMessages() {
    const unsyncedMessages = this.db.getUnsyncedMessages();

    if (unsyncedMessages.length === 0) {
      return;
    }

    console.log(`📤 Syncing ${unsyncedMessages.length} messages...`);

    try {
      // Transform to backend format
      const messages = unsyncedMessages.map((msg) => ({
        accountId: msg.accountId,
        userId: msg.userId,
        message: msg.message,
        messageId: msg.messageId,
        status: msg.status,
        sentAt: msg.sentAt,
      }));

      const response = await this.api.post('/api/sync/messages', { messages });

      // Mark as synced
      const ids = unsyncedMessages.map((m) => m.id!);
      this.db.markMessagesSynced(ids);

      console.log(`✅ Synced ${response.data.synced} messages`);
    } catch (error: any) {
      console.error('❌ Failed to sync messages:', error.message);
      throw error;
    }
  }

  /**
   * Sync contacts
   */
  async syncContacts() {
    const unsyncedContacts = this.db.getUnsyncedContacts();

    if (unsyncedContacts.length === 0) {
      return;
    }

    console.log(`📤 Syncing ${unsyncedContacts.length} contacts...`);

    try {
      // Transform to backend format
      const contacts = unsyncedContacts.map((contact) => ({
        accountId: contact.accountId,
        userId: contact.userId,
        displayName: contact.displayName,
        phoneNumber: contact.phoneNumber,
        avatar: contact.avatar,
      }));

      const response = await this.api.post('/api/sync/contacts', { contacts });

      // Mark as synced
      const ids = unsyncedContacts.map((c) => c.id!);
      this.db.markContactsSynced(ids);

      console.log(`✅ Synced ${response.data.synced} contacts`);
    } catch (error: any) {
      console.error('❌ Failed to sync contacts:', error.message);
      throw error;
    }
  }

  /**
   * Sync groups
   */
  async syncGroups() {
    const unsyncedGroups = this.db.getUnsyncedGroups();

    if (unsyncedGroups.length === 0) {
      return;
    }

    console.log(`📤 Syncing ${unsyncedGroups.length} groups...`);

    try {
      for (const group of unsyncedGroups) {
        // Get members for this group
        const members = this.db.getGroupMembers(group.accountId, group.groupId);

        // Send to backend
        await this.api.post('/api/sync/group-members', {
          accountId: group.accountId,
          groupId: group.groupId,
          groupName: group.groupName,
          members: members.map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            avatar: m.avatar,
            role: m.role,
          })),
          scrapedAt: group.scrapedAt,
        });

        // Mark group as synced
        this.db.markGroupsSynced([group.id!]);

        console.log(`✅ Synced group ${group.groupName} (${members.length} members)`);
      }
    } catch (error: any) {
      console.error('❌ Failed to sync groups:', error.message);
      throw error;
    }
  }

  /**
   * Sync group members
   */
  async syncGroupMembers() {
    // Group members are synced together with groups in syncGroups()
    // This method is kept for consistency
    return;
  }

  /**
   * Manual sync trigger
   */
  async manualSync() {
    console.log('🔄 Manual sync triggered');
    await this.syncAll();
  }

  /**
   * Test connection to backend
   */
  async testConnection() {
    try {
      await this.api.get('/api/health');
      console.log('✅ Backend connection OK');
      return true;
    } catch (error: any) {
      console.error('❌ Backend connection failed:', error.message);
      return false;
    }
  }

  /**
   * Validate API key with backend
   * Returns true if API key is valid, false otherwise
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Try to send a heartbeat to validate the API key
      await this.api.post('/api/agents/heartbeat', {
        zaloAccountIds: [],
        status: 'online',
      });
      console.log('✅ API key is valid');
      return true;
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('❌ API key is invalid or expired. Please re-login from the desktop app.');
        return false;
      }
      // Other errors (network, etc.) - assume key might be valid
      console.warn('⚠️ Could not validate API key:', error.message);
      return true; // Give benefit of the doubt
    }
  }

  // ==================== PULL SYNC (Backend → Desktop) ====================

  /**
   * Pull all data from backend to desktop
   */
  async pullAll(zaloAccountId?: number) {
    console.log('⬇️ Starting pull sync from backend...');

    const results = {
      contacts: { pulled: 0, error: null as string | null },
      groups: { pulled: 0, error: null as string | null },
      messages: { pulled: 0, error: null as string | null },
      templates: { pulled: 0, error: null as string | null },
    };

    try {
      // Pull contacts
      const contactsResult = await this.pullContacts(zaloAccountId);
      results.contacts.pulled = contactsResult.pulled;
    } catch (error: any) {
      results.contacts.error = error.message;
      console.error('❌ Failed to pull contacts:', error.message);
    }

    try {
      // Pull groups
      const groupsResult = await this.pullGroups(zaloAccountId);
      results.groups.pulled = groupsResult.pulled;
    } catch (error: any) {
      results.groups.error = error.message;
      console.error('❌ Failed to pull groups:', error.message);
    }

    try {
      // Pull messages
      const messagesResult = await this.pullMessages(zaloAccountId);
      results.messages.pulled = messagesResult.pulled;
    } catch (error: any) {
      results.messages.error = error.message;
      console.error('❌ Failed to pull messages:', error.message);
    }

    try {
      // Pull templates
      const templatesResult = await this.pullTemplates();
      results.templates.pulled = templatesResult.pulled;
    } catch (error: any) {
      results.templates.error = error.message;
      console.error('❌ Failed to pull templates:', error.message);
    }

    console.log('✅ Pull sync completed:', results);
    return results;
  }

  /**
   * Pull contacts from backend
   */
  async pullContacts(zaloAccountId?: number) {
    console.log('⬇️ Pulling contacts from backend...');

    const params: any = {};
    if (zaloAccountId) {
      params.zaloAccountId = zaloAccountId;
    }

    const response = await this.api.get('/api/sync/pull/contacts', { params });
    const contacts = response.data.data;

    let pulled = 0;
    for (const contact of contacts) {
      try {
        this.db.upsertContact({
          accountId: contact.zaloAccountId,
          userId: contact.zaloId,
          displayName: contact.displayName,
          phoneNumber: contact.phoneNumber || '',
          avatar: contact.avatar || '',
          synced: 1, // Mark as already synced since it came from backend
        });
        pulled++;
      } catch (error: any) {
        console.error(`Failed to save contact ${contact.zaloId}:`, error.message);
      }
    }

    console.log(`✅ Pulled ${pulled} contacts`);
    return { pulled, total: contacts.length };
  }

  /**
   * Pull groups from backend
   */
  async pullGroups(zaloAccountId?: number) {
    console.log('⬇️ Pulling groups from backend...');

    const params: any = {};
    if (zaloAccountId) {
      params.zaloAccountId = zaloAccountId;
    }

    const response = await this.api.get('/api/sync/pull/groups', { params });
    const groups = response.data.data;

    let pulled = 0;
    for (const group of groups) {
      try {
        // Save group
        this.db.upsertGroup({
          accountId: group.zaloAccountId,
          groupId: group.groupId,
          groupName: group.groupName,
          memberCount: group.memberCount,
          scrapedAt: group.lastScrapedAt || new Date().toISOString(),
          synced: 1,
        });

        // Save group members
        if (group.members && group.members.length > 0) {
          const members = group.members.map((m: any) => ({
            accountId: group.zaloAccountId,
            groupId: group.groupId,
            userId: m.zaloId,
            displayName: m.displayName,
            avatar: m.avatar || '',
            role: m.role || 'member',
            synced: 1,
          }));
          this.db.insertGroupMembers(members);
        }

        pulled++;
      } catch (error: any) {
        console.error(`Failed to save group ${group.groupId}:`, error.message);
      }
    }

    console.log(`✅ Pulled ${pulled} groups`);
    return { pulled, total: groups.length };
  }

  /**
   * Pull messages from backend
   */
  async pullMessages(zaloAccountId?: number, limit: number = 1000) {
    console.log('⬇️ Pulling messages from backend...');

    const params: any = { limit };
    if (zaloAccountId) {
      params.zaloAccountId = zaloAccountId;
    }

    const response = await this.api.get('/api/sync/pull/messages', { params });
    const messages = response.data.data;

    let pulled = 0;
    for (const msg of messages) {
      try {
        // Check if message already exists
        const existing = this.db.getMessages(msg.conversationId, 1).find(
          (m) => m.messageId === msg.zaloMessageId
        );

        if (!existing) {
          this.db.insertMessage({
            accountId: msg.conversationId, // Using conversationId as accountId
            userId: msg.senderZaloId || '',
            message: msg.content || '',
            messageId: msg.zaloMessageId,
            status: msg.status || 'sent',
            sentAt: msg.sentAt || new Date().toISOString(),
            synced: 1,
          });
          pulled++;
        }
      } catch (error: any) {
        console.error(`Failed to save message ${msg.zaloMessageId}:`, error.message);
      }
    }

    console.log(`✅ Pulled ${pulled} messages`);
    return { pulled, total: messages.length };
  }

  /**
   * Pull templates from backend
   */
  async pullTemplates() {
    console.log('⬇️ Pulling templates from backend...');

    const response = await this.api.get('/api/sync/pull/templates');
    const templates = response.data.data;

    let pulled = 0;
    for (const template of templates) {
      try {
        // Check if template already exists by name (simple deduplication)
        const existingTemplates = this.db.getTemplates('', false);
        const existing = existingTemplates.find((t) => t.name === template.name);

        if (!existing) {
          this.db.createTemplate({
            accountId: template.zaloAccountId || undefined,
            name: template.name,
            content: template.content,
            variables: template.variables ? JSON.stringify(template.variables) : undefined,
            category: template.category || undefined,
            isActive: template.isActive ? 1 : 0,
            usageCount: 0,
          });
          pulled++;
        }
      } catch (error: any) {
        console.error(`Failed to save template ${template.name}:`, error.message);
      }
    }

    console.log(`✅ Pulled ${pulled} templates`);
    return { pulled, total: templates.length };
  }
}
