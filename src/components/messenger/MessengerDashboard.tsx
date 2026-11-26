import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, MobileBottomNav, MessengerTab } from './Sidebar';
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
  getDocs,
  addDoc,
  updateDoc,
  doc
} from '../../lib/firebase';
import { isSupabaseConfigured, initSupabaseRuntime } from '../../lib/supabase';
import { fetchSupabaseUserProfiles, isLegacyTestAccount } from '../../lib/supabaseSync';
import { getCollectionData } from '../../lib/standaloneApi';
import { FriendRequest, Friendship } from '../../types';
import { CrownLogo } from '../common/CrownLogo';
import { MessageSquare, X, UserPlus, AtSign, Users, Lock, Clock, Check } from 'lucide-react';

export const MessengerDashboard: React.FC = () => {
  const { user, userProfile, lockMessenger } = useAuth();
  const storedProfile = chatStore.getUserProfile();
  const currentUserId = user?.uid || storedProfile.uid || 'user_active';
  const currentUserName = userProfile?.displayName || storedProfile.displayName || user?.displayName || 'User';

  const [activeTab, setActiveTab] = useState<MessengerTab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    chatStore.getConversations(currentUserId)
  );

  // User requirement: "phly all chat details show ho k kis kis ki chat hy"
  // Default to null so user first sees the complete WhatsApp Chat List with all details
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Friends & Requests state
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [friendGateNotice, setFriendGateNotice] = useState<string | null>(null);

  // New Chat modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatNameInput, setNewChatNameInput] = useState('');
  const [newChatUsernameInput, setNewChatUsernameInput] = useState('');
  const [newChatGateInfo, setNewChatGateInfo] = useState<{
    message: string;
    targetMember?: UserProfile;
    incomingReqId?: string;
    isPendingOutgoing?: boolean;
  } | null>(null);

  // Settings function modal state (from sidebar Settings button)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 1. Subscribe to chatStore updates for currentUserId (private isolation)
  useEffect(() => {
    const updateFromStore = () => {
      const convs = chatStore.getConversations(currentUserId);
      setConversations(convs);
    };

    updateFromStore();
    const unsub = chatStore.subscribe(updateFromStore);
    return () => unsub();
  }, [currentUserId]);

  // Reset active conversation when user changes or logs out (private isolation)
  useEffect(() => {
    setActiveConversationId(null);
  }, [currentUserId]);

  // 2. Listen for pending incoming friend requests from Firestore (graceful)
  useEffect(() => {
    if (!currentUserId) return;
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

  // 3. Load friends list for direct chat launch (local + Supabase fallback)
  useEffect(() => {
    if (!currentUserId) return;
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
          const profileMap = new Map<string, UserProfile>();
          uSnap.forEach((d: any) => {
            const pData = d.data() as UserProfile;
            const key = pData?.uid || d.id;
            if (friendIds.includes(d.id) || (pData?.uid && friendIds.includes(pData.uid))) {
              profileMap.set(key, pData);
            }
          });

          if (profileMap.size < friendIds.length) {
            await initSupabaseRuntime();
            if (isSupabaseConfigured) {
              const suUsers = await fetchSupabaseUserProfiles();
              suUsers.forEach(u => {
                if (friendIds.includes(u.uid) && !profileMap.has(u.uid)) {
                  profileMap.set(u.uid, u);
                }
              });
            }
          }

          setFriends(Array.from(profileMap.values()));
        } else {
          setFriends([]);
        }
      });

      return () => unsub();
    } catch (e) {
      console.warn('Firestore friendships listener:', e);
    }
  }, [currentUserId]);

  // Verify whether target user has an accepted friendship with currentUserId
  const isUserAcceptedFriend = (targetUid?: string, targetUsername?: string): boolean => {
    if (targetUid === 'vault_secure') return true;
    const cleanTargetUsername = targetUsername?.replace(/^@/, '').toLowerCase();

    if (
      friends.some(
        f =>
          (targetUid && f.uid === targetUid) ||
          (cleanTargetUsername && f.username?.toLowerCase() === cleanTargetUsername)
      )
    ) {
      return true;
    }

    const allFriendships = getCollectionData<Friendship>('friendships');
    const allProfiles = getCollectionData<UserProfile>('userProfiles');

    let resolvedUid = targetUid;
    if (!resolvedUid && cleanTargetUsername) {
      resolvedUid = allProfiles.find(p => p.username?.toLowerCase() === cleanTargetUsername)?.uid;
    }

    if (!resolvedUid) return false;
    return allFriendships.some(
      f => Array.isArray(f.users) && f.users.includes(currentUserId) && f.users.includes(resolvedUid!)
    );
  };

  // Start direct conversation ONLY with an accepted friend (strict request -> accept -> message rule)
  const handleStartChatWithUser = async (
    targetUser: UserProfile | { displayName: string; uid?: string; username?: string; photoURL?: string; bio?: string }
  ) => {
    if (!isUserAcceptedFriend(targetUser.uid, targetUser.username)) {
      const msg = `Send a friend request first! You can only message ${targetUser.displayName} after they accept your request.`;
      setFriendGateNotice(msg);
      if (isNewChatModalOpen) {
        setNewChatGateInfo({ message: msg });
      } else {
        setActiveTab('directory');
      }
      return;
    }

    setFriendGateNotice(null);
    setNewChatGateInfo(null);

    const cleanTargetUsername = targetUser.username?.replace(/^@/, '').toLowerCase();
    const resolvedTargetUid =
      targetUser.uid ||
      friends.find(f => cleanTargetUsername && f.username?.toLowerCase() === cleanTargetUsername)?.uid ||
      getCollectionData<UserProfile>('userProfiles').find(
        p => p.uid !== currentUserId && cleanTargetUsername && p.username?.toLowerCase() === cleanTargetUsername
      )?.uid;

    const existing = conversations.find(
      c =>
        !c.isGroup &&
        ((resolvedTargetUid && c.participants.includes(resolvedTargetUid)) ||
          (cleanTargetUsername &&
            c.participantDetails &&
            Object.values(c.participantDetails).some(
              p => p.username?.toLowerCase() === cleanTargetUsername
            )))
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setActiveTab('chats');
      setIsNewChatModalOpen(false);
      return;
    }

    if (resolvedTargetUid) {
      const remoteExisting = await chatStore.findExistingDirectConversation(currentUserId, resolvedTargetUid);
      if (remoteExisting) {
        setActiveConversationId(remoteExisting.id);
        setActiveTab('chats');
        setIsNewChatModalOpen(false);
        return;
      }
    }

    const newConv = chatStore.createConversation(
      targetUser.displayName,
      false,
      targetUser.username,
      targetUser.photoURL,
      targetUser.bio,
      currentUserId,
      {
        displayName: currentUserName,
        username: userProfile?.username || storedProfile.username || 'user',
        photoURL: userProfile?.photoURL || storedProfile.photoURL || ''
      },
      resolvedTargetUid
    );
    setActiveConversationId(newConv.id);
    setActiveTab('chats');
    setIsNewChatModalOpen(false);
  };

  // Look up registered member by name or username and enforce accepted friendship before opening chat
  const handleCreateCustomChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatNameInput.trim()) return;
    setNewChatGateInfo(null);

    const cleanName = newChatNameInput.trim();
    const customUsername = newChatUsernameInput.trim()
      ? newChatUsernameInput.trim().replace(/^@/, '').toLowerCase()
      : undefined;

    let matchedMember: UserProfile | undefined;
    try {
      const uSnap = await getDocs(collection(db, 'userProfiles'));
      const memberMap = new Map<string, UserProfile>();
      uSnap.forEach((d: any) => {
        const p = d.data() as UserProfile;
        if (p?.uid && !isLegacyTestAccount(p.uid, p.username, p.displayName)) {
          memberMap.set(p.uid, p);
        }
      });

      await initSupabaseRuntime();
      if (isSupabaseConfigured) {
        const suUsers = await fetchSupabaseUserProfiles();
        suUsers.forEach(p => {
          if (
            p?.uid &&
            !isLegacyTestAccount(p.uid, p.username, p.displayName) &&
            !memberMap.has(p.uid)
          ) {
            memberMap.set(p.uid, p);
          }
        });
      }

      const members = Array.from(memberMap.values());
      matchedMember = members.find(
        m =>
          m.uid !== currentUserId &&
          ((customUsername && m.username?.toLowerCase() === customUsername) ||
            m.displayName?.toLowerCase() === cleanName.toLowerCase())
      );
    } catch {
      // ignore lookup error
    }

    if (!matchedMember) {
      setNewChatGateInfo({
        message: 'No accepted friend found with that name or @username. Open Find Members to send a friend request first.'
      });
      return;
    }

    if (isUserAcceptedFriend(matchedMember.uid, matchedMember.username)) {
      handleStartChatWithUser(matchedMember);
      setNewChatNameInput('');
      setNewChatUsernameInput('');
      return;
    }

    const allReqs = getCollectionData<FriendRequest>('friendRequests');
    const outgoingPending = allReqs.find(
      r => r.senderId === currentUserId && r.receiverId === matchedMember!.uid && r.status === 'pending'
    );
    const incomingPending = allReqs.find(
      r => r.senderId === matchedMember!.uid && r.receiverId === currentUserId && r.status === 'pending'
    );

    if (incomingPending) {
      setNewChatGateInfo({
        message: `${matchedMember.displayName} (@${matchedMember.username}) sent you a friend request. Accept it first to start messaging.`,
        targetMember: matchedMember,
        incomingReqId: incomingPending.id
      });
    } else if (outgoingPending) {
      setNewChatGateInfo({
        message: `Friend request already sent to ${matchedMember.displayName}. You can message once they accept your request.`,
        targetMember: matchedMember,
        isPendingOutgoing: true
      });
    } else {
      setNewChatGateInfo({
        message: `You cannot message ${matchedMember.displayName} yet. Send a friend request and wait for acceptance first.`,
        targetMember: matchedMember
      });
    }
  };

  const handleSendRequestFromModal = async (targetMember: UserProfile) => {
    try {
      await addDoc(collection(db, 'friendRequests'), {
        senderId: currentUserId,
        senderName: currentUserName,
        senderUsername: userProfile?.username || storedProfile.username || 'member',
        senderPhoto: userProfile?.photoURL || storedProfile.photoURL || '',
        receiverId: targetMember.uid,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setNewChatGateInfo({
        message: `Friend request sent to ${targetMember.displayName}! Messaging unlocks once they accept.`,
        targetMember,
        isPendingOutgoing: true
      });
    } catch (err) {
      console.warn('Error sending friend request:', err);
    }
  };

  const handleAcceptRequestFromModal = async (reqId: string, targetMember: UserProfile) => {
    try {
      await updateDoc(doc(db, 'friendRequests', reqId), { status: 'accepted' });
      await addDoc(collection(db, 'friendships'), {
        user1Id: targetMember.uid,
        user2Id: currentUserId,
        users: [targetMember.uid, currentUserId],
        createdAt: new Date().toISOString()
      });
      await handleStartChatWithUser(targetMember);
      setNewChatNameInput('');
      setNewChatUsernameInput('');
    } catch (err) {
      console.warn('Error accepting friend request:', err);
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const contacts = chatStore.getContacts();
  const isMobileFullScreenChat = activeTab === 'chats' && Boolean(activeConversationId);
  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[var(--bg-page)] text-[var(--text-main)] overflow-hidden relative font-sans transition-colors">
      {/* Top Header: Hidden on mobile when inside an active full-screen chat so ChatWindow header gets maximum height */}
      <header
        className={`w-full h-13 border-b border-[var(--accent-border)] bg-[var(--bg-sidebar)]/95 backdrop-blur-md items-center justify-between px-3.5 sm:px-6 shrink-0 z-30 shadow-sm select-none ${
          isMobileFullScreenChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CrownLogo size="md" showWordmark={true} />
          <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">
            · Private Messenger
          </span>
        </div>

        {/* Mobile Quick Controls (visible on < md when sidebar is at bottom) */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[var(--accent-primary)] flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
            title="Profile"
            aria-label="Open Profile"
          >
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={lockMessenger}
            className="min-h-[40px] py-2 px-3 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform whitespace-nowrap"
            title="Lock to Calculator"
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area (Sidebar + Active View) */}
      <div className="flex-1 min-h-0 w-full flex overflow-hidden">
        {/* Desktop & Tablet Left Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={tab => {
            setActiveTab(tab);
          }}
          unreadMessagesCount={unreadTotal}
          pendingRequestsCount={pendingRequestsCount}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        />

        {/* Content Container */}
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {friendGateNotice && (
          <div className="px-3.5 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-600 dark:text-amber-300 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-medium">{friendGateNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('directory');
                  setFriendGateNotice(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)] text-black font-bold text-[11px] cursor-pointer"
              >
                Find Members
              </button>
              <button
                type="button"
                onClick={() => setFriendGateNotice(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                aria-label="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 min-w-0 w-full flex overflow-hidden">
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
            initialSubTab={
              activeTab === 'directory'
                ? 'directory'
                : activeTab === 'requests'
                ? 'requests'
                : 'friends'
            }
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
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (hidden inside active chat so keyboard & chat get 100% height) */}
      {!isMobileFullScreenChat && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={tab => {
            setActiveTab(tab);
          }}
          unreadMessagesCount={unreadTotal}
          pendingRequestsCount={pendingRequestsCount}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* New Chat Modal (Native mobile bottom sheet -> centered dialog on sm+) */}
      {isNewChatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setIsNewChatModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col space-y-4 max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-neutral-400/40 mx-auto sm:hidden shrink-0" />
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-display font-bold gold-gradient-text flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Start New Private Chat</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="w-9 h-9 rounded-full bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Name and Username Input */}
            <form onSubmit={handleCreateCustomChat} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  Contact Display Name
                </label>
                <input
                  type="text"
                  required
                  value={newChatNameInput}
                  onChange={e => setNewChatNameInput(e.target.value)}
                  placeholder="e.g. Sarah Connor, Dr. Vance..."
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  Unique Username (@handle)
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3 top-3 sm:top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={newChatUsernameInput}
                    onChange={e => setNewChatUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. sarah_connor (optional)"
                    className="w-full pl-9 pr-3 py-2.5 text-base sm:text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!newChatNameInput.trim()}
                className="w-full min-h-[44px] py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider disabled:opacity-50 hover:gold-glow-sm transition-all cursor-pointer"
              >
                Open Encrypted Dialogue
              </button>

              {newChatGateInfo && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent-primary)]" />
                    <p className="leading-relaxed font-medium">{newChatGateInfo.message}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {newChatGateInfo.targetMember && newChatGateInfo.incomingReqId && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAcceptRequestFromModal(
                            newChatGateInfo.incomingReqId!,
                            newChatGateInfo.targetMember!
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept & Start Chat</span>
                      </button>
                    )}
                    {newChatGateInfo.targetMember &&
                      !newChatGateInfo.incomingReqId &&
                      !newChatGateInfo.isPendingOutgoing && (
                        <button
                          type="button"
                          onClick={() => handleSendRequestFromModal(newChatGateInfo.targetMember!)}
                          className="px-3 py-1.5 rounded-lg gold-button-accent text-black font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Send Friend Request</span>
                        </button>
                      )}
                    {newChatGateInfo.isPendingOutgoing && (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Request Pending</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewChatModalOpen(false);
                        setNewChatGateInfo(null);
                        setActiveTab('directory');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)] font-semibold text-[11px] cursor-pointer"
                    >
                      Go to Find Members
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Accepted Friends & Saved Contacts List */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-2 flex items-center justify-between">
                <span>Accepted Friends (Ready to Chat):</span>
                <span className="text-[10px] font-mono text-[var(--accent-primary)]">{friends.length} friends</span>
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-none">
                {friends.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-center space-y-2">
                    <p className="text-[11px] text-[var(--text-muted)]">
                      No accepted friends yet. Send a friend request in Find Members and wait for approval before messaging.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewChatModalOpen(false);
                        setNewChatGateInfo(null);
                        setActiveTab('directory');
                      }}
                      className="px-3 py-1.5 rounded-lg gold-button-accent text-black font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Find Members</span>
                    </button>
                  </div>
                ) : (
                  friends.map(f => (
                    <button
                      key={f.uid}
                      type="button"
                      onClick={() => handleStartChatWithUser(f)}
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-left flex items-center justify-between transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-surface)] text-[var(--accent-primary)] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {f.photoURL ? (
                            <img src={f.photoURL} alt={f.displayName} className="w-full h-full object-cover" />
                          ) : (
                            f.displayName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-main)] truncate">{f.displayName}</p>
                          <p className="text-[10px] font-mono text-[var(--accent-primary)] truncate">@{f.username}</p>
                        </div>
                      </div>
                      <MessageSquare className="w-4 h-4 text-neutral-400 group-hover:text-[var(--accent-primary)] shrink-0 transition-colors" />
                    </button>
                  ))
                )}

                {contacts
                  .filter(c => !isUserAcceptedFriend(undefined, c.username))
                  .map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        handleStartChatWithUser({
                          displayName: c.name,
                          username: c.username,
                          photoURL: c.photoURL,
                          bio: c.bio
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-card)]/60 border border-[var(--accent-border)]/60 text-left flex items-center justify-between transition-colors opacity-80 cursor-pointer"
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
                          <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                            @{c.username} • Request required
                          </p>
                        </div>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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
