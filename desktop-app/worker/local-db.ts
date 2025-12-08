import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface MessageRecord {
  id?: number;
  accountId: number;
  userId: string;
  message: string;
  messageId: string;
  status: string;
  sentAt: string;
  synced: number;
}

export interface ContactRecord {
  id?: number;
  accountId: number;
  userId: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string;
  synced: number;
}

export interface GroupMemberRecord {
  id?: number;
  accountId: number;
  groupId: string;
  userId: string;
  displayName: string;
  avatar?: string;
  role?: string;
  synced: number;
}

export interface GroupRecord {
  id?: number;
  accountId: number;
  groupId: string;
  groupName: string;
  memberCount: number;
  scrapedAt: string;
  synced: number;
}

export interface TemplateRecord {
  id?: number;
  accountId?: number; // Optional - legacy field for backward compatibility
  agentId?: string; // User's agent ID - templates are now stored per user
  name: string;
  content: string;
  variables?: string; // JSON array of variable names like ["name", "phone"]
  category?: string;
  description?: string;
  imageUrl?: string; // Optional image URL to send with message
  isActive: number; // 0 or 1 (SQLite boolean)
  usageCount: number;
  attachments?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CampaignType =
  | 'message_to_phone'        // Gửi tin nhắn đến SĐTP
  | 'message_to_friends'      // Gửi tin nhắn đến bạn bè (Re-marketing)
  | 'message_to_group_members' // Gửi tin nhắn đến thành viên Group
  | 'message_to_group'        // Gửi tin nhắn đến Group
  | 'message_birthday'        // Gửi tin nhắn chúc mừng sinh nhật
  | 'friend_request_phone'    // Kết bạn đến SĐTP
  | 'friend_request_group'    // Kết bạn đến thành viên Group
  | 'friend_request_suggestions' // Kết bạn với gợi ý từ Zalo
  | 'invite_friend'           // Gửi lời mời kết bạn
  | 'cancel_invite_friend'    // Hủy lời mời kết bạn
  | 'add_to_group'            // Thêm thành viên vào Group
  | 'join_group_by_link';     // Tham gia vào Group bằng link

export interface CampaignRecord {
  id?: number;
  accountId: number;
  name: string;
  description?: string;
  campaignType: CampaignType;
  templateId?: number;
  recipients: string;
  targetSource?: string;
  groupId?: string;
  automationRules?: string;
  contactGroupId?: number; // NEW: Target by contact group
  scheduledAt?: string; // NEW: Scheduled campaign
  rateLimit?: number; // NEW: Max messages per hour
  delayMs: number;
  maxRetries: number;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'stopped';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactGroupRecord {
  id?: number;
  accountId: number;
  name: string;
  description?: string;
  color?: string;
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactGroupMemberRecord {
  id?: number;
  contactGroupId: number;
  contactId: number;
  createdAt?: string;
}

export interface AutoReplyRuleRecord {
  id?: number;
  accountId: number;
  name: string;
  description?: string;
  keywords: string; // JSON array
  replyMessage: string;
  isActive: number; // SQLite boolean (0 or 1)
  priority: number;
  matchType: 'exact' | 'contains' | 'regex';
  createdAt?: string;
  updatedAt?: string;
}

export class LocalDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/app.db') {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        message TEXT NOT NULL,
        messageId TEXT NOT NULL,
        status TEXT NOT NULL,
        sentAt TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        displayName TEXT NOT NULL,
        phoneNumber TEXT,
        avatar TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(accountId, userId)
      );

      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        groupId TEXT NOT NULL,
        groupName TEXT NOT NULL,
        memberCount INTEGER DEFAULT 0,
        scrapedAt TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(accountId, groupId)
      );

      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        groupId TEXT NOT NULL,
        userId TEXT NOT NULL,
        displayName TEXT NOT NULL,
        avatar TEXT,
        role TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(accountId, groupId, userId)
      );

      CREATE TABLE IF NOT EXISTS zalo_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER UNIQUE NOT NULL,
        zaloId TEXT,
        displayName TEXT,
        avatar TEXT,
        status TEXT DEFAULT 'inactive',
        lastLoginAt TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER,
        agentId TEXT,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        variables TEXT,
        category TEXT,
        description TEXT,
        isActive INTEGER DEFAULT 1,
        usageCount INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        campaignType TEXT NOT NULL DEFAULT 'message_to_phone',
        templateId INTEGER,
        recipients TEXT NOT NULL,
        targetSource TEXT,
        groupId TEXT,
        automationRules TEXT,
        contactGroupId INTEGER,
        scheduledAt TEXT,
        rateLimit INTEGER,
        delayMs INTEGER DEFAULT 2000,
        maxRetries INTEGER DEFAULT 2,
        status TEXT DEFAULT 'draft',
        totalRecipients INTEGER DEFAULT 0,
        sentCount INTEGER DEFAULT 0,
        failedCount INTEGER DEFAULT 0,
        startedAt TEXT,
        completedAt TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (templateId) REFERENCES templates(id),
        FOREIGN KEY (contactGroupId) REFERENCES contact_groups(id)
      );

      CREATE TABLE IF NOT EXISTS contact_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#1976d2',
        memberCount INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contact_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contactGroupId INTEGER NOT NULL,
        contactId INTEGER NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(contactGroupId, contactId),
        FOREIGN KEY (contactGroupId) REFERENCES contact_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS auto_reply_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        keywords TEXT NOT NULL,
        replyMessage TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        matchType TEXT DEFAULT 'contains',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_synced ON messages(synced);
      CREATE INDEX IF NOT EXISTS idx_contacts_synced ON contacts(synced);
      CREATE INDEX IF NOT EXISTS idx_groups_synced ON groups(synced);
      CREATE INDEX IF NOT EXISTS idx_group_members_synced ON group_members(synced);
      CREATE INDEX IF NOT EXISTS idx_templates_account ON templates(accountId, isActive);
      CREATE INDEX IF NOT EXISTS idx_campaigns_account ON campaigns(accountId, status);
      CREATE INDEX IF NOT EXISTS idx_contact_groups_account ON contact_groups(accountId);
      CREATE INDEX IF NOT EXISTS idx_contact_group_members_group ON contact_group_members(contactGroupId);
      CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_account ON auto_reply_rules(accountId, isActive, priority);
    `);

    // Migration: Add campaignType column to campaigns table if missing
    try {
      const campaignColumns = this.db.pragma('table_info(campaigns)') as Array<{ name: string }>;
      const hasCampaignType = campaignColumns.some((col) => col.name === 'campaignType');

      if (!hasCampaignType) {
        console.log('📝 Running migration: Adding campaignType column to campaigns table');
        this.db.exec(`ALTER TABLE campaigns ADD COLUMN campaignType TEXT NOT NULL DEFAULT 'message_to_phone'`);
        console.log('✅ Migration completed: campaignType column added');
      }
    } catch (error) {
      console.error('❌ Migration error (campaigns.campaignType):', error);
    }

    // Migration: Add attachments column to templates table if missing
    try {
      const templateColumns = this.db.pragma('table_info(templates)') as Array<{ name: string }>;
      const hasAttachments = templateColumns.some((col) => col.name === 'attachments');

      if (!hasAttachments) {
        console.log('📝 Running migration: Adding attachments column to templates table');
        this.db.exec(`ALTER TABLE templates ADD COLUMN attachments TEXT`);
        console.log('✅ Migration completed: attachments column added');
      }
    } catch (error) {
      console.error('❌ Migration error (templates.attachments):', error);
    }

    // Migration: Add imageUrl column to templates table if missing
    try {
      const templateColumns = this.db.pragma('table_info(templates)') as Array<{ name: string }>;
      const hasImageUrl = templateColumns.some((col) => col.name === 'imageUrl');

      if (!hasImageUrl) {
        console.log('📝 Running migration: Adding imageUrl column to templates table');
        this.db.exec(`ALTER TABLE templates ADD COLUMN imageUrl TEXT`);
        console.log('✅ Migration completed: imageUrl column added');
      }
    } catch (error) {
      console.error('❌ Migration error (templates.imageUrl):', error);
    }

    // Migration: Add missing columns to campaigns table
    try {
      const campaignColumns = this.db.pragma('table_info(campaigns)') as Array<{ name: string }>;

      const hasTargetSource = campaignColumns.some((col) => col.name === 'targetSource');
      if (!hasTargetSource) {
        console.log('📝 Running migration: Adding targetSource column to campaigns table');
        this.db.exec(`ALTER TABLE campaigns ADD COLUMN targetSource TEXT`);
        console.log('✅ Migration completed: targetSource column added');
      }

      const hasGroupId = campaignColumns.some((col) => col.name === 'groupId');
      if (!hasGroupId) {
        console.log('📝 Running migration: Adding groupId column to campaigns table');
        this.db.exec(`ALTER TABLE campaigns ADD COLUMN groupId TEXT`);
        console.log('✅ Migration completed: groupId column added');
      }

      const hasContactGroupId = campaignColumns.some((col) => col.name === 'contactGroupId');
      if (!hasContactGroupId) {
        console.log('📝 Running migration: Adding contactGroupId column to campaigns table');
        this.db.exec(`ALTER TABLE campaigns ADD COLUMN contactGroupId INTEGER`);
        console.log('✅ Migration completed: contactGroupId column added');
      }

      const hasAutomationRules = campaignColumns.some((col) => col.name === 'automationRules');
      if (!hasAutomationRules) {
        console.log('📝 Running migration: Adding automationRules column to campaigns table');
        this.db.exec(`ALTER TABLE campaigns ADD COLUMN automationRules TEXT`);
        console.log('✅ Migration completed: automationRules column added');
      }

      const hasScheduledAt = campaignColumns.some((col) => col.name === 'scheduledAt');
      if (!hasScheduledAt) {
        console.log('📝 Running migration: Adding scheduledAt column to campaigns table');
        this.db.exec(`ALTER TABLE campaigns ADD COLUMN scheduledAt TEXT`);
        console.log('✅ Migration completed: scheduledAt column added');
      }

      const hasRateLimit = campaignColumns.some((col) => col.name === 'rateLimit');
      if (!hasRateLimit) {
        console.log('📝 Running migration: Adding rateLimit column to campaigns table');
        this.db.exec(`ALTER TABLE campaigns ADD COLUMN rateLimit INTEGER`);
        console.log('✅ Migration completed: rateLimit column added');
      }
    } catch (error) {
      console.error('❌ Migration error (campaigns columns):', error);
    }

    // Migration: Rebuild templates table to support agentId and make accountId optional
    try {
      const columns = this.db.pragma('table_info(templates)') as Array<{ name: string; notnull: number }>;
      const hasAgentId = columns.some((col) => col.name === 'agentId');
      const accountIdCol = columns.find((col) => col.name === 'accountId');

      // Check if migration is needed (agentId doesn't exist OR accountId is NOT NULL)
      if (!hasAgentId || (accountIdCol && accountIdCol.notnull === 1)) {
        console.log('📝 Running migration: Rebuilding templates table with new schema');

        // Create new table with updated schema
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS templates_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            accountId INTEGER,
            agentId TEXT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            variables TEXT,
            category TEXT,
            description TEXT,
            isActive INTEGER DEFAULT 1,
            usageCount INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Copy data from old table to new table
        this.db.exec(`
          INSERT INTO templates_new (id, accountId, agentId, name, content, variables, category, description, isActive, usageCount, createdAt, updatedAt)
          SELECT
            id,
            accountId,
            ${hasAgentId ? 'agentId' : 'NULL'} as agentId,
            name,
            content,
            variables,
            category,
            description,
            isActive,
            usageCount,
            createdAt,
            updatedAt
          FROM templates;
        `);

        // Drop old table
        this.db.exec('DROP TABLE templates;');

        // Rename new table to original name
        this.db.exec('ALTER TABLE templates_new RENAME TO templates;');

        // Recreate indexes
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_templates_account ON templates(accountId, isActive);
          CREATE INDEX IF NOT EXISTS idx_templates_agent ON templates(agentId, isActive);
        `);

        console.log('✅ Migration completed: Templates table rebuilt successfully');
      }
    } catch (error) {
      console.error('❌ Migration error (templates):', error);
    }

    // Migration: Rebuild campaigns table to make templateId optional (nullable)
    try {
      const columns = this.db.pragma('table_info(campaigns)') as Array<{ name: string; notnull: number }>;
      const templateIdCol = columns.find((col) => col.name === 'templateId');

      // Check if templateId has NOT NULL constraint
      if (templateIdCol && templateIdCol.notnull === 1) {
        console.log('📝 Running migration: Rebuilding campaigns table to make templateId nullable');

        // Temporarily disable foreign key constraints for migration
        this.db.pragma('foreign_keys = OFF');

        // Create new table with updated schema (templateId nullable)
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS campaigns_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            accountId INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            campaignType TEXT NOT NULL DEFAULT 'message_to_phone',
            templateId INTEGER,
            recipients TEXT NOT NULL,
            targetSource TEXT,
            groupId TEXT,
            automationRules TEXT,
            contactGroupId INTEGER,
            scheduledAt TEXT,
            rateLimit INTEGER,
            delayMs INTEGER DEFAULT 2000,
            maxRetries INTEGER DEFAULT 2,
            status TEXT DEFAULT 'draft',
            totalRecipients INTEGER DEFAULT 0,
            sentCount INTEGER DEFAULT 0,
            failedCount INTEGER DEFAULT 0,
            startedAt TEXT,
            completedAt TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (templateId) REFERENCES templates(id),
            FOREIGN KEY (contactGroupId) REFERENCES contact_groups(id)
          );
        `);

        // Copy data from old table to new table with explicit column mapping
        this.db.exec(`
          INSERT INTO campaigns_new (
            id, accountId, name, description, campaignType, templateId, recipients,
            targetSource, groupId, automationRules, contactGroupId, scheduledAt,
            rateLimit, delayMs, maxRetries, status, totalRecipients, sentCount,
            failedCount, startedAt, completedAt, createdAt, updatedAt
          )
          SELECT
            id, accountId, name, description, campaignType, templateId, recipients,
            targetSource, groupId, automationRules, contactGroupId, scheduledAt,
            rateLimit, delayMs, maxRetries, status, totalRecipients, sentCount,
            failedCount, startedAt, completedAt, createdAt, updatedAt
          FROM campaigns;
        `);

        // Drop old table
        this.db.exec('DROP TABLE campaigns;');

        // Rename new table to original name
        this.db.exec('ALTER TABLE campaigns_new RENAME TO campaigns;');

        // Recreate indexes
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_campaigns_account ON campaigns(accountId, status);
          CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaignType);
        `);

        // Re-enable foreign key constraints
        this.db.pragma('foreign_keys = ON');

        console.log('✅ Migration completed: Campaigns table rebuilt with nullable templateId');
      }
    } catch (error) {
      console.error('❌ Migration error (campaigns templateId):', error);
      // Re-enable foreign key constraints even if migration fails
      this.db.pragma('foreign_keys = ON');
    }

    // Data fix: Repair totalRecipients that got corrupted during migration
    try {
      console.log('📝 Checking for corrupt campaign data...');

      const corruptCampaigns = this.db.prepare(`
        SELECT id, recipients, totalRecipients
        FROM campaigns
        WHERE typeof(totalRecipients) = 'text' OR totalRecipients IS NULL
      `).all() as Array<{ id: number; recipients: string; totalRecipients: any }>;

      if (corruptCampaigns.length > 0) {
        console.log(`🔧 Found ${corruptCampaigns.length} campaigns with corrupt data, fixing...`);

        const updateStmt = this.db.prepare('UPDATE campaigns SET totalRecipients = ? WHERE id = ?');

        for (const campaign of corruptCampaigns) {
          try {
            let recipientCount = 0;
            if (campaign.recipients) {
              const recipientsArray = JSON.parse(campaign.recipients);
              recipientCount = Array.isArray(recipientsArray) ? recipientsArray.length : 0;
            }
            updateStmt.run(recipientCount, campaign.id);
          } catch (parseError) {
            console.error(`❌ Error fixing campaign ${campaign.id}:`, parseError);
            // Set to 0 if we can't parse
            updateStmt.run(0, campaign.id);
          }
        }

        console.log(`✅ Fixed ${corruptCampaigns.length} campaigns with corrupt totalRecipients`);
      }
    } catch (error) {
      console.error('❌ Error fixing corrupt campaign data:', error);
    }
  }

  // ==================== MESSAGES ====================

  insertMessage(msg: Omit<MessageRecord, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO messages (accountId, userId, message, messageId, status, sentAt, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      msg.accountId,
      msg.userId,
      msg.message,
      msg.messageId,
      msg.status,
      msg.sentAt,
      msg.synced,
    );
    return result.lastInsertRowid as number;
  }

  getUnsyncedMessages(): MessageRecord[] {
    return this.db.prepare('SELECT * FROM messages WHERE synced = 0').all() as MessageRecord[];
  }

  markMessagesSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`UPDATE messages SET synced = 1 WHERE id IN (${placeholders})`);
    stmt.run(...ids);
  }

  getMessages(accountId: number, limit: number = 100): MessageRecord[] {
    return this.db
      .prepare('SELECT * FROM messages WHERE accountId = ? ORDER BY sentAt DESC LIMIT ?')
      .all(accountId, limit) as MessageRecord[];
  }

  getMessagesWithFilter(
    accountId: number,
    filters: {
      startDate?: string;
      endDate?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): { messages: MessageRecord[]; total: number } {
    const { startDate, endDate, status, search, limit = 50, offset = 0 } = filters;

    let query = `
      SELECT m.*, c.displayName, c.phoneNumber
      FROM messages m
      LEFT JOIN contacts c ON m.accountId = c.accountId AND m.userId = c.userId
      WHERE m.accountId = ?
    `;
    const params: any[] = [accountId];

    if (startDate) {
      query += ' AND m.sentAt >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND m.sentAt <= ?';
      params.push(endDate);
    }

    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (m.message LIKE ? OR c.displayName LIKE ? OR c.phoneNumber LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT m.*, c.displayName, c.phoneNumber',
      'SELECT COUNT(*) as total'
    );
    const countResult = this.db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;

    // Get paginated results
    query += ' ORDER BY m.sentAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const messages = this.db.prepare(query).all(...params) as MessageRecord[];

    return { messages, total };
  }

  // ==================== CONTACTS ====================

  upsertContact(contact: Omit<ContactRecord, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO contacts (accountId, userId, displayName, phoneNumber, avatar, synced)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(accountId, userId) DO UPDATE SET
        displayName = excluded.displayName,
        phoneNumber = excluded.phoneNumber,
        avatar = excluded.avatar,
        synced = 0
    `);
    stmt.run(
      contact.accountId,
      contact.userId,
      contact.displayName,
      contact.phoneNumber || null,
      contact.avatar || null,
      contact.synced,
    );
  }

  getUnsyncedContacts(): ContactRecord[] {
    return this.db.prepare('SELECT * FROM contacts WHERE synced = 0').all() as ContactRecord[];
  }

  markContactsSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`UPDATE contacts SET synced = 1 WHERE id IN (${placeholders})`);
    stmt.run(...ids);
  }

  getContacts(accountId: number): ContactRecord[] {
    return this.db
      .prepare('SELECT * FROM contacts WHERE accountId = ? ORDER BY displayName')
      .all(accountId) as ContactRecord[];
  }

  getContactById(id: number): ContactRecord | null {
    const contact = this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRecord | undefined;
    return contact || null;
  }

  deleteContact(id: number): void {
    // Also remove from contact group memberships
    this.db.prepare('DELETE FROM contact_group_members WHERE contactId = ?').run(id);
    this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  }

  bulkDeleteContacts(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');

    // Remove from contact group memberships
    this.db.prepare(`DELETE FROM contact_group_members WHERE contactId IN (${placeholders})`).run(...ids);

    // Delete contacts
    this.db.prepare(`DELETE FROM contacts WHERE id IN (${placeholders})`).run(...ids);
  }

  getContactsFiltered(params: {
    accountId: number;
    search?: string;
    groupId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { contacts: ContactRecord[]; total: number } {
    let query = 'SELECT DISTINCT c.* FROM contacts c';
    let countQuery = 'SELECT COUNT(DISTINCT c.id) as total FROM contacts c';
    const whereClauses: string[] = ['c.accountId = ?'];
    const queryParams: any[] = [params.accountId];
    const countParams: any[] = [params.accountId];

    // Join with contact_group_members if filtering by group
    if (params.groupId) {
      query += ' INNER JOIN contact_group_members cgm ON c.id = cgm.contactId';
      countQuery += ' INNER JOIN contact_group_members cgm ON c.id = cgm.contactId';
      whereClauses.push('cgm.contactGroupId = ?');
      queryParams.push(params.groupId);
      countParams.push(params.groupId);
    }

    // Search filter
    if (params.search && params.search.trim() !== '') {
      whereClauses.push('(c.displayName LIKE ? OR c.userId LIKE ? OR c.phoneNumber LIKE ?)');
      const searchPattern = `%${params.search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Add WHERE clause
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Get total count
    const totalResult = this.db.prepare(countQuery).get(...countParams) as { total: number };
    const total = totalResult.total;

    // Add ORDER BY and pagination
    query += ' ORDER BY c.displayName';

    if (params.limit !== undefined) {
      query += ' LIMIT ?';
      queryParams.push(params.limit);
    }

    if (params.offset !== undefined) {
      query += ' OFFSET ?';
      queryParams.push(params.offset);
    }

    const contacts = this.db.prepare(query).all(...queryParams) as ContactRecord[];

    return { contacts, total };
  }

  // ==================== GROUPS ====================

  upsertGroup(group: Omit<GroupRecord, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO groups (accountId, groupId, groupName, memberCount, scrapedAt, synced)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(accountId, groupId) DO UPDATE SET
        groupName = excluded.groupName,
        memberCount = excluded.memberCount,
        scrapedAt = excluded.scrapedAt,
        synced = 0
    `);
    stmt.run(
      group.accountId,
      group.groupId,
      group.groupName,
      group.memberCount,
      group.scrapedAt,
      group.synced,
    );
  }

  getUnsyncedGroups(): GroupRecord[] {
    return this.db.prepare('SELECT * FROM groups WHERE synced = 0').all() as GroupRecord[];
  }

  markGroupsSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`UPDATE groups SET synced = 1 WHERE id IN (${placeholders})`);
    stmt.run(...ids);
  }

  getGroups(accountId: number): GroupRecord[] {
    return this.db
      .prepare('SELECT * FROM groups WHERE accountId = ? ORDER BY scrapedAt DESC')
      .all(accountId) as GroupRecord[];
  }

  // ==================== GROUP MEMBERS ====================

  insertGroupMembers(members: Omit<GroupMemberRecord, 'id'>[]): void {
    if (members.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO group_members (accountId, groupId, userId, displayName, avatar, role, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((members: Omit<GroupMemberRecord, 'id'>[]) => {
      for (const member of members) {
        stmt.run(
          member.accountId,
          member.groupId,
          member.userId,
          member.displayName,
          member.avatar || null,
          member.role || null,
          member.synced,
        );
      }
    });

    transaction(members);
  }

  getUnsyncedGroupMembers(): GroupMemberRecord[] {
    return this.db
      .prepare('SELECT * FROM group_members WHERE synced = 0')
      .all() as GroupMemberRecord[];
  }

  markGroupMembersSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(
      `UPDATE group_members SET synced = 1 WHERE id IN (${placeholders})`,
    );
    stmt.run(...ids);
  }

  getGroupMembers(accountId: number, groupId: string): GroupMemberRecord[] {
    return this.db
      .prepare('SELECT * FROM group_members WHERE accountId = ? AND groupId = ?')
      .all(accountId, groupId) as GroupMemberRecord[];
  }

  // ==================== ACCOUNTS ====================

  upsertAccount(account: {
    accountId: number;
    zaloId?: string;
    displayName?: string;
    avatar?: string;
    status?: string;
    lastLoginAt?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO zalo_accounts (accountId, zaloId, displayName, avatar, status, lastLoginAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(accountId) DO UPDATE SET
        zaloId = excluded.zaloId,
        displayName = excluded.displayName,
        avatar = excluded.avatar,
        status = excluded.status,
        lastLoginAt = excluded.lastLoginAt
    `);
    stmt.run(
      account.accountId,
      account.zaloId || null,
      account.displayName || null,
      account.avatar || null,
      account.status || 'inactive',
      account.lastLoginAt || null,
    );
  }

  updateAccountStatus(accountId: number, status: 'active' | 'inactive'): void {
    const stmt = this.db.prepare(`
      UPDATE zalo_accounts
      SET status = ?
      WHERE accountId = ?
    `);
    stmt.run(status, accountId);
    console.log(`📝 Updated account ${accountId} status to: ${status}`);
  }

  getActiveAccounts(): number[] {
    const accounts = this.db
      .prepare("SELECT accountId FROM zalo_accounts WHERE status = 'active'")
      .all() as { accountId: number }[];
    return accounts.map((a) => a.accountId);
  }

  getAllAccounts() {
    return this.db.prepare('SELECT * FROM zalo_accounts').all();
  }

  findAccountByZaloId(zaloId: string): { accountId: number } | undefined {
    return this.db
      .prepare('SELECT accountId FROM zalo_accounts WHERE zaloId = ?')
      .get(zaloId) as { accountId: number } | undefined;
  }

  deleteZaloAccount(accountId: number): { success: boolean; deletedData: any } {
    // Get account info before deletion
    const account = this.db
      .prepare('SELECT * FROM zalo_accounts WHERE accountId = ?')
      .get(accountId);

    if (!account) {
      throw new Error(`Không tìm thấy tài khoản với ID: ${accountId}`);
    }

    // Count related data that will be deleted
    const campaignsCount = (this.db
      .prepare('SELECT COUNT(*) as count FROM campaigns WHERE accountId = ?')
      .get(accountId) as { count: number }).count;

    const messagesCount = (this.db
      .prepare('SELECT COUNT(*) as count FROM messages WHERE accountId = ?')
      .get(accountId) as { count: number }).count;

    const contactsCount = (this.db
      .prepare('SELECT COUNT(*) as count FROM contacts WHERE accountId = ?')
      .get(accountId) as { count: number }).count;

    const groupsCount = (this.db
      .prepare('SELECT COUNT(*) as count FROM groups WHERE accountId = ?')
      .get(accountId) as { count: number }).count;

    // Get contact group IDs for this account (to delete contact_group_members)
    const contactGroupIds = (this.db
      .prepare('SELECT id FROM contact_groups WHERE accountId = ?')
      .all(accountId) as { id: number }[]).map(g => g.id);

    // Delete related data in order (to respect foreign key constraints)
    this.db.prepare('DELETE FROM group_members WHERE accountId = ?').run(accountId);
    this.db.prepare('DELETE FROM groups WHERE accountId = ?').run(accountId);

    // Delete contact_group_members via contactGroupId (table doesn't have accountId column)
    if (contactGroupIds.length > 0) {
      const placeholders = contactGroupIds.map(() => '?').join(',');
      this.db.prepare(`DELETE FROM contact_group_members WHERE contactGroupId IN (${placeholders})`).run(...contactGroupIds);
    }

    // Delete contact_groups
    this.db.prepare('DELETE FROM contact_groups WHERE accountId = ?').run(accountId);

    this.db.prepare('DELETE FROM messages WHERE accountId = ?').run(accountId);
    this.db.prepare('DELETE FROM campaigns WHERE accountId = ?').run(accountId);
    this.db.prepare('DELETE FROM contacts WHERE accountId = ?').run(accountId);

    // Delete the account itself
    this.db.prepare('DELETE FROM zalo_accounts WHERE accountId = ?').run(accountId);

    return {
      success: true,
      deletedData: {
        account,
        campaignsCount,
        messagesCount,
        contactsCount,
        groupsCount,
      },
    };
  }

  // ==================== TEMPLATES ====================

  createTemplate(template: Omit<TemplateRecord, 'id' | 'createdAt' | 'updatedAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO templates (accountId, agentId, name, content, variables, category, description, imageUrl, isActive, usageCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      template.accountId || null,
      template.agentId || null,
      template.name,
      template.content,
      template.variables || null,
      template.category || null,
      template.description || null,
      template.imageUrl || null,
      template.isActive,
      template.usageCount,
    );
    return result.lastInsertRowid as number;
  }

  getTemplates(agentId: string, activeOnly: boolean = false): TemplateRecord[] {
    const query = activeOnly
      ? 'SELECT * FROM templates WHERE agentId = ? AND isActive = 1 ORDER BY name'
      : 'SELECT * FROM templates WHERE agentId = ? ORDER BY name';
    return this.db.prepare(query).all(agentId) as TemplateRecord[];
  }

  getTemplateById(id: number): TemplateRecord | undefined {
    return this.db
      .prepare('SELECT * FROM templates WHERE id = ?')
      .get(id) as TemplateRecord | undefined;
  }

  updateTemplate(
    id: number,
    updates: Partial<Omit<TemplateRecord, 'id' | 'accountId' | 'createdAt' | 'updatedAt'>>,
  ): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.variables !== undefined) {
      fields.push('variables = ?');
      values.push(updates.variables);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.imageUrl !== undefined) {
      fields.push('imageUrl = ?');
      values.push(updates.imageUrl);
    }
    if (updates.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(updates.isActive);
    }
    if (updates.usageCount !== undefined) {
      fields.push('usageCount = ?');
      values.push(updates.usageCount);
    }

    if (fields.length === 0) return;

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  deleteTemplate(id: number): void {
    const stmt = this.db.prepare('DELETE FROM templates WHERE id = ?');
    stmt.run(id);
  }

  incrementTemplateUsage(id: number): void {
    const stmt = this.db.prepare('UPDATE templates SET usageCount = usageCount + 1 WHERE id = ?');
    stmt.run(id);
  }

  // ==================== CAMPAIGNS ====================

  createCampaign(campaign: Omit<CampaignRecord, 'id' | 'createdAt' | 'updatedAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO campaigns (
        accountId, name, description, campaignType, templateId, recipients, targetSource,
        groupId, automationRules, contactGroupId, scheduledAt, rateLimit, delayMs,
        maxRetries, status, totalRecipients, sentCount, failedCount, startedAt, completedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      campaign.accountId,
      campaign.name,
      campaign.description || null,
      campaign.campaignType,
      campaign.templateId || null,
      campaign.recipients,
      campaign.targetSource || null,
      campaign.groupId || null,
      campaign.automationRules || null,
      campaign.contactGroupId || null,
      campaign.scheduledAt || null,
      campaign.rateLimit || null,
      campaign.delayMs,
      campaign.maxRetries,
      campaign.status,
      campaign.totalRecipients,
      campaign.sentCount,
      campaign.failedCount,
      campaign.startedAt || null,
      campaign.completedAt || null,
    );
    return result.lastInsertRowid as number;
  }

  getCampaigns(accountId: number, status?: string): CampaignRecord[] {
    const query = status
      ? 'SELECT * FROM campaigns WHERE accountId = ? AND status = ? ORDER BY createdAt DESC'
      : 'SELECT * FROM campaigns WHERE accountId = ? ORDER BY createdAt DESC';

    return status
      ? (this.db.prepare(query).all(accountId, status) as CampaignRecord[])
      : (this.db.prepare(query).all(accountId) as CampaignRecord[]);
  }

  getCampaignById(id: number): CampaignRecord | undefined {
    return this.db
      .prepare('SELECT * FROM campaigns WHERE id = ?')
      .get(id) as CampaignRecord | undefined;
  }

  getScheduledCampaignsToRun(): CampaignRecord[] {
    // Get campaigns with status='scheduled' and scheduledAt <= current time
    const query = `
      SELECT * FROM campaigns
      WHERE status = 'scheduled'
      AND scheduledAt IS NOT NULL
      AND scheduledAt <= datetime('now')
      ORDER BY scheduledAt ASC
    `;
    return this.db.prepare(query).all() as CampaignRecord[];
  }

  updateCampaign(
    id: number,
    updates: Partial<Omit<CampaignRecord, 'id' | 'accountId' | 'createdAt' | 'updatedAt'>>,
  ): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.campaignType !== undefined) {
      fields.push('campaignType = ?');
      values.push(updates.campaignType);
    }
    if (updates.templateId !== undefined) {
      fields.push('templateId = ?');
      values.push(updates.templateId);
    }
    if (updates.recipients !== undefined) {
      fields.push('recipients = ?');
      values.push(updates.recipients);
    }
    if (updates.targetSource !== undefined) {
      fields.push('targetSource = ?');
      values.push(updates.targetSource);
    }
    if (updates.groupId !== undefined) {
      fields.push('groupId = ?');
      values.push(updates.groupId);
    }
    if (updates.automationRules !== undefined) {
      fields.push('automationRules = ?');
      values.push(updates.automationRules);
    }
    if (updates.delayMs !== undefined) {
      fields.push('delayMs = ?');
      values.push(updates.delayMs);
    }
    if (updates.maxRetries !== undefined) {
      fields.push('maxRetries = ?');
      values.push(updates.maxRetries);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.totalRecipients !== undefined) {
      fields.push('totalRecipients = ?');
      values.push(updates.totalRecipients);
    }
    if (updates.sentCount !== undefined) {
      fields.push('sentCount = ?');
      values.push(updates.sentCount);
    }
    if (updates.failedCount !== undefined) {
      fields.push('failedCount = ?');
      values.push(updates.failedCount);
    }
    if (updates.startedAt !== undefined) {
      fields.push('startedAt = ?');
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completedAt = ?');
      values.push(updates.completedAt);
    }

    if (fields.length === 0) return;

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  deleteCampaign(id: number): void {
    const stmt = this.db.prepare('DELETE FROM campaigns WHERE id = ?');
    stmt.run(id);
  }

  getPreviousRecipients(
    accountId: number,
    dateFrom?: string,
    dateTo?: string
  ): Array<{ userId: string; displayName: string; phoneNumber?: string; lastSentAt?: string }> {
    // Build query with optional date filters
    let query = `
      SELECT recipients, completedAt, createdAt FROM campaigns
      WHERE accountId = ? AND sentCount > 0
    `;
    const params: any[] = [accountId];

    if (dateFrom) {
      query += ` AND (completedAt >= ? OR (completedAt IS NULL AND createdAt >= ?))`;
      params.push(dateFrom, dateFrom);
    }

    if (dateTo) {
      query += ` AND (completedAt <= ? OR (completedAt IS NULL AND createdAt <= ?))`;
      params.push(dateTo, dateTo);
    }

    query += ` ORDER BY completedAt DESC, createdAt DESC`;

    const campaigns = this.db.prepare(query).all(...params) as Array<{
      recipients: string;
      completedAt?: string;
      createdAt: string;
    }>;

    // Extract and deduplicate recipients, keeping track of last sent date
    const recipientMap = new Map<string, {
      userId: string;
      displayName: string;
      phoneNumber?: string;
      lastSentAt?: string;
    }>();

    campaigns.forEach((campaign) => {
      try {
        const recipients = JSON.parse(campaign.recipients) as Array<{
          userId: string;
          displayName: string;
          phoneNumber?: string;
          variables?: any;
        }>;

        const campaignDate = campaign.completedAt || campaign.createdAt;

        recipients.forEach((recipient) => {
          const existing = recipientMap.get(recipient.userId);

          // Add recipient or update if this campaign is more recent
          if (!existing || (campaignDate && (!existing.lastSentAt || campaignDate > existing.lastSentAt))) {
            recipientMap.set(recipient.userId, {
              userId: recipient.userId,
              displayName: recipient.displayName,
              phoneNumber: recipient.phoneNumber,
              lastSentAt: campaignDate,
            });
          }
        });
      } catch (error) {
        console.error('Error parsing campaign recipients:', error);
      }
    });

    return Array.from(recipientMap.values());
  }

  // ==================== CONTACT GROUPS ====================

  createContactGroup(group: Omit<ContactGroupRecord, 'id' | 'createdAt' | 'updatedAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO contact_groups (accountId, name, description, color, memberCount)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      group.accountId,
      group.name,
      group.description || null,
      group.color || '#1976d2',
      group.memberCount || 0,
    );
    return result.lastInsertRowid as number;
  }

  getContactGroups(accountId: number): ContactGroupRecord[] {
    return this.db
      .prepare('SELECT * FROM contact_groups WHERE accountId = ? ORDER BY createdAt DESC')
      .all(accountId) as ContactGroupRecord[];
  }

  getContactGroupById(id: number): ContactGroupRecord | null {
    return (this.db.prepare('SELECT * FROM contact_groups WHERE id = ?').get(id) as ContactGroupRecord) || null;
  }

  updateContactGroup(id: number, updates: Partial<ContactGroupRecord>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.memberCount !== undefined) {
      fields.push('memberCount = ?');
      values.push(updates.memberCount);
    }

    if (fields.length === 0) return;

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE contact_groups SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  deleteContactGroup(id: number): void {
    const stmt = this.db.prepare('DELETE FROM contact_groups WHERE id = ?');
    stmt.run(id);
  }

  // Contact Group Members

  addContactToGroup(contactGroupId: number, contactId: number): number {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO contact_group_members (contactGroupId, contactId)
        VALUES (?, ?)
      `);
      const result = stmt.run(contactGroupId, contactId);

      // Update member count
      this.db.prepare(`
        UPDATE contact_groups
        SET memberCount = (SELECT COUNT(*) FROM contact_group_members WHERE contactGroupId = ?)
        WHERE id = ?
      `).run(contactGroupId, contactGroupId);

      return result.lastInsertRowid as number;
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint')) {
        throw new Error('Contact already in this group');
      }
      throw error;
    }
  }

  removeContactFromGroup(contactGroupId: number, contactId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM contact_group_members
      WHERE contactGroupId = ? AND contactId = ?
    `);
    stmt.run(contactGroupId, contactId);

    // Update member count
    this.db.prepare(`
      UPDATE contact_groups
      SET memberCount = (SELECT COUNT(*) FROM contact_group_members WHERE contactGroupId = ?)
      WHERE id = ?
    `).run(contactGroupId, contactGroupId);
  }

  getContactGroupMembers(contactGroupId: number): ContactRecord[] {
    return this.db.prepare(`
      SELECT c.*
      FROM contacts c
      INNER JOIN contact_group_members cgm ON c.id = cgm.contactId
      WHERE cgm.contactGroupId = ?
      ORDER BY c.displayName ASC
    `).all(contactGroupId) as ContactRecord[];
  }

  getContactGroupsForContact(contactId: number): ContactGroupRecord[] {
    return this.db.prepare(`
      SELECT cg.*
      FROM contact_groups cg
      INNER JOIN contact_group_members cgm ON cg.id = cgm.contactGroupId
      WHERE cgm.contactId = ?
      ORDER BY cg.name ASC
    `).all(contactId) as ContactGroupRecord[];
  }

  // ==================== AUTO REPLY RULES ====================

  createAutoReplyRule(rule: Omit<AutoReplyRuleRecord, 'id' | 'createdAt' | 'updatedAt'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO auto_reply_rules (accountId, name, description, keywords, replyMessage, isActive, priority, matchType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      rule.accountId,
      rule.name,
      rule.description || null,
      rule.keywords,
      rule.replyMessage,
      rule.isActive,
      rule.priority,
      rule.matchType
    );
    return result.lastInsertRowid as number;
  }

  getAutoReplyRules(accountId: number, activeOnly: boolean = false): AutoReplyRuleRecord[] {
    let query = 'SELECT * FROM auto_reply_rules WHERE accountId = ?';
    const params: any[] = [accountId];

    if (activeOnly) {
      query += ' AND isActive = 1';
    }

    query += ' ORDER BY priority DESC, createdAt DESC';

    return this.db.prepare(query).all(...params) as AutoReplyRuleRecord[];
  }

  getAutoReplyRuleById(id: number): AutoReplyRuleRecord | null {
    return this.db.prepare('SELECT * FROM auto_reply_rules WHERE id = ?').get(id) as AutoReplyRuleRecord | null;
  }

  updateAutoReplyRule(id: number, updates: Partial<AutoReplyRuleRecord>): void {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE auto_reply_rules SET ${fields.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);
  }

  deleteAutoReplyRule(id: number): void {
    this.db.prepare('DELETE FROM auto_reply_rules WHERE id = ?').run(id);
  }

  matchAutoReplyRule(accountId: number, incomingMessage: string): AutoReplyRuleRecord | null {
    const rules = this.getAutoReplyRules(accountId, true);

    for (const rule of rules) {
      const keywords = JSON.parse(rule.keywords) as string[];

      for (const keyword of keywords) {
        let matched = false;

        switch (rule.matchType) {
          case 'exact':
            matched = incomingMessage.toLowerCase() === keyword.toLowerCase();
            break;
          case 'contains':
            matched = incomingMessage.toLowerCase().includes(keyword.toLowerCase());
            break;
          case 'regex':
            try {
              const regex = new RegExp(keyword, 'i');
              matched = regex.test(incomingMessage);
            } catch (e) {
              console.error('Invalid regex:', keyword);
            }
            break;
        }

        if (matched) {
          return rule;
        }
      }
    }

    return null;
  }

  // ==================== ANALYTICS ====================

  getCampaignStatistics(accountId: number): {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalMessagesSent: number;
    totalMessagesFailed: number;
    successRate: number;
  } {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as totalCampaigns,
        COALESCE(SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END), 0) as activeCampaigns,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completedCampaigns,
        COALESCE(SUM(sentCount), 0) as totalMessagesSent,
        COALESCE(SUM(failedCount), 0) as totalMessagesFailed
      FROM campaigns
      WHERE accountId = ?
    `).get(accountId) as any;

    const successRate = stats.totalMessagesSent + stats.totalMessagesFailed > 0
      ? (stats.totalMessagesSent / (stats.totalMessagesSent + stats.totalMessagesFailed)) * 100
      : 0;

    return {
      totalCampaigns: stats.totalCampaigns || 0,
      activeCampaigns: stats.activeCampaigns || 0,
      completedCampaigns: stats.completedCampaigns || 0,
      totalMessagesSent: stats.totalMessagesSent || 0,
      totalMessagesFailed: stats.totalMessagesFailed || 0,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  getTemplateUsageStatistics(accountId: number): Array<{
    templateId: number;
    templateName: string;
    usageCount: number;
    totalMessagesSent: number;
  }> {
    // Templates are now stored per user (agentId), not per account
    // So we show all user's templates with campaign stats for this specific account
    return this.db.prepare(`
      SELECT
        t.id as templateId,
        t.name as templateName,
        COUNT(c.id) as usageCount,
        COALESCE(SUM(c.sentCount), 0) as totalMessagesSent
      FROM templates t
      LEFT JOIN campaigns c ON t.id = c.templateId AND c.accountId = ?
      WHERE t.isActive = 1
      GROUP BY t.id, t.name
      ORDER BY usageCount DESC, totalMessagesSent DESC
      LIMIT 10
    `).all(accountId) as any[];
  }

  getCampaignTypeStatistics(accountId: number): Array<{
    campaignType: string;
    count: number;
    totalSent: number;
    totalFailed: number;
  }> {
    try {
      const result = this.db.prepare(`
        SELECT
          campaignType,
          COUNT(*) as count,
          COALESCE(SUM(sentCount), 0) as totalSent,
          COALESCE(SUM(failedCount), 0) as totalFailed
        FROM campaigns
        WHERE accountId = ?
        GROUP BY campaignType
        ORDER BY count DESC
      `).all(accountId) as any[];

      console.log(`📊 getCampaignTypeStatistics for account ${accountId}:`, result.length, 'types');
      return result;
    } catch (error) {
      console.error(`❌ Error in getCampaignTypeStatistics for account ${accountId}:`, error);
      throw error;
    }
  }

  getMessageStatisticsByDate(accountId: number, days: number = 30): Array<{
    date: string;
    count: number;
  }> {
    return this.db.prepare(`
      SELECT
        DATE(sentAt) as date,
        COUNT(*) as count
      FROM messages
      WHERE accountId = ? AND sentAt >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(sentAt)
      ORDER BY date ASC
    `).all(accountId, days) as any[];
  }

  getContactGroupStatistics(accountId: number): Array<{
    groupId: number;
    groupName: string;
    memberCount: number;
  }> {
    return this.db.prepare(`
      SELECT
        id as groupId,
        name as groupName,
        memberCount
      FROM contact_groups
      WHERE accountId = ?
      ORDER BY memberCount DESC
      LIMIT 10
    `).all(accountId) as any[];
  }

  getAutoReplyStatistics(accountId: number): {
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
  } {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as totalRules,
        SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeRules,
        SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END) as inactiveRules
      FROM auto_reply_rules
      WHERE accountId = ?
    `).get(accountId) as any;

    return {
      totalRules: stats.totalRules || 0,
      activeRules: stats.activeRules || 0,
      inactiveRules: stats.inactiveRules || 0,
    };
  }

  // ==================== UTILITY ====================

  close(): void {
    this.db.close();
  }

  getStats() {
    const messagesCount = this.db
      .prepare('SELECT COUNT(*) as count FROM messages')
      .get() as { count: number };
    const contactsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM contacts')
      .get() as { count: number };
    const groupsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM groups')
      .get() as { count: number };

    // Count unsynced items
    const unsyncedMessagesCount = this.db
      .prepare('SELECT COUNT(*) as count FROM messages WHERE synced = 0')
      .get() as { count: number };
    const unsyncedContactsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM contacts WHERE synced = 0')
      .get() as { count: number };
    const unsyncedGroupMembersCount = this.db
      .prepare('SELECT COUNT(*) as count FROM group_members WHERE synced = 0')
      .get() as { count: number };

    return {
      messages: messagesCount.count,
      contacts: contactsCount.count,
      groups: groupsCount.count,
      unsyncedMessages: unsyncedMessagesCount.count,
      unsyncedContacts: unsyncedContactsCount.count,
      unsyncedGroupMembers: unsyncedGroupMembersCount.count,
    };
  }
}
