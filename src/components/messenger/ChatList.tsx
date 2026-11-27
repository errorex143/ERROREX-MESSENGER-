import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Friendship, UserProfile } from '../../types';
import { chatStore } from '../../lib/chatStore';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { getCollectionData } from '../../lib/standaloneApi';
import { isUserCurrentlyOnline } from '../../lib/supabaseSync';
import {
  canViewProfilePhoto,
  canViewBio,
  canViewLastSeen,
  canExchangeReadReceipts,
  resolveTargetPrivacy
} from '../../lib/privacyUtils';
import { AvatarPreviewModal, AvatarPreviewTarget } from '../common/AvatarPreviewModal';
import { formatChatPreviewText } from '../common/CustomStickers';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  Lock,
  Mic,
  Image as ImageIcon,
  Check,
  CheckCheck,
  ShieldCheck,
  X,
  Filter,
  MoreVertical,
  Pin,
  Bell,
  BellOff,
  Archive,
  Ban,
  Trash2,
  User,
  Shield,
  Sparkles
} from 'lucide-react';

interface ChatListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChat: () => void;
  currentUserId: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  currentUserId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');

  // 3-dot dropdown menu state
  const [openMenuConvId, setOpenMenuConvId] = useState<string | null>(null);

  // Profile View Modal state
  const [viewingProfileUser, setViewingProfileUser] = useState<{
    displayName: string;
    username: string;
    photoURL?: string;
    bio?: string;
    isOnline?: boolean;
    isGroup?: boolean;
    conversationId?: string;
    showOnlineStatus?: boolean;
    photoHiddenByPrivacy?: boolean;
    bioHiddenByPrivacy?: boolean;
  } | null>(null);
  const [dpPreviewTarget, setDpPreviewTarget] = useState<AvatarPreviewTarget | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const [directoryProfiles, setDirectoryProfiles] = useState<UserProfile[]>(() =>
    getCollectionData('userProfiles') as UserProfile[]
  );
  const [, setPresenceTick] = useState(0);

  // Subscribe to live userProfiles presence + refresh tick so stale lastSeen flips offline
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'userProfiles'), snap => {
      const list: UserProfile[] = [];
      snap.forEach((d: any) => list.push(d.data() as UserProfile));
      setDirectoryProfiles(list);
    });
    const tick = setInterval(() => setPresenceTick(t => t + 1), 20000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, []);

  // Close 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuConvId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const savedContacts = chatStore.getContacts();
  const friendships = getCollectionData<Friendship>('friendships');
  const myPrivacy = chatStore.getPrivacySettings();

  const getLiveProfileForConv = (conv: Conversation): UserProfile | undefined => {
    if (conv.isGroup) return undefined;
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const details = otherId ? conv.participantDetails?.[otherId] : null;
    const uName = details?.username || '';
    return directoryProfiles.find(
      p => p.uid === otherId || (p.username && uName && p.username.toLowerCase() === uName.toLowerCase())
    );
  };

  const getChatTitle = (conv: Conversation): string => {
    if (conv.isGroup) return conv.groupName || 'Group Conversation';
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const details = otherId ? conv.participantDetails?.[otherId] : null;
    const liveProfile = getLiveProfileForConv(conv);
    const uName = liveProfile?.username || details?.username || '';
    const contactItem = savedContacts.find(
      c => (c.username && uName && c.username.toLowerCase() === uName.toLowerCase()) || c.id === otherId
    );
    if (liveProfile?.displayName) return liveProfile.displayName;
    if (contactItem) return contactItem.name;
    if (details) return details.displayName;
    return conv.groupName || 'Private Contact';
  };

  const getChatUsername = (conv: Conversation): string => {
    if (conv.isGroup) return 'group';
    const liveProfile = getLiveProfileForConv(conv);
    if (liveProfile?.username) return liveProfile.username;
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    if (otherId && conv.participantDetails?.[otherId]?.username) {
      return conv.participantDetails[otherId].username;
    }
    return 'contact';
  };

  const getChatAvatar = (conv: Conversation): string | null => {
    if (conv.isGroup) return conv.groupPhoto || null;
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const details = otherId ? conv.participantDetails?.[otherId] : null;
    const liveProfile = getLiveProfileForConv(conv);
    const uName = liveProfile?.username || details?.username || '';
    const contactItem = savedContacts.find(
      c => (c.username && uName && c.username.toLowerCase() === uName.toLowerCase()) || c.id === otherId
    );
    if (liveProfile?.photoURL) return liveProfile.photoURL;
    if (contactItem?.photoURL) return contactItem.photoURL;
    if (details?.photoURL) return details.photoURL;
    return null;
  };

  const getChatBio = (conv: Conversation): string => {
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const details = otherId ? conv.participantDetails?.[otherId] : null;
    const liveProfile = getLiveProfileForConv(conv);
    const uName = getChatUsername(conv);
    const contactItem = savedContacts.find(
      c => (c.username && uName && c.username.toLowerCase() === uName.toLowerCase()) || c.id === otherId
    );
    return liveProfile?.bio || details?.bio || contactItem?.bio || 'Available on ERROREX';
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv => {
    // Archived filter
    if (filter === 'archived') {
      if (!conv.isArchived) return false;
    } else if (conv.isArchived) {
      // By default hide archived chats in 'all', 'unread', 'pinned'
      return false;
    }

    // Pinned filter
    if (filter === 'pinned' && !conv.isPinned) {
      return false;
    }

    // Unread filter
    if (filter === 'unread' && (!conv.unreadCount || conv.unreadCount === 0)) {
      return false;
    }

    if (conv.isGroup) {
      return (conv.groupName || 'Group').toLowerCase().includes(searchTerm.toLowerCase());
    }

    // Direct chat search
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const details = otherId ? conv.participantDetails?.[otherId] : null;
    const title = getChatTitle(conv);

    if (details) {
      return (
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        details.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        details.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.lastMessageText || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Sort pinned chats to the top
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime();
  });

  const handleOpenMenu = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(prev => (prev === convId ? null : convId));
  };

  const handleViewProfile = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const otherDetail = otherId ? conv.participantDetails?.[otherId] : undefined;
    const username = getChatUsername(conv);
    const liveProfile = directoryProfiles.find(
      p => p.uid === otherId || (p.username && username && p.username.toLowerCase() === username.toLowerCase())
    );
    const matchedContact = savedContacts.find(
      c => (c.username && username && c.username.toLowerCase() === username.toLowerCase()) || c.id === otherId
    );
    const allowPhoto =
      conv.isGroup ||
      canViewProfilePhoto(currentUserId, otherId, username, liveProfile, otherDetail, savedContacts, friendships);
    const allowBio =
      conv.isGroup ||
      canViewBio(currentUserId, otherId, username, liveProfile, otherDetail, savedContacts, friendships);
    const allowOnline =
      conv.isGroup ||
      canViewLastSeen(currentUserId, otherId, username, liveProfile, otherDetail, savedContacts, friendships);
    const isOnlineNow = conv.isGroup
      ? true
      : liveProfile
      ? isUserCurrentlyOnline(liveProfile)
      : matchedContact
      ? matchedContact.isOnline === true
      : false;
    setViewingProfileUser({
      displayName: getChatTitle(conv),
      username,
      photoURL: allowPhoto ? getChatAvatar(conv) || undefined : undefined,
      bio: allowBio ? getChatBio(conv) : undefined,
      isOnline: allowOnline ? isOnlineNow : false,
      isGroup: conv.isGroup,
      conversationId: conv.id,
      showOnlineStatus: allowOnline,
      photoHiddenByPrivacy: !allowPhoto,
      bioHiddenByPrivacy: !allowBio
    });
  };

  const handleTogglePin = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    chatStore.togglePin(convId);
  };

  const handleToggleMute = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    chatStore.toggleMute(convId);
  };

  const handleToggleArchive = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    chatStore.toggleArchive(convId);
  };

  const handleToggleBlock = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    chatStore.toggleBlock(convId);
  };

  const handleDeleteChat = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    if (window.confirm('Are you sure you want to delete this chat and all message history?')) {
      chatStore.deleteConversation(convId);
    }
  };

  const unreadChatsCount = conversations.filter(c => !c.isArchived && c.unreadCount && c.unreadCount > 0).length;
  const totalUnreadMessages = conversations
    .filter(c => !c.isArchived && c.unreadCount && c.unreadCount > 0)
    .reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="w-full h-full bg-[var(--bg-list)] border-r border-[var(--accent-border)] flex flex-col shrink-0 select-none transition-colors relative">
      {/* Top Header: All Chats Details, Unread Notification Mark & Count */}
      <div className="p-3.5 border-b border-neutral-200 dark:border-white/5 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-sm sm:text-base font-display font-bold gold-gradient-text truncate">
              Messages & Chats
            </h1>
            <span className="text-xs font-mono text-[var(--accent-primary)] font-semibold tabular-nums shrink-0">
              ({conversations.length})
            </span>
            {totalUnreadMessages > 0 && (
              <button
                type="button"
                onClick={() => setFilter(prev => (prev === 'unread' ? 'all' : 'unread'))}
                title="Tap to filter unread messages"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-black text-[10px] font-mono tabular-nums font-bold shadow-sm cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
              >
                <Bell className="w-2.5 h-2.5 fill-current" />
                <span>{totalUnreadMessages}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenNewChat}
            className="min-h-[40px] py-2 px-3.5 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1.5 transition-all shadow-sm border border-[var(--accent-border)] hover:border-[var(--accent-primary)] whitespace-nowrap shrink-0 cursor-pointer"
            title="Start New Conversation"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs font-bold">New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search name, @username, or message..."
            className="w-full pl-9 pr-10 py-2.5 sm:py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors shadow-inner"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="w-8 h-8 flex items-center justify-center rounded-lg absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips: All, Unread, Pinned, Archived */}
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[34px] py-1.5 px-3 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all shadow-sm cursor-pointer shrink-0 tabular-nums ${
              filter === 'all'
                ? 'bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-primary)] font-bold'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--accent-border)] hover:text-[var(--text-main)] hover:border-[var(--accent-primary)]'
            }`}
          >
            All ({conversations.filter(c => !c.isArchived).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`min-h-[34px] py-1.5 px-3 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 tabular-nums ${
              filter === 'unread'
                ? 'bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-primary)] font-bold'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--accent-border)] hover:text-[var(--text-main)] hover:border-[var(--accent-primary)]'
            }`}
          >
            {unreadChatsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shrink-0" />
            )}
            <span>
              Unread ({unreadChatsCount})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('pinned')}
            className={`min-h-[34px] py-1.5 px-3 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 shadow-sm cursor-pointer shrink-0 tabular-nums ${
              filter === 'pinned'
                ? 'bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-primary)] font-bold'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--accent-border)] hover:text-[var(--text-main)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <Pin className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Pinned ({conversations.filter(c => c.isPinned && !c.isArchived).length})</span>
          </button>
          {conversations.some(c => c.isArchived) && (
            <button
              type="button"
              onClick={() => setFilter('archived')}
              className={`min-h-[34px] py-1.5 px-3 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 shadow-sm cursor-pointer shrink-0 tabular-nums ${
                filter === 'archived'
                  ? 'bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-primary)] font-bold'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--accent-border)] hover:text-[var(--text-main)] hover:border-[var(--accent-primary)]'
              }`}
            >
              <Archive className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>Archived ({conversations.filter(c => c.isArchived).length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Conversations List with 3-Dot Options on Every Chat User */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-white/[0.03]">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-[var(--accent-primary)]" />
            <p className="text-xs">No conversations match your filter</p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 text-[11px] text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              Start a new dialogue
            </button>
          </div>
        ) : (
          sortedConversations.map(conv => {
            const isActive = conv.id === activeConversationId;
            const title = getChatTitle(conv);
            const username = getChatUsername(conv);
            const avatar = getChatAvatar(conv);
            const isFromMe = conv.lastMessageSenderId === currentUserId;

            const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
            const otherDetail = otherId ? conv.participantDetails?.[otherId] : undefined;
            const liveProfile = directoryProfiles.find(
              p => p.uid === otherId || (p.username && username && p.username.toLowerCase() === username.toLowerCase())
            );
            const matchedContact = savedContacts.find(
              c => (c.username && username && c.username.toLowerCase() === username.toLowerCase()) || c.id === otherId
            );
            const allowPhoto =
              conv.isGroup ||
              canViewProfilePhoto(currentUserId, otherId, username, liveProfile, otherDetail, savedContacts, friendships);
            const allowBio =
              conv.isGroup ||
              canViewBio(currentUserId, otherId, username, liveProfile, otherDetail, savedContacts, friendships);
            const allowOnline =
              conv.isGroup ||
              canViewLastSeen(currentUserId, otherId, username, liveProfile, otherDetail, savedContacts, friendships);
            const targetPrivacy = resolveTargetPrivacy(liveProfile, otherDetail);
            const allowReadReceipts = conv.isGroup
              ? myPrivacy.readReceipts !== false
              : canExchangeReadReceipts(myPrivacy, targetPrivacy);

            const isContactNetActiveRaw = conv.isGroup
              ? true
              : otherId === 'vault_secure' || conv.id === 'conv_vault'
              ? true
              : liveProfile
              ? isUserCurrentlyOnline(liveProfile)
              : matchedContact
              ? matchedContact.isOnline === true
              : false;
            const isContactNetActive = allowOnline ? isContactNetActiveRaw : false;
            const visibleAvatar = allowPhoto ? avatar : null;
            const visibleBio = allowBio ? getChatBio(conv) : null;

            const msgs = chatStore.getMessages(conv.id);
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const isSeen =
              allowReadReceipts &&
              (lastMsg?.deliveryStatus === 'read' ||
                Boolean(lastMsg?.readBy && lastMsg.readBy.some(id => id !== currentUserId)));
            const isDelivered =
              !isSeen &&
              (lastMsg?.deliveryStatus === 'delivered' ||
                lastMsg?.deliveryStatus === 'read' ||
                (!lastMsg?.deliveryStatus && isContactNetActive));

            const hasUnread = Boolean(conv.unreadCount && conv.unreadCount > 0);
            const isMenuOpen = openMenuConvId === conv.id;

            return (
              <div
                key={conv.id}
                className={`w-full p-3.5 flex items-start gap-3 transition-colors text-left relative group cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent-surface)]'
                    : hasUnread
                    ? 'bg-[var(--accent-surface)]/45 border-l-[3px] border-l-[var(--accent-primary)] hover:bg-[var(--accent-surface)]/65'
                    : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-900/50'
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                {/* Contact DP / Avatar with click-to-zoom lightbox, unread mark & privacy-respecting online dot */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setDpPreviewTarget({
                      displayName: title,
                      username,
                      photoURL: visibleAvatar,
                      bio: visibleBio,
                      isOnline: isContactNetActive,
                      showOnlineStatus: allowOnline,
                      photoHiddenByPrivacy: !allowPhoto,
                      bioHiddenByPrivacy: !allowBio
                    });
                  }}
                  className="relative shrink-0 cursor-pointer group/dp"
                  title="Tap to view DP & Bio"
                >
                  <div
                    className={`w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-900 border flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm overflow-hidden shadow-inner transition-colors ${
                      hasUnread
                        ? 'border-2 border-[var(--accent-primary)]'
                        : 'border-[var(--accent-border)] group-hover/dp:border-[var(--accent-primary)]'
                    }`}
                  >
                    {visibleAvatar ? (
                      <img src={visibleAvatar} alt={title} className="w-full h-full object-cover" />
                    ) : conv.isGroup ? (
                      <Users className="w-5 h-5 text-[var(--accent-primary)]" />
                    ) : (
                      title.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  {hasUnread && (
                    <span
                      title="New unread message"
                      className="w-3 h-3 rounded-full bg-[var(--accent-primary)] border-2 border-[var(--bg-list)] absolute -top-0.5 -right-0.5 shadow-sm"
                    />
                  )}
                  {allowOnline && (
                    <span
                      title={isContactNetActive ? 'Online' : 'Offline'}
                      className={`w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-list)] absolute bottom-0 right-0 ${
                        isContactNetActive ? 'bg-emerald-500' : 'bg-neutral-500'
                      }`}
                    />
                  )}
                </button>

                {/* Details Column: Title, Username, Last Message, Time, Badges */}
                <div className="flex-1 min-w-0 pr-10">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                      <span className="text-[13px] sm:text-xs font-bold text-[var(--text-main)] truncate">
                        {title}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--accent-primary)] truncate opacity-80 shrink-0 max-w-[82px] sm:max-w-[120px]">
                        @{username}
                      </span>
                      {conv.isPinned && (
                        <span title="Pinned Chat">
                          <Pin className="w-3 h-3 text-[var(--accent-primary)] shrink-0 inline fill-[var(--accent-primary)]" />
                        </span>
                      )}
                      {conv.isMuted && (
                        <span title="Notifications Muted">
                          <BellOff className="w-3 h-3 text-neutral-400 shrink-0 inline" />
                        </span>
                      )}
                      {conv.isBlocked && (
                        <span title="User Blocked">
                          <Ban className="w-3 h-3 text-rose-500 shrink-0 inline" />
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-mono tabular-nums shrink-0 ${
                        hasUnread
                          ? 'text-[var(--accent-primary)] font-bold'
                          : 'text-neutral-500'
                      }`}
                    >
                      {formatTime(conv.lastMessageAt || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex items-center gap-1 min-w-0 text-xs truncate pr-2 ${
                        hasUnread
                          ? 'text-[var(--text-main)] font-semibold'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {isFromMe && (
                        isSeen ? (
                          <span title="Seen (Double Blue Tick)" className="inline-flex items-center">
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400 dark:text-sky-400 shrink-0 stroke-[2.5]" />
                          </span>
                        ) : isDelivered ? (
                          <span title="Delivered (Double Black/Grey Tick)" className="inline-flex items-center">
                            <CheckCheck className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 shrink-0 stroke-[2.2]" />
                          </span>
                        ) : (
                          <span title="Sent (1 Tick - Net Offline)" className="inline-flex items-center">
                            <Check className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 shrink-0 stroke-[2.2]" />
                          </span>
                        )
                      )}
                      {conv.lastMessageText?.startsWith('🎤') ? (
                        <span className="flex items-center gap-1 text-[var(--accent-primary)] font-mono text-[11px] truncate">
                          <Mic className="w-3 h-3 shrink-0" />
                          <span>Voice memo</span>
                        </span>
                      ) : (
                        <span className="truncate">{formatChatPreviewText(conv.lastMessageText)}</span>
                      )}
                    </div>

                    {hasUnread && (
                      <span
                        title={`${conv.unreadCount} unread message${(conv.unreadCount || 0) > 1 ? 's' : ''}`}
                        className="min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-mono tabular-nums font-bold bg-[var(--accent-primary)] text-black flex items-center justify-center shrink-0 shadow-sm"
                      >
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-DOT ACTION BUTTON (Required: 3-dot on every chat user) */}
                <div className="absolute right-2 top-3 z-10" ref={isMenuOpen ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={e => handleOpenMenu(e, conv.id)}
                    aria-label="Chat options"
                    className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 dark:hover:bg-black/40 text-neutral-500 dark:text-neutral-400 hover:text-[var(--accent-primary)] flex items-center justify-center transition-all cursor-pointer"
                    title="Chat Options (Profile, Mark Unread/Read, Pin, Mute, Archive, Block, Delete)"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* 3-DOT DROPDOWN MENU */}
                  {isMenuOpen && (
                    <div
                      className="absolute right-0 top-9 w-48 max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl py-1.5 z-50 text-[var(--text-main)]"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Option 1: Profile View */}
                      <button
                        type="button"
                        onClick={e => handleViewProfile(e, conv)}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span className="font-medium">Profile View</span>
                      </button>

                      {/* Option: Mark as Read / Unread */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuConvId(null);
                          if (hasUnread) {
                            chatStore.markAsRead(conv.id, currentUserId);
                          } else {
                            chatStore.markAsUnread(conv.id);
                          }
                        }}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>{hasUnread ? 'Mark as Read' : 'Mark as Unread'}</span>
                      </button>

                      {/* Option 2: Pin / Unpin */}
                      <button
                        type="button"
                        onClick={e => handleTogglePin(e, conv.id)}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                      >
                        <Pin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>{conv.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
                      </button>

                      {/* Option 3: Notification Mute / Unmute */}
                      <button
                        type="button"
                        onClick={e => handleToggleMute(e, conv.id)}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                      >
                        {conv.isMuted ? (
                          <>
                            <Bell className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Unmute Notifications</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3.5 h-3.5 text-amber-400" />
                            <span>Mute Notifications</span>
                          </>
                        )}
                      </button>

                      {/* Option 4: Archive / Unarchive */}
                      <button
                        type="button"
                        onClick={e => handleToggleArchive(e, conv.id)}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>{conv.isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                      </button>

                      <div className="h-px bg-white/10 my-1" />

                      {/* Option 5: Block / Unblock */}
                      <button
                        type="button"
                        onClick={e => handleToggleBlock(e, conv.id)}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 text-left transition-colors cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-500" />
                        <span>{conv.isBlocked ? 'Unblock User' : 'Block User'}</span>
                      </button>

                      {/* Option 6: Delete Chat */}
                      <button
                        type="button"
                        onClick={e => handleDeleteChat(e, conv.id)}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 text-left transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete Chat</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* USER PROFILE VIEW MODAL */}
      {viewingProfileUser && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={() => setViewingProfileUser(null)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[var(--text-main)] relative max-h-[92dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-neutral-400/40 mx-auto mb-3" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setViewingProfileUser(null)}
              aria-label="Close profile"
              className="absolute right-4 top-4 w-9 h-9 rounded-full bg-neutral-200/60 dark:bg-white/5 hover:bg-neutral-300 dark:hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Avatar with Gold Aura (Clickable to open full-size DP) */}
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() =>
                  setDpPreviewTarget({
                    displayName: viewingProfileUser.displayName,
                    username: viewingProfileUser.username,
                    photoURL: viewingProfileUser.photoURL || null,
                    bio: viewingProfileUser.bio || null,
                    isOnline: viewingProfileUser.isOnline,
                    showOnlineStatus: viewingProfileUser.showOnlineStatus,
                    photoHiddenByPrivacy: viewingProfileUser.photoHiddenByPrivacy,
                    bioHiddenByPrivacy: viewingProfileUser.bioHiddenByPrivacy
                  })
                }
                className="relative mb-3 cursor-pointer hover:scale-105 transition-transform"
                title="Tap to open full-size DP"
              >
                <div className="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-900 border-2 border-[var(--accent-primary)] flex items-center justify-center overflow-hidden shadow-xl gold-glow-sm">
                  {viewingProfileUser.photoURL ? (
                    <img
                      src={viewingProfileUser.photoURL}
                      alt={viewingProfileUser.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold font-display text-[var(--accent-primary)]">
                      {viewingProfileUser.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                {viewingProfileUser.showOnlineStatus !== false && (
                  <span
                    className={`w-4 h-4 rounded-full border-2 border-[var(--bg-sidebar)] absolute bottom-1 right-1 shadow-md ${
                      viewingProfileUser.isOnline ? 'bg-emerald-500' : 'bg-neutral-500'
                    }`}
                    title={viewingProfileUser.isOnline ? 'Online' : 'Offline'}
                  />
                )}
              </button>

              {/* Display Name & Badge */}
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <span>{viewingProfileUser.displayName}</span>
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)] inline" />
              </h2>
              <span className="text-xs font-mono text-[var(--accent-primary)] mt-0.5">
                @{viewingProfileUser.username}
              </span>

              {/* Bio & Status */}
              <div className="w-full mt-4 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-left space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)]">
                    Bio / Status
                  </span>
                  <p className={`text-xs mt-0.5 leading-relaxed ${viewingProfileUser.bioHiddenByPrivacy ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-main)]'}`}>
                    {viewingProfileUser.bioHiddenByPrivacy
                      ? 'Bio hidden by privacy settings'
                      : viewingProfileUser.bio || 'Available on ERROREX'}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-200/70 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Security Protocol:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>AES-256 Verified</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (viewingProfileUser.conversationId) {
                      onSelectConversation(viewingProfileUser.conversationId);
                    }
                    setViewingProfileUser(null);
                  }}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl gold-button-accent text-xs font-bold uppercase tracking-wider text-black cursor-pointer shadow-md"
                >
                  Send Message
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProfileUser(null)}
                  className="min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-main)] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AvatarPreviewModal target={dpPreviewTarget} onClose={() => setDpPreviewTarget(null)} />
    </div>
  );
};
