import {
  Phone,
  Group,
  Message,
  Cake,
  PersonAdd,
  Lightbulb,
  Cancel,
  GroupAdd,
  Link,
  Autorenew,
} from '@mui/icons-material';

export type CampaignType =
  | 'message_to_phone'
  | 'message_to_friends'
  | 'message_to_group_members'
  | 'message_to_group'
  | 'message_birthday'
  | 'friend_request_phone'
  | 'friend_request_group'
  | 'friend_request_suggestions'
  | 'invite_friend'
  | 'cancel_invite_friend'
  | 'add_to_group'
  | 'join_group_by_link';

export interface CampaignTypeConfig {
  type: CampaignType;
  label: string;
  description: string;
  icon: any;
  color: string;
  requiresTemplate: boolean;
  requiresGroup: boolean;
  category: 'messaging' | 'friend_request' | 'group_management' | 'automation';
}

export const CAMPAIGN_TYPES: Record<CampaignType, CampaignTypeConfig> = {
  message_to_phone: {
    type: 'message_to_phone',
    label: 'Gửi tin nhắn đến SĐT',
    description: 'Tìm người dùng qua số điện thoại và gửi tin nhắn',
    icon: Phone,
    color: '#1976d2',
    requiresTemplate: true,
    requiresGroup: false,
    category: 'messaging',
  },
  message_to_friends: {
    type: 'message_to_friends',
    label: 'Re-marketing đến người nhận cũ',
    description: 'Gửi tin nhắn đến những người đã được gửi tin trước đây',
    icon: Autorenew,
    color: '#2e7d32',
    requiresTemplate: true,
    requiresGroup: false,
    category: 'messaging',
  },
  message_to_group_members: {
    type: 'message_to_group_members',
    label: 'Gửi tin nhắn đến thành viên Group',
    description: 'Gửi tin nhắn riêng cho từng thành viên trong nhóm',
    icon: Group,
    color: '#ed6c02',
    requiresTemplate: true,
    requiresGroup: true,
    category: 'messaging',
  },
  message_to_group: {
    type: 'message_to_group',
    label: 'Gửi tin nhắn đến Group',
    description: 'Gửi tin nhắn vào nhóm chat',
    icon: Message,
    color: '#0288d1',
    requiresTemplate: true,
    requiresGroup: true,
    category: 'messaging',
  },
  message_birthday: {
    type: 'message_birthday',
    label: 'Gửi tin nhắn chúc mừng sinh nhật',
    description: 'Tự động gửi tin nhắn chúc mừng sinh nhật (Automation)',
    icon: Cake,
    color: '#d32f2f',
    requiresTemplate: true,
    requiresGroup: false,
    category: 'automation',
  },
  friend_request_phone: {
    type: 'friend_request_phone',
    label: 'Kết bạn đến SĐT',
    description: 'Tìm người dùng qua số điện thoại và gửi lời mời kết bạn',
    icon: Phone,
    color: '#7b1fa2',
    requiresTemplate: false,
    requiresGroup: false,
    category: 'friend_request',
  },
  friend_request_group: {
    type: 'friend_request_group',
    label: 'Kết bạn đến thành viên Group',
    description: 'Gửi lời mời kết bạn đến thành viên trong nhóm',
    icon: Group,
    color: '#c2185b',
    requiresTemplate: false,
    requiresGroup: true,
    category: 'friend_request',
  },
  friend_request_suggestions: {
    type: 'friend_request_suggestions',
    label: 'Kết bạn với gợi ý từ Zalo',
    description: 'Gửi lời mời kết bạn đến danh sách gợi ý của Zalo',
    icon: Lightbulb,
    color: '#f57c00',
    requiresTemplate: false,
    requiresGroup: false,
    category: 'friend_request',
  },
  invite_friend: {
    type: 'invite_friend',
    label: 'Gửi lời mời kết bạn',
    description: 'Gửi lời mời kết bạn đến danh sách người dùng',
    icon: PersonAdd,
    color: '#388e3c',
    requiresTemplate: false,
    requiresGroup: false,
    category: 'friend_request',
  },
  cancel_invite_friend: {
    type: 'cancel_invite_friend',
    label: 'Hủy lời mời kết bạn',
    description: 'Hủy các lời mời kết bạn đã gửi',
    icon: Cancel,
    color: '#d32f2f',
    requiresTemplate: false,
    requiresGroup: false,
    category: 'friend_request',
  },
  add_to_group: {
    type: 'add_to_group',
    label: 'Thêm thành viên vào Group',
    description: 'Thêm danh sách người dùng vào nhóm',
    icon: GroupAdd,
    color: '#1976d2',
    requiresTemplate: false,
    requiresGroup: true,
    category: 'group_management',
  },
  join_group_by_link: {
    type: 'join_group_by_link',
    label: 'Tham gia vào Group bằng link',
    description: 'Tự động tham gia vào các nhóm qua link mời',
    icon: Link,
    color: '#0288d1',
    requiresTemplate: false,
    requiresGroup: false,
    category: 'group_management',
  },
};

// Helper functions
export const getCampaignTypeConfig = (type: CampaignType): CampaignTypeConfig => {
  return CAMPAIGN_TYPES[type];
};

export const getCampaignTypeLabel = (type: CampaignType): string => {
  return CAMPAIGN_TYPES[type]?.label || type;
};

export const getCampaignTypesByCategory = (
  category: 'messaging' | 'friend_request' | 'group_management' | 'automation'
): CampaignTypeConfig[] => {
  return Object.values(CAMPAIGN_TYPES).filter((config) => config.category === category);
};

export const getAllCampaignTypes = (): CampaignTypeConfig[] => {
  return Object.values(CAMPAIGN_TYPES);
};

export const requiresTemplate = (type: CampaignType): boolean => {
  return CAMPAIGN_TYPES[type]?.requiresTemplate || false;
};

export const requiresGroup = (type: CampaignType): boolean => {
  return CAMPAIGN_TYPES[type]?.requiresGroup || false;
};

// Check if campaign type requires loading group members
export const requiresGroupMembers = (type: CampaignType): boolean => {
  // These campaign types need to load group members list
  return type === 'message_to_group_members' || type === 'friend_request_group';
};

// Check if campaign type supports direct phone number input
export const supportsPhoneInput = (type: CampaignType): boolean => {
  // Only these campaign types work with phone numbers directly
  return type === 'message_to_phone' || type === 'friend_request_phone';
};

// Check if campaign type supports optional template (not required but can be used)
export const supportsOptionalTemplate = (type: CampaignType): boolean => {
  // Friend request campaigns can optionally use template for custom greeting message
  return type === 'friend_request_phone'
    || type === 'friend_request_group'
    || type === 'friend_request_suggestions'
    || type === 'invite_friend';
};

// Category labels
export const CATEGORY_LABELS = {
  messaging: 'Gửi tin nhắn',
  friend_request: 'Kết bạn',
  group_management: 'Quản lý nhóm',
  automation: 'Tự động hóa',
};

// Target source options for different campaign types
export const TARGET_SOURCE_OPTIONS = {
  message_to_phone: ['phone'],
  message_to_friends: ['previous_recipients'],
  message_to_group_members: ['group_members'],
  message_to_group: ['group'],
  message_birthday: ['contacts'],
  friend_request_phone: ['phone'],
  friend_request_group: ['group_members'],
  friend_request_suggestions: ['suggestions'],
  invite_friend: ['phone', 'contacts'],
  cancel_invite_friend: ['sent_requests'],
  add_to_group: ['phone', 'contacts', 'friends'],
  join_group_by_link: ['group_links'],
};