import axios from 'axios';

const LOCAL_API_BASE = 'http://localhost:3001';

const localApi = axios.create({
  baseURL: LOCAL_API_BASE,
  timeout: 30000,
});

export interface LoginResult {
  success: boolean;
  qrCode?: string;
  qrCodeImage?: string;
  message?: string;
  status?: 'pending' | 'scanning' | 'success' | 'timeout' | 'error';
  error?: string;
  accountId?: number;
  merged?: boolean;
  data?: {
    restored?: boolean;
  };
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    groupId: string;
    members: Array<{
      userId: string;
      displayName: string;
      avatar?: string;
      role?: string;
      phoneNumber?: string;
    }>;
  };
  error?: string;
}

export interface ZaloAccount {
  id: number;
  displayName: string;
  avatar?: string;
  phoneNumber?: string;
  userId: string;
  status: 'active' | 'inactive';
}

export interface SyncStatus {
  lastSyncAt?: string;
  unsyncedMessages: number;
  unsyncedContacts: number;
  unsyncedGroupMembers: number;
  syncEnabled?: boolean;
  apiKeyValid?: boolean | null;
  hasApiKey?: boolean;
  hasBackendUrl?: boolean;
}

export interface BackendConfig {
  apiUrl?: string;
  agentId: string;
  apiKey: string;
  userId?: string;
}

// Zalo Operations
export const loginZalo = async (accountId: number): Promise<LoginResult> => {
  const response = await localApi.post('/local/login', { accountId });
  return response.data;
};

export const checkLoginStatus = async (accountId: number): Promise<LoginResult> => {
  const response = await localApi.post('/local/check-login', { accountId });
  return response.data;
};

export const logoutZalo = async (accountId: number): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await localApi.post('/local/logout', { accountId });
  return response.data;
};

export const cancelLogin = async (accountId: number): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await localApi.post('/local/cancel-login', { accountId });
  return response.data;
};

export const validateSessions = async (): Promise<{
  success: boolean;
  data?: {
    total: number;
    valid: number;
    invalid: number;
    results: Array<{
      accountId: number;
      displayName: string;
      isValid: boolean;
      error?: string;
    }>;
  };
  error?: string;
}> => {
  const response = await localApi.post('/local/validate-sessions');
  return response.data;
};

export const sendMessage = async (
  accountId: number,
  userId: string,
  message: string,
  imageUrl?: string,
  isGroup?: boolean,
): Promise<SendMessageResult> => {
  const response = await localApi.post('/local/send-message', {
    accountId,
    userId,
    message,
    imageUrl,
    isGroup,
  });
  return response.data;
};

export const sendFriendRequest = async (
  accountId: number,
  userId: string,
  message: string,
): Promise<SendMessageResult> => {
  const response = await localApi.post('/local/send-friend-request', {
    accountId,
    userId,
    message,
  });
  return response.data;
};

export const scrapeGroup = async (
  accountId: number,
  groupLink: string,
): Promise<ScrapeResult> => {
  const response = await localApi.post('/local/scrape-group', {
    accountId,
    groupLink,
  });
  return response.data;
};

// Account Management
export const getZaloAccounts = async (): Promise<ZaloAccount[]> => {
  const response = await localApi.get('/local/accounts');
  return response.data;
};

export const deleteZaloAccount = async (accountId: number): Promise<{
  success: boolean;
  message?: string;
  deletedData?: {
    campaignsCount: number;
    messagesCount: number;
    contactsCount: number;
    groupsCount: number;
  };
  error?: string;
}> => {
  const response = await localApi.delete(`/local/accounts/${accountId}`);
  return response.data;
};

