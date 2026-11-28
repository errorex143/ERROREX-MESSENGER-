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
  Mic,
  Check,
  CheckCheck,
  X,
  MoreVertical,
  Pin,
  Bell,
  BellOff,
  Archive,
  Ban,
  Trash2
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

  // 3-dot dropdown menu & delete confirmation state
  const [openMenuConvId, setOpenMenuConvId] = useState<string | null>(null);
  const [chatToDeleteId, setChatToDeleteId] = useState<string | null>(null);
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

  const handleTogglePin = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    chatStore.togglePin(convId);
  };

  const handleToggleArchive = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    chatStore.toggleArchive(convId);
  };

  const handleRequestDeleteChat = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    setChatToDeleteId(convId);
  };

  const confirmDeleteChat = () => {
    if (!chatToDeleteId) return;
    chatStore.deleteConversation(chatToDeleteId);
    setChatToDeleteId(null);
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
      <div className="flex-1 min-h-0 overflow-y-auto pb-28 divide-y divide-neutral-200/60 dark:divide-white/[0.03]">
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
                  isMenuOpen ? 'z-40 ' : ''
                }${
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

                {/* 3-DOT ACTION BUTTON (Outer chat list: Archive Chat & Delete Chat + Pin/Unread) */}
                <div
                  className={`absolute right-2 top-3 ${isMenuOpen ? 'z-50' : 'z-10'}`}
                  ref={isMenuOpen ? menuRef : undefined}
                >
                  <button
                    type="button"
                    onClick={e => handleOpenMenu(e, conv.id)}
                    aria-label="Chat options"
                    className="w-9 h-9 rounded-xl hover:bg-neutral-200/70 dark:hover:bg-black/40 text-neutral-500 dark:text-neutral-400 hover:text-[var(--accent-primary)] flex items-center justify-center transition-all cursor-pointer"
                    title="Archive or Delete Chat"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* 3-DOT DROPDOWN MENU */}
                  {isMenuOpen && (
                    <div
                      className="absolute right-0 top-9 w-48 max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl py-1.5 z-50 text-[var(--text-main)]"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={e => handleToggleArchive(e, conv.id)}
                        className="w-full px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer font-medium"
                      >
                        <Archive className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                        <span>{conv.isArchived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={e => handleTogglePin(e, conv.id)}
                        className="w-full px-3.5 py-2 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                      >
                        <Pin className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                        <span>{conv.isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
                      </button>

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
                        <Bell className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                        <span>{hasUnread ? 'Mark as Read' : 'Mark as Unread'}</span>
                      </button>

                      <div className="h-px bg-neutral-200 dark:bg-white/10 my-1" />

                      <button
                        type="button"
                        onClick={e => handleRequestDeleteChat(e, conv.id)}
                        className="w-full px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-rose-500/15 text-rose-500 dark:text-rose-400 text-left transition-colors cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
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

      {/* Delete Chat Confirmation Modal */}
      {chatToDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setChatToDeleteId(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] gold-glow shadow-2xl space-y-4 text-[var(--text-main)]"
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-neutral-400/40 mx-auto -mt-1" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Delete Chat?</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Delete this conversation and its message history from your device?
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setChatToDeleteId(null)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[var(--accent-border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteChat}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}

      <AvatarPreviewModal target={dpPreviewTarget} onClose={() => setDpPreviewTarget(null)} />
    </div>
  );
};
