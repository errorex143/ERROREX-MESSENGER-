export type ThemeName =
  | 'gold'
  | 'emerald'
  | 'ocean'
  | 'purple'
  | 'rose'
  | 'sunset'
  | 'electric'
  | 'teal'
  | 'white'
  | 'black'
  | 'crimson'
  | 'midnight'
  | 'forest'
  | 'bronze';

export type ColorMode = 'dark' | 'light' | 'system';

export interface ContactItem {
  id: string;
  name: string;
  username: string;
  bio?: string;
  photoURL?: string;
  isOnline?: boolean;
  createdAt: string;
}

export interface PrivacySettings {
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  bio: 'everyone' | 'contacts' | 'nobody';
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  createdAt: string;
  updatedAt?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface UserSettings {
  theme: ThemeName;
  mode: ColorMode;
  soundEnabled: boolean;
  readReceipts: boolean;
  lastSeenPrivacy: 'everyone' | 'friends' | 'nobody';
  statusPrivacy: 'everyone' | 'friends' | 'nobody';
  profilePhotoPrivacy: 'everyone' | 'friends' | 'nobody';
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderPhoto?: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  users: string[];
  createdAt: string;
  friendProfile?: UserProfile;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails?: Record<string, { displayName: string; username: string; photoURL?: string }>;
  isGroup: boolean;
  groupName?: string;
  groupPhoto?: string;
  adminIds?: string[];
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'none' | 'image' | 'video' | 'file' | 'audio';
  audioDuration?: number;
  createdAt: string;
  readBy?: string[];
  deliveryStatus?: 'sent' | 'delivered' | 'read'; // sent = 1 tick (receiver net off), delivered = 2 ticks black (receiver net on, not seen), read = 2 ticks blue (seen)
  replyToMessageId?: string;
  replyToText?: string;
  reactions?: Record<string, string>; // { [userId]: emoji }
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface UserStatus {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  type: 'text' | 'image' | 'video';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  bgColor?: string;
  viewers?: string[];
  createdAt: string;
  expiresAt: string;
}

export interface CallRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  offer?: string;
  answer?: string;
  createdAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'friend_request' | 'request_accepted' | 'call_missed' | 'group_invite';
  title: string;
  body: string;
  senderId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}
