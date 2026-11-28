import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  db,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType
} from '../../lib/firebase';
import { isSupabaseConfigured, initSupabaseRuntime } from '../../lib/supabase';
import { fetchSupabaseUserProfiles, isLegacyTestAccount, isUserCurrentlyOnline } from '../../lib/supabaseSync';
import { getCollectionData, hydrateStandaloneFromSupabase } from '../../lib/standaloneApi';
import { chatStore } from '../../lib/chatStore';
import { canViewProfilePhoto, canViewBio, canViewLastSeen } from '../../lib/privacyUtils';
import { AvatarPreviewModal, AvatarPreviewTarget } from '../common/AvatarPreviewModal';
import { FriendRequest, Friendship, UserProfile } from '../../types';
import {
  Search,
  UserPlus,
  Check,
  X,
  MessageSquare,
  UserCheck,
  Users,
  RefreshCw,
  Clock
} from 'lucide-react';

interface FriendsViewProps {
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onStartChatWithUser: (targetUser: UserProfile) => void;
  initialSubTab?: 'friends' | 'requests' | 'directory';
  externalSubTab?: 'friends' | 'requests' | 'directory';
  embedded?: boolean;
  onCountsChange?: (counts: {
    friendsCount: number;
    incomingCount: number;
    membersCount: number;
  }) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUserId,
  currentUserProfile,
  onStartChatWithUser,
  initialSubTab,
  externalSubTab,
  embedded = false,
  onCountsChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'requests' | 'directory'>(
    externalSubTab || initialSubTab || 'friends'
  );

  useEffect(() => {
    if (externalSubTab) {
      setActiveSubTab(externalSubTab);
    } else if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [externalSubTab, initialSubTab]);

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  // Directory search & full members list state
  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [dpPreviewTarget, setDpPreviewTarget] = useState<AvatarPreviewTarget | null>(null);
  const [, setPresenceTick] = useState(0);

  const savedContacts = chatStore.getContacts();
  const friendshipsList = getCollectionData<Friendship>('friendships');

  useEffect(() => {
    const tick = setInterval(() => setPresenceTick(t => t + 1), 20000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    onCountsChange?.({
      friendsCount: friends.length,
      incomingCount: incomingRequests.length,
      membersCount: allMembers.length
    });
  }, [friends.length, incomingRequests.length, allMembers.length, onCountsChange]);

  // Load incoming friend requests
  useEffect(() => {
    const q = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, snap => {
      const list: FriendRequest[] = [];
      snap.forEach((d: any) => list.push({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }));
      setIncomingRequests(list);
    });
    return () => unsub();
  }, [currentUserId]);

  // Load outgoing friend requests
  useEffect(() => {
    const q = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, snap => {
      const list: FriendRequest[] = [];
      snap.forEach((d: any) => list.push({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }));
      setOutgoingRequests(list);
    });
    return () => unsub();
  }, [currentUserId]);

  // Load friends
  useEffect(() => {
    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', currentUserId)
    );
    const unsub = onSnapshot(q, async snap => {
      const friendIds: string[] = [];
      snap.forEach((d: any) => {
        const data = d.data() as Friendship;
        const other = data.users.find(u => u !== currentUserId);
        if (other) friendIds.push(other);
      });

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      // Fetch profiles of friends (local + Supabase fallback)
      try {
        const userProfilesSnap = await getDocs(collection(db, 'userProfiles'));
        const profileMap = new Map<string, UserProfile>();
        userProfilesSnap.forEach(d => {
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
      } catch (err) {
        console.error('Error loading friend profiles:', err);
      }
    });

    return () => unsub();
  }, [currentUserId]);

  // Fetch ALL website users from Shared Server Directory + Local Store + Supabase
  const loadAllWebsiteMembers = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsSearching(true);
    try {
      const mergedMap = new Map<string, UserProfile>();

      const addProfile = (p: UserProfile | null | undefined) => {
        if (!p || !p.uid) return;
        if (p.uid === currentUserId) return;
        if (isLegacyTestAccount(p.uid, p.username, p.displayName)) return;

        const existing = mergedMap.get(p.uid);
        if (!existing || (p.updatedAt && (!existing.updatedAt || p.updatedAt > existing.updatedAt))) {
          mergedMap.set(p.uid, {
            ...p,
            displayName: p.displayName || p.username || 'ERROREX Member',
            username: p.username || `user_${p.uid.slice(0, 6)}`
          });
        }
      };

      // 1. Fetch from shared backend /api/users if running on Express server
      try {
        const res = await fetch('/api/users');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data.users)) {
            data.users.forEach(addProfile);
          }
        }
      } catch {
        // quiet on static hosting (Cloudflare Pages)
      }

      // 2. Fetch from local userProfiles collection
      try {
        const snap = await getDocs(collection(db, 'userProfiles'));
        snap.forEach(d => addProfile(d.data() as UserProfile));
      } catch (e) {
        console.warn('Local userProfiles fetch notice:', e);
      }

      // 3. Fetch from Supabase user_profiles (primary global directory on Cloudflare Pages & all devices)
      await initSupabaseRuntime();
      if (isSupabaseConfigured) {
        try {
          const suUsers = await fetchSupabaseUserProfiles();
          suUsers.forEach(addProfile);
        } catch (e) {
          console.warn('Supabase user_profiles fetch notice:', e);
        }
      }

      const sorted = Array.from(mergedMap.values()).sort((a, b) => {
        const aOnline = isUserCurrentlyOnline(a);
        const bOnline = isUserCurrentlyOnline(b);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      setAllMembers(sorted);
    } catch (err) {
      console.error('Load members error:', err);
    } finally {
      if (showSpinner) setIsSearching(false);
    }
  }, [currentUserId]);

  // Automatically load all website users & hydrate from Supabase when FriendsView opens or userProfiles changes
  useEffect(() => {
    hydrateStandaloneFromSupabase(currentUserId).then(() => loadAllWebsiteMembers(false));
    loadAllWebsiteMembers(true);
    const unsub = onSnapshot(collection(db, 'userProfiles'), () => {
      loadAllWebsiteMembers(false);
    });
    return () => unsub();
  }, [currentUserId, loadAllWebsiteMembers]);

  // Refresh from Supabase whenever switching between Friends, Requests, and Find Members
  useEffect(() => {
    hydrateStandaloneFromSupabase(currentUserId).then(() => loadAllWebsiteMembers(false));
  }, [activeSubTab, currentUserId, loadAllWebsiteMembers]);

  // Live filtered members list (shows ALL members when search is empty)
  const searchResults = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();
    if (!qLower) return allMembers;
    return allMembers.filter(u =>
      u.username?.toLowerCase().includes(qLower) ||
      u.displayName?.toLowerCase().includes(qLower) ||
      u.bio?.toLowerCase().includes(qLower)
    );
  }, [allMembers, searchQuery]);

  // Search form submit refreshes directory from Supabase & Server
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionNotice(null);
    await hydrateStandaloneFromSupabase(currentUserId);
    await loadAllWebsiteMembers(true);
  };

  // Send Friend Request
  const handleSendFriendRequest = async (targetUser: UserProfile) => {
    // Check if already friends
    if (friends.some(f => f.uid === targetUser.uid)) {
      setActionNotice(`You are already friends with ${targetUser.displayName}.`);
      return;
    }
    // Check if request already sent
    if (outgoingRequests.some(r => r.receiverId === targetUser.uid)) {
      setActionNotice(`Friend request already sent to ${targetUser.displayName}.`);
      return;
    }

    try {
      await addDoc(collection(db, 'friendRequests'), {
        senderId: currentUserId,
        senderName: currentUserProfile?.displayName || 'User',
        senderUsername: currentUserProfile?.username || 'member',
        senderPhoto: currentUserProfile?.photoURL || '',
        receiverId: targetUser.uid,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setActionNotice(`Friend request sent to ${targetUser.displayName}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'friendRequests');
    }
  };

  // Accept Friend Request
  const handleAcceptRequest = async (req: FriendRequest) => {
    try {
      // 1. Update request status
      await updateDoc(doc(db, 'friendRequests', req.id), {
        status: 'accepted'
      });
      // Also resolve any reverse/duplicate pending request between the same pair
      const relatedPending = getCollectionData<FriendRequest>('friendRequests').filter(
        r =>
          r.id !== req.id &&
          r.status === 'pending' &&
          ((r.senderId === req.senderId && r.receiverId === req.receiverId) ||
            (r.senderId === req.receiverId && r.receiverId === req.senderId))
      );
      for (const rel of relatedPending) {
        await updateDoc(doc(db, 'friendRequests', rel.id), { status: 'accepted' });
      }
      // 2. Create friendship document
      await addDoc(collection(db, 'friendships'), {
        user1Id: req.senderId,
        user2Id: req.receiverId,
        users: [req.senderId, req.receiverId],
        createdAt: new Date().toISOString()
      });
      setActionNotice(`You are now friends with ${req.senderName}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `friendRequests/${req.id}`);
    }
  };

  // Reject Request
  const handleRejectRequest = async (req: FriendRequest) => {
    try {
      await updateDoc(doc(db, 'friendRequests', req.id), {
        status: 'rejected'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `friendRequests/${req.id}`);
    }
  };

  // Cancel Outgoing Request
  const handleCancelRequest = async (reqId: string) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', reqId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendRequests/${reqId}`);
    }
  };

  return (
    <div
      className={
        embedded
          ? 'flex-1 min-w-0 flex flex-col select-none'
          : 'flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-3 sm:p-5 md:p-6 overflow-y-auto transition-colors'
      }
    >
      <div className={embedded ? 'w-full flex flex-col flex-1 min-w-0' : 'w-full max-w-6xl mx-auto flex flex-col flex-1 min-w-0'}>
      {!embedded && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-neutral-200 dark:border-white/5">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-display font-bold gold-gradient-text">
              Social Circle & Network
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Manage your verified contacts, pending authorizations, and user directory.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-neutral-200/70 dark:bg-black/60 rounded-xl border border-neutral-300 dark:border-white/5 overflow-x-auto scrollbar-none w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('friends')}
              className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex-1 lg:flex-initial tabular-nums cursor-pointer ${
                activeSubTab === 'friends'
                  ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
              }`}
            >
              Friends ({friends.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('requests')}
              className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-all relative whitespace-nowrap shrink-0 flex-1 lg:flex-initial tabular-nums cursor-pointer ${
                activeSubTab === 'requests'
                  ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
              }`}
            >
              <span>Requests</span>
              {incomingRequests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--accent-primary)] text-black">
                  {incomingRequests.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('directory')}
              className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex-1 lg:flex-initial tabular-nums cursor-pointer ${
                activeSubTab === 'directory'
                  ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
              }`}
            >
              Find Members ({allMembers.length})
            </button>
          </div>
        </div>
      )}

      {actionNotice && (
        <div className="my-3 p-3 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] text-xs text-[var(--accent-primary)] flex items-center justify-between gap-2">
          <span className="min-w-0 break-words">{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-neutral-400 hover:text-[var(--text-main)] shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Subtab 1: Friends List */}
      {activeSubTab === 'friends' && (
        <div className="mt-4 flex-1">
          {friends.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--accent-primary)]" />
              <p className="text-xs">No friends added yet.</p>
              <button
                onClick={() => setActiveSubTab('directory')}
                className="mt-3 text-xs text-[var(--accent-primary)] hover:underline"
              >
                Search directory to connect with users
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {friends.map(friend => {
                const allowPhoto = canViewProfilePhoto(
                  currentUserId,
                  friend.uid,
                  friend.username,
                  friend,
                  undefined,
                  savedContacts,
                  friendshipsList
                );
                const allowBio = canViewBio(
                  currentUserId,
                  friend.uid,
                  friend.username,
                  friend,
                  undefined,
                  savedContacts,
                  friendshipsList
                );
                const allowOnline = canViewLastSeen(
                  currentUserId,
                  friend.uid,
                  friend.username,
                  friend,
                  undefined,
                  savedContacts,
                  friendshipsList
                );
                const onlineNow = allowOnline ? isUserCurrentlyOnline(friend) : false;
                const visiblePhoto = allowPhoto ? friend.photoURL : undefined;
                const visibleBio = allowBio ? friend.bio || 'Available on ERROREX' : null;

                return (
                  <div
                    key={friend.uid}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-between gap-3 hover:border-[var(--accent-primary)] transition-all shadow-sm min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setDpPreviewTarget({
                            displayName: friend.displayName,
                            username: friend.username,
                            photoURL: visiblePhoto || null,
                            bio: visibleBio,
                            isOnline: onlineNow,
                            showOnlineStatus: allowOnline,
                            photoHiddenByPrivacy: !allowPhoto,
                            bioHiddenByPrivacy: !allowBio
                          })
                        }
                        className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        title="Tap to view full-size DP & Bio"
                      >
                        {visiblePhoto ? (
                          <img src={visiblePhoto} alt={friend.displayName} className="w-full h-full object-cover" />
                        ) : (
                          friend.displayName.slice(0, 1).toUpperCase()
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xs font-bold text-[var(--text-main)] truncate">
                          {friend.displayName}
                        </h2>
                        <p className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                          @{friend.username}
                        </p>
                        {visibleBio && (
                          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            {visibleBio}
                          </p>
                        )}
                        {allowOnline && (
                          <span className="text-[9px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${onlineNow ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
                            <span className={onlineNow ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                              {onlineNow ? 'Online' : 'Offline'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onStartChatWithUser(friend)}
                        title="Send Encrypted Message"
                        className="min-h-[40px] py-2 px-3.5 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Requests */}
      {activeSubTab === 'requests' && (
        <div className="mt-4 flex-1 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--text-muted)]">
              Synced live on Cloudflare via shared cloud directory.
            </p>
            <button
              type="button"
              disabled={isSearching}
              onClick={async () => {
                setIsSearching(true);
                try {
                  await hydrateStandaloneFromSupabase(currentUserId);
                  await loadAllWebsiteMembers(false);
                } finally {
                  setIsSearching(false);
                }
              }}
              className="min-h-[36px] py-1.5 px-3 rounded-xl gold-button border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5 hover:gold-glow-sm transition-all cursor-pointer shrink-0"
              title="Refresh friend requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Incoming */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Incoming Friend Requests ({incomingRequests.length})
            </h2>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No pending requests</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomingRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setDpPreviewTarget({
                            displayName: req.senderName,
                            username: req.senderUsername,
                            photoURL: req.senderPhoto || null,
                            bio: 'Sent you a friend request',
                            showOnlineStatus: false
                          })
                        }
                        className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-xs overflow-hidden shrink-0 cursor-pointer"
                        title="Tap to view DP"
                      >
                        {req.senderPhoto ? (
                          <img src={req.senderPhoto} alt={req.senderName} className="w-full h-full object-cover" />
                        ) : (
                          req.senderName.slice(0, 1).toUpperCase()
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-[var(--text-main)] truncate">{req.senderName}</h3>
                        <p className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                          @{req.senderUsername}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        className="min-h-[40px] py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req)}
                        aria-label="Reject friend request"
                        className="min-w-[40px] min-h-[40px] rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-rose-700 text-neutral-600 dark:text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Sent Requests Awaiting Response ({outgoingRequests.length})
            </h2>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No sent requests</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outgoingRequests.map(req => {
                  const targetMember = allMembers.find(m => m.uid === req.receiverId);
                  const displayName = targetMember?.displayName || `Member ${req.receiverId.slice(0, 8)}`;
                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            setDpPreviewTarget({
                              displayName,
                              username: targetMember?.username || 'member',
                              photoURL: targetMember?.photoURL || null,
                              bio: targetMember?.bio || 'Awaiting friend request acceptance',
                              showOnlineStatus: false
                            })
                          }
                          className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-xs overflow-hidden shrink-0 cursor-pointer"
                          title="Tap to view DP"
                        >
                          {targetMember?.photoURL ? (
                            <img src={targetMember.photoURL} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            displayName.slice(0, 1).toUpperCase()
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--text-main)] truncate">
                            {displayName}
                          </p>
                          <p className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                            {targetMember?.username ? `@${targetMember.username} · ` : ''}Awaiting acceptance
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        className="min-h-[40px] text-xs text-[var(--text-muted)] hover:text-rose-400 py-2 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 shrink-0 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: All Website Users Directory (Find Members) */}
      {activeSubTab === 'directory' && (
        <div className="mt-4 flex-1 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <form onSubmit={handleSearchUsers} className="flex gap-2 w-full md:max-w-md min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, @username, or bio..."
                  className="w-full min-h-[42px] pl-9 pr-4 py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="min-h-[42px] py-2 px-3.5 rounded-xl gold-button border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5 hover:gold-glow-sm transition-all cursor-pointer shrink-0"
                title="Refresh all website members"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </form>

            <div className="flex flex-col md:items-end gap-0.5 text-[11px] font-mono text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span>Showing {searchResults.length} of {allMembers.length} website members</span>
              </div>
              {currentUserProfile?.username && (
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 truncate">
                  Your ID is live in directory as @{currentUserProfile.username}
                </span>
              )}
            </div>
          </div>

          {/* All Members Grid */}
          {isSearching && allMembers.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-xs">
              Loading website members...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--accent-primary)]" />
              <p className="text-xs font-medium">
                {searchQuery.trim()
                  ? `No member found matching "${searchQuery}".`
                  : 'No other registered users on this website yet.'}
              </p>
              <p className="text-[11px] opacity-75 mt-1">
                When other people register or log in to ERROREX, they will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {searchResults.map(member => {
                const isAlreadyFriend = friends.some(f => f.uid === member.uid);
                const isPending = outgoingRequests.some(r => r.receiverId === member.uid);
                const incomingReq = incomingRequests.find(r => r.senderId === member.uid);

                const allowPhoto = canViewProfilePhoto(
                  currentUserId,
                  member.uid,
                  member.username,
                  member,
                  undefined,
                  savedContacts,
                  friendshipsList
                );
                const allowBio = canViewBio(
                  currentUserId,
                  member.uid,
                  member.username,
                  member,
                  undefined,
                  savedContacts,
                  friendshipsList
                );
                const allowOnline = canViewLastSeen(
                  currentUserId,
                  member.uid,
                  member.username,
                  member,
                  undefined,
                  savedContacts,
                  friendshipsList
                );
                const memberOnline = allowOnline ? isUserCurrentlyOnline(member) : false;
                const visiblePhoto = allowPhoto ? member.photoURL : undefined;
                const visibleBio = allowBio ? member.bio || 'Available on ERROREX' : null;

                return (
                  <div
                    key={member.uid}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-between gap-2.5 transition-all shadow-sm min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setDpPreviewTarget({
                            displayName: member.displayName,
                            username: member.username,
                            photoURL: visiblePhoto || null,
                            bio: visibleBio,
                            isOnline: memberOnline,
                            showOnlineStatus: allowOnline,
                            photoHiddenByPrivacy: !allowPhoto,
                            bioHiddenByPrivacy: !allowBio
                          })
                        }
                        className="relative w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        title="Tap to view full-size DP & Bio"
                      >
                        {visiblePhoto ? (
                          <img src={visiblePhoto} alt={member.displayName} className="w-full h-full object-cover" />
                        ) : (
                          (member.displayName || 'U').slice(0, 1).toUpperCase()
                        )}
                        {allowOnline && (
                          <span
                            title={memberOnline ? 'Online' : 'Offline'}
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-card)] ${
                              memberOnline ? 'bg-emerald-500' : 'bg-neutral-500'
                            }`}
                          />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-[var(--text-main)] truncate">
                          {member.displayName}
                        </h3>
                        <p className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                          @{member.username}
                        </p>
                        {visibleBio ? (
                          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            {visibleBio}
                          </p>
                        ) : (
                          <p className="text-[10px] text-neutral-500 italic truncate mt-0.5">
                            Bio hidden by privacy
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAlreadyFriend ? (
                        <button
                          type="button"
                          onClick={() => onStartChatWithUser(member)}
                          title="Send Encrypted Message"
                          className="min-h-[40px] py-2 px-3.5 rounded-xl gold-button border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Chat</span>
                        </button>
                      ) : incomingReq ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(incomingReq)}
                          className="min-h-[40px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActionNotice(
                              `Request pending — you can message ${member.displayName} once they accept your friend request.`
                            )
                          }
                          title="Waiting for friend request acceptance"
                          className="min-h-[40px] inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] bg-neutral-200/80 dark:bg-neutral-800/80 px-3 rounded-xl cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Pending</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendFriendRequest(member)}
                          className="min-h-[40px] py-2 px-3 rounded-xl gold-button border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5 hover:gold-glow-sm cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
      <AvatarPreviewModal target={dpPreviewTarget} onClose={() => setDpPreviewTarget(null)} />
    </div>
  );
};
