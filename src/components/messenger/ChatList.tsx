import React, { useState } from 'react';
import { Conversation } from '../../types';
import { chatStore } from '../../lib/chatStore';
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
  Filter
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
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredConversations = conversations.filter(conv => {
    // Unread filter
    if (filter === 'unread' && (!conv.unreadCount || conv.unreadCount === 0)) {
      return false;
    }

    if (conv.isGroup) {
      return (conv.groupName || 'Group').toLowerCase().includes(searchTerm.toLowerCase());
    }

    // Direct chat
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const details = otherId ? conv.participantDetails?.[otherId] : null;

    if (details) {
      return (
        details.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        details.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.lastMessageText || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const savedContacts = chatStore.getContacts();

  const getChatTitle = (conv: Conversation): string => {
    if (conv.isGroup) return conv.groupName || 'Group Conversation';
    const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
    const details = otherId ? conv.participantDetails?.[otherId] : null;
    const uName = details?.username || '';
    const contactItem = savedContacts.find(
      c => (c.username && uName && c.username.toLowerCase() === uName.toLowerCase()) || c.id === otherId
    );
    if (contactItem) {
      return contactItem.name; // User requirement: show the name the user saved them as!
    }
    if (details) {
      return details.displayName;
    }
    return conv.groupName || 'Private Contact';
  };

  const getChatUsername = (conv: Conversation): string => {
    if (conv.isGroup) return 'group';
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
    const uName = details?.username || '';
    const contactItem = savedContacts.find(
      c => (c.username && uName && c.username.toLowerCase() === uName.toLowerCase()) || c.id === otherId
    );
    if (contactItem?.photoURL) {
      return contactItem.photoURL;
    }
    if (details?.photoURL) {
      return details.photoURL;
    }
    return null;
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

  return (
    <div className="w-full h-full bg-[var(--bg-list)] border-r border-[var(--accent-border)] flex flex-col shrink-0 select-none transition-colors">
      {/* Top Header: All Chats Details & Count */}
      <div className="p-3.5 border-b border-neutral-200 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-display font-bold gold-gradient-text">
              Messages & Chats
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-surface)] text-[var(--accent-primary)] font-mono font-bold border border-[var(--accent-border)]">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={onOpenNewChat}
            className="py-1.5 px-3 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1.5 transition-all shadow-sm border border-[var(--accent-border)] hover:border-[var(--accent-primary)]"
            title="Start New Conversation"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] font-bold">New Chat</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, @username, or message..."
            className="w-full pl-8 pr-8 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`py-1 px-3 rounded-xl text-[10px] font-semibold transition-all shadow-sm ${
              filter === 'all'
                ? 'bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-primary)] font-bold'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--accent-border)] hover:text-[var(--text-main)] hover:border-[var(--accent-primary)]'
            }`}
          >
            All Chats ({conversations.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`py-1 px-3 rounded-xl text-[10px] font-semibold transition-all flex items-center gap-1 shadow-sm ${
              filter === 'unread'
                ? 'bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-primary)] font-bold'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--accent-border)] hover:text-[var(--text-main)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <span>Unread</span>
            {conversations.filter(c => c.unreadCount && c.unreadCount > 0).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
            )}
          </button>
        </div>
      </div>

      {/* Conversations List with Full Chat Details */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-white/[0.03]">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-[var(--accent-primary)]" />
            <p className="text-xs">No conversations match your filter</p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 text-[11px] text-[var(--accent-primary)] hover:underline"
            >
              Start a new dialogue
            </button>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isActive = conv.id === activeConversationId;
            const title = getChatTitle(conv);
            const username = getChatUsername(conv);
            const avatar = getChatAvatar(conv);
            const isFromMe = conv.lastMessageSenderId === currentUserId;

            const otherId = conv.participants.find(p => p !== currentUserId) || conv.participants[0];
            const matchedContact = savedContacts.find(
              c => (c.username && username && c.username.toLowerCase() === username.toLowerCase()) || c.id === otherId
            );
            const isContactNetActive = conv.isGroup ? true : matchedContact ? matchedContact.isOnline !== false : true;

            const msgs = chatStore.getMessages(conv.id);
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const isSeen = lastMsg?.deliveryStatus === 'read' || Boolean(lastMsg?.readBy && lastMsg.readBy.some(id => id !== currentUserId));
            const isDelivered = lastMsg?.deliveryStatus === 'delivered' || (!lastMsg?.deliveryStatus && isContactNetActive);

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-3.5 flex items-start gap-3 transition-colors text-left relative ${
                  isActive
                    ? 'bg-[var(--accent-surface)] border-l-4 border-[var(--accent-primary)]'
                    : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-900/50'
                }`}
              >
                {/* Contact DP / Avatar with online indicator */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm overflow-hidden shadow-inner">
                    {avatar ? (
                      <img src={avatar} alt={title} className="w-full h-full object-cover" />
                    ) : conv.isGroup ? (
                      <Users className="w-5 h-5 text-[var(--accent-primary)]" />
                    ) : (
                      title.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  {isContactNetActive && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--bg-list)] absolute bottom-0 right-0 animate-pulse" />
                  )}
                </div>

                {/* Details Column: Title, Username, Last Message, Time, Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[130px] sm:max-w-[160px]">
                        {title}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--accent-primary)] truncate opacity-80">
                        @{username}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                      {formatTime(conv.lastMessageAt || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0 text-xs text-[var(--text-muted)] truncate pr-2">
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
                        <span className="truncate">{conv.lastMessageText || 'Tap to open chat'}</span>
                      )}
                    </div>

                    {Boolean(conv.unreadCount && conv.unreadCount > 0) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[var(--accent-primary)] text-black shrink-0 shadow-sm">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
