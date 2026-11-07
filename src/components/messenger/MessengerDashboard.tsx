import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, MessengerTab } from './Sidebar';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { ContactsView } from './ContactsView';
import { FriendsView } from './FriendsView';
import { StatusView } from './StatusView';
import { ErrorexAiView } from './ErrorexAiView';
import { ProfileView } from './ProfileView';
import { SettingsView } from './SettingsView';
import { SettingsModal } from './SettingsModal';
import { Conversation, UserProfile } from '../../types';
import { chatStore } from '../../lib/chatStore';
import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  getDocs
} from '../../lib/firebase';
import { CrownLogo } from '../common/CrownLogo';
import { MessageSquare, X, UserPlus, Plus, AtSign, Users, ShieldCheck } from 'lucide-react';

export const MessengerDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const currentUserId = user?.uid || 'test_user_noor_1434';
  const currentUserName = userProfile?.displayName || 'Noor';

  const [activeTab, setActiveTab] = useState<MessengerTab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    chatStore.getConversations()
  );

  // User requirement: "phly all chat details show ho k kis kis ki chat hy"
  // Default to null so user first sees the complete WhatsApp Chat List with all details
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Friends & Requests state
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // New Chat modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatNameInput, setNewChatNameInput] = useState('');
  const [newChatUsernameInput, setNewChatUsernameInput] = useState('');

  // Settings function modal state (from sidebar Settings button)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 1. Subscribe to chatStore updates
  useEffect(() => {
    const updateFromStore = () => {
      const convs = chatStore.getConversations();
      setConversations(convs);
    };

    updateFromStore();
    const unsub = chatStore.subscribe(updateFromStore);
    return () => unsub();
  }, []);

  // 2. Listen for pending incoming friend requests from Firestore (graceful)
  useEffect(() => {
    if (!currentUserId || currentUserId.startsWith('test_user_')) return;
    try {
      const q = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', currentUserId),
        where('status', '==', 'pending')
      );
      const unsub = onSnapshot(q, snap => {
        setPendingRequestsCount(snap.size);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Firestore friend requests listener:', e);
    }
  }, [currentUserId]);

  // 3. Load friends list for direct chat launch
  useEffect(() => {
    if (!currentUserId || currentUserId.startsWith('test_user_')) return;
    try {
      const q = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', currentUserId)
      );
      const unsub = onSnapshot(q, async snap => {
        const friendIds: string[] = [];
        snap.forEach((d: any) => {
          const users = (d.data() as any).users as string[];
          const other = users.find(u => u !== currentUserId);
          if (other) friendIds.push(other);
        });

        if (friendIds.length > 0) {
          const uSnap = await getDocs(collection(db, 'userProfiles'));
          const list: UserProfile[] = [];
          uSnap.forEach((d: any) => {
            if (friendIds.includes(d.id)) {
              list.push(d.data() as UserProfile);
            }
          });
          setFriends(list);
        } else {
          setFriends([]);
        }
      });

      return () => unsub();
    } catch (e) {
      console.warn('Firestore friendships listener:', e);
    }
  }, [currentUserId]);

  // Start direct conversation with a friend or contact
  const handleStartChatWithUser = (targetUser: UserProfile | { displayName: string; uid?: string; username?: string; photoURL?: string; bio?: string }) => {
    const existing = conversations.find(
      c => !c.isGroup && targetUser.username && c.participantDetails && Object.values(c.participantDetails).some(p => p.username === targetUser.username)
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setActiveTab('chats');
      setIsNewChatModalOpen(false);
      return;
    }

    const newConv = chatStore.createConversation(
      targetUser.displayName,
      false,
      targetUser.username,
      targetUser.photoURL,
      targetUser.bio
    );
    setActiveConversationId(newConv.id);
    setActiveTab('chats');
    setIsNewChatModalOpen(false);
  };

  // Create chat by custom name and username
  const handleCreateCustomChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatNameInput.trim()) return;

    const customUsername = newChatUsernameInput.trim()
      ? newChatUsernameInput.trim().replace(/^@/, '').toLowerCase()
      : undefined;

    const newConv = chatStore.createConversation(newChatNameInput.trim(), false, customUsername);
    setNewChatNameInput('');
    setNewChatUsernameInput('');
    setActiveConversationId(newConv.id);
    setActiveTab('chats');
    setIsNewChatModalOpen(false);
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const contacts = chatStore.getContacts();

  return (
    <div className="h-screen w-screen flex bg-[var(--bg-page)] text-[var(--text-main)] overflow-hidden relative font-sans transition-colors">
      {/* Sidebar Navigation: on mobile, if an active chat is open, hide sidebar so chat gets full 100% width */}
      <div className={activeTab === 'chats' && activeConversationId ? 'hidden md:flex h-full shrink-0' : 'flex h-full shrink-0'}>
        <Sidebar
          activeTab={activeTab}
          onSelectTab={tab => {
            setActiveTab(tab);
          }}
          unreadMessagesCount={conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
          pendingRequestsCount={pendingRequestsCount}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        />
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 h-full flex overflow-hidden">
        {/* Chats Tab: Split Screen */}
        {activeTab === 'chats' && (
          <div className="w-full h-full flex overflow-hidden">
            {/* Conversation list: on mobile, hidden if a chat is active */}
            <div
              className={`w-full md:w-72 lg:w-80 xl:w-96 h-full flex-col min-w-0 ${
                activeConversationId ? 'hidden md:flex' : 'flex'
              }`}
            >
              <ChatList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={id => {
                  chatStore.markAsRead(id, currentUserId);
                  setActiveConversationId(id);
                }}
                onOpenNewChat={() => setIsNewChatModalOpen(true)}
                currentUserId={currentUserId}
              />
            </div>

            {/* Chat Window */}
            <div
              className={`flex-1 h-full flex-col min-w-0 ${
                activeConversationId ? 'flex' : 'hidden md:flex'
              }`}
            >
              {activeConversation ? (
                <ChatWindow
                  key={activeConversation.id}
                  conversation={activeConversation}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  onCloseMobileChat={() => setActiveConversationId(null)}
                />
              ) : (
                <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-neutral-500 bg-[var(--bg-window)] select-none transition-colors">
                  <CrownLogo size="lg" showWordmark={true} className="mb-4 opacity-50" />
                  <h2 className="text-sm font-semibold text-[var(--text-main)] tracking-wider uppercase mb-1">
                    ERROREX Encrypted Messenger
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed mb-6">
                    Select a conversation from the left to view messages and voice notes, or start a new dialogue with any contact.
                  </p>
                  <button
                    onClick={() => setIsNewChatModalOpen(true)}
                    className="py-2.5 px-5 rounded-xl gold-button-accent text-xs font-semibold uppercase tracking-wider hover:gold-glow-sm transition-all"
                  >
                    Start New Dialogue
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contacts Book View */}
        {activeTab === 'contacts' && (
          <ContactsView
            onStartChatWithContact={contact => {
              handleStartChatWithUser({
                displayName: contact.displayName,
                username: contact.username,
                photoURL: contact.photoURL,
                bio: contact.bio
              });
            }}
          />
        )}

        {/* Friends & Directory View */}
        {(activeTab === 'friends' || activeTab === 'requests' || activeTab === 'directory') && (
          <FriendsView
            currentUserId={currentUserId}
            currentUserProfile={userProfile}
            onStartChatWithUser={handleStartChatWithUser}
          />
        )}

        {/* Status / Stories & Groups View */}
        {activeTab === 'status' && (
          <StatusView
            currentUserId={currentUserId}
            currentUserProfile={userProfile}
            onOpenGroupChat={id => {
              setActiveConversationId(id);
              setActiveTab('chats');
            }}
            friends={friends}
          />
        )}

        {/* ERROREX AI Multilingual Chat View */}
        {activeTab === 'errorex_ai' && (
          <ErrorexAiView />
        )}

        {/* Notifications View */}
        {activeTab === 'notifications' && (
          <div className="flex-1 h-full p-6 bg-[var(--bg-window)] overflow-y-auto">
            <h1 className="text-lg font-display font-bold gold-gradient-text mb-4">
              Alerts & Notifications
            </h1>
            <div className="max-w-md space-y-3">
              {pendingRequestsCount > 0 && (
                <div
                  onClick={() => setActiveTab('requests')}
                  className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] cursor-pointer flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-[var(--accent-primary)]" />
                    <div>
                      <p className="text-xs font-bold text-[var(--text-main)]">Pending Friend Requests</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        You have {pendingRequestsCount} request awaiting your approval.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[var(--accent-primary)]">Review →</span>
                </div>
              )}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-muted)] text-xs">
                No new unread system notifications.
              </div>
            </div>
          </div>
        )}

        {/* Profile View (DP change, Name change, Bio change, Username locked) */}
        {activeTab === 'profile' && <ProfileView />}

        {/* Settings View (3 modes, 8 luxury colors, WhatsApp privacy, Secret PIN) */}
        {activeTab === 'settings' && <SettingsView />}
      </div>

      {/* New Chat Modal (Quick WhatsApp Contact Launcher) */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h2 className="text-sm font-display font-bold gold-gradient-text flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Start New Private Chat</span>
              </h2>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="text-neutral-400 hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Name and Username Input */}
            <form onSubmit={handleCreateCustomChat} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Contact Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newChatNameInput}
                  onChange={e => setNewChatNameInput(e.target.value)}
                  placeholder="e.g. Sarah Connor, Dr. Vance, Boss..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Unique Username (@handle)
                </label>
                <div className="relative">
                  <AtSign className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={newChatUsernameInput}
                    onChange={e => setNewChatUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. sarah_connor (optional)"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!newChatNameInput.trim()}
                className="w-full py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider disabled:opacity-50 hover:gold-glow-sm transition-all"
              >
                Open Encrypted Dialogue
              </button>
            </form>

            {/* Saved Contacts List */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-2 flex items-center justify-between">
                <span>Select from Saved Contacts:</span>
                <span className="text-[10px] font-mono text-[var(--accent-primary)]">{contacts.length} saved</span>
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-none">
                {contacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      handleStartChatWithUser({
                        displayName: c.name,
                        username: c.username,
                        photoURL: c.photoURL,
                        bio: c.bio
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-left flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-surface)] text-[var(--accent-primary)] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          c.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-main)] truncate">{c.name}</p>
                        <p className="text-[10px] font-mono text-[var(--accent-primary)] truncate">@{c.username}</p>
                      </div>
                    </div>
                    <MessageSquare className="w-4 h-4 text-neutral-400 group-hover:text-[var(--accent-primary)] shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Settings Modal triggered by Sidebar / Header Settings button */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};