// Template Management (now stored per user, not per Zalo account)
export interface Template {
  id: number;
  agentId?: string;
  name: string;
  content: string;
  imageUrl?: string; // Optional image to send with message
  variables?: string[];
  category?: string;
  description?: string;
  isActive: number;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getTemplates = async (activeOnly: boolean = false): Promise<Template[]> => {
  const response = await localApi.get('/local/templates', {
    params: { activeOnly },
  });
  return response.data.data;
};

export const getTemplateById = async (id: number): Promise<Template> => {
  const response = await localApi.get(`/local/templates/detail/${id}`);
  return response.data.data;
};

export const createTemplate = async (template: {
  name: string;
  content: string;
  variables?: string[];
  category?: string;
  description?: string;
  isActive?: number;
}): Promise<Template> => {
  const response = await localApi.post('/local/templates', template);
  return response.data.data;
};

export const updateTemplate = async (
  id: number,
  updates: Partial<Template>
): Promise<Template> => {
  const response = await localApi.patch(`/local/templates/${id}`, updates);
  return response.data.data;
};

export const deleteTemplate = async (id: number): Promise<void> => {
  await localApi.delete(`/local/templates/${id}`);
};

// Sync Management
export const getSyncStatus = async (): Promise<SyncStatus> => {
  const response = await localApi.get('/local/sync/status');
  return response.data;
};

export const triggerSync = async (): Promise<void> => {
  await localApi.post('/local/sync/trigger');
};

export interface PullSyncResult {
  success: boolean;
  message?: string;
  data?: {
    contacts: { pulled: number; error: string | null };
    groups: { pulled: number; error: string | null };
    messages: { pulled: number; error: string | null };
    templates: { pulled: number; error: string | null };
  };
  error?: string;
}

export const pullSyncFromBackend = async (zaloAccountId?: number): Promise<PullSyncResult> => {
  const response = await localApi.post('/local/sync/pull', { zaloAccountId });
  return response.data;
};

// Backend Configuration
export const getBackendConfig = async (): Promise<BackendConfig> => {
  const response = await localApi.get('/local/config');
  return response.data;
};

export const saveBackendConfig = async (config: BackendConfig): Promise<void> => {
  await localApi.post('/local/config', config);
};

export const registerAgent = async (
  username: string,
  password: string,
): Promise<{ agentId: string; apiKey: string }> => {
  const response = await localApi.post('/local/register-agent', {
    username,
    password,
  });
  return response.data;
};

export const findUser = async (
  accountId: number,
  phoneNumber: string,
): Promise<{
  success: boolean;
  user?: {
    userId: string;
    displayName: string;
    avatar?: string;
    phoneNumber?: string;
  };
  error?: string;
}> => {
  const response = await localApi.post('/local/find-user', {
    accountId,
    phoneNumber,
  });
  return response.data;
};

export const getFriendSuggestions = async (
  accountId: number,
  limit?: number,
): Promise<{
  success: boolean;
  data?: Array<{
    userId: string;
    displayName: string;
    avatar?: string;
  }>;
  error?: string;
}> => {
  const response = await localApi.post('/local/get-friend-suggestions', {
    accountId,
    limit,
  });
  return response.data;
};

export const cancelFriendRequest = async (
  accountId: number,
  userId: string,
): Promise<{
  success: boolean;
  error?: string;
}> => {
  const response = await localApi.post('/local/cancel-friend-request', {
    accountId,
    userId,
  });
  return response.data;
};

export const addMembersToGroup = async (
  accountId: number,
  groupId: string,
  userIds: string[],
): Promise<{
  success: boolean;
  data?: {
    total: number;
    successCount: number;
    failedCount: number;
    results: Array<{ userId: string; success: boolean; error?: string }>;
  };
  error?: string;
}> => {
  const response = await localApi.post('/local/add-members-to-group', {
    accountId,
    groupId,
    userIds,
  });
  return response.data;
};

export const joinGroup = async (
  accountId: number,
  groupLink: string,
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  const response = await localApi.post('/local/join-group', {
    accountId,
    groupLink,
  });
  return response.data;
};

export const getContactsWithBirthday = async (
  accountId: number,
  todayOnly: boolean = false,
): Promise<{
  success: boolean;
  data?: Array<{
    userId: string;
    displayName: string;
    birthday?: string;
    phoneNumber?: string;
    avatar?: string;
  }>;
  error?: string;
}> => {
  const response = await localApi.get(`/local/contacts-with-birthday/${accountId}`, {
    params: { today: todayOnly },
  });
  return response.data;
};

// Contact Groups
export interface ContactGroup {
  id: number;
  accountId: number;
  name: string;
  description?: string;
  color?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export const getContactGroups = async (accountId: number): Promise<ContactGroup[]> => {
  const response = await localApi.get(`/local/contact-groups/${accountId}`);
  return response.data.data;
};

export const createContactGroup = async (
  accountId: number,
  name: string,
  description?: string,
  color?: string,
): Promise<ContactGroup> => {
  const response = await localApi.post('/local/contact-groups', {
    accountId,
    name,
    description,
    color,
  });
  return response.data.data;
};

export const getContactGroupById = async (id: number): Promise<ContactGroup> => {
  const response = await localApi.get(`/local/contact-groups/detail/${id}`);
  return response.data.data;
};

export const updateContactGroup = async (
  id: number,
  updates: { name?: string; description?: string; color?: string },
): Promise<ContactGroup> => {
  const response = await localApi.patch(`/local/contact-groups/${id}`, updates);
  return response.data.data;
};

export const deleteContactGroup = async (id: number): Promise<void> => {
  await localApi.delete(`/local/contact-groups/${id}`);
};

export const addContactToGroup = async (groupId: number, contactId: number): Promise<ContactGroup> => {
  const response = await localApi.post(`/local/contact-groups/${groupId}/members`, {
    contactId,
  });
  return response.data.data;
};

export const removeContactFromGroup = async (
  groupId: number,
  contactId: number,
): Promise<ContactGroup> => {
  const response = await localApi.delete(`/local/contact-groups/${groupId}/members/${contactId}`);
  return response.data.data;
};

export const getContactGroupMembers = async (
  groupId: number,
): Promise<
  Array<{
    id: number;
    userId: string;
    displayName: string;
    phoneNumber?: string;
    avatar?: string;
  }>
> => {
  const response = await localApi.get(`/local/contact-groups/${groupId}/members`);
  return response.data.data;
};

// Campaign - Previous Recipients
export const getPreviousRecipients = async (
  accountId: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<{
  success: boolean;
  data?: Array<{
    userId: string;
    displayName: string;
    phoneNumber?: string;
    lastSentAt?: string;
  }>;
  total?: number;
  error?: string;
}> => {
  const params: any = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const response = await localApi.get(`/local/campaigns/previous-recipients/${accountId}`, {
    params,
  });
  return response.data;
};

export default localApi;
