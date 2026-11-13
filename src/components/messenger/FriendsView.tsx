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
import { isSupabaseConfigured } from '../../lib/supabase';
import { fetchSupabaseUserProfiles, isLegacyTestAccount } from '../../lib/supabaseSync';
import { hydrateStandaloneFromSupabase } from '../../lib/standaloneApi';
import { FriendRequest, Friendship, UserProfile } from '../../types';
import {
  Search,
  UserPlus,
  Check,
  X,
  MessageSquare,
  UserCheck,
  Users,
  RefreshCw
} from 'lucide-react';

interface FriendsViewProps {
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onStartChatWithUser: (targetUser: UserProfile) => void;
  initialSubTab?: 'friends' | 'requests' | 'directory';
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUserId,
  currentUserProfile,
  onStartChatWithUser,
  initialSubTab
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'requests' | 'directory'>(initialSubTab || 'friends');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);

  // Directory search & full members list state
  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

      // Fetch profiles of friends
      try {
        const userProfilesSnap = await getDocs(collection(db, 'userProfiles'));
        const profiles: UserProfile[] = [];
        userProfilesSnap.forEach(d => {
          if (friendIds.includes(d.id)) {
            profiles.push(d.data() as UserProfile);
          }
        });
        setFriends(profiles);
      } catch (err) {
        console.error('Error loading friend profiles:', err);
      }
    });

    return () => unsub();
  }, [currentUserId]);

  // Fetch ALL website users from Shared Server Directory + Local Store + Supabase
  const loadAllWebsiteMembers = useCallback(async () => {
    setIsSearching(true);
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
        // quiet on Netlify static hosting
      }

      // 2. Fetch from local userProfiles collection
      try {
        const snap = await getDocs(collection(db, 'userProfiles'));
        snap.forEach(d => addProfile(d.data() as UserProfile));
      } catch (e) {
        console.warn('Local userProfiles fetch notice:', e);
      }

      // 3. Fetch from Supabase user_profiles (primary global directory across Netlify & all devices)
      if (isSupabaseConfigured) {
        try {
          const suUsers = await fetchSupabaseUserProfiles();
          suUsers.forEach(addProfile);
        } catch (e) {
          console.warn('Supabase user_profiles fetch notice:', e);
        }
      }

      const sorted = Array.from(mergedMap.values()).sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      setAllMembers(sorted);
    } catch (err) {
      console.error('Load members error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [currentUserId]);

  // Automatically load all website users when FriendsView opens or userProfiles changes
  useEffect(() => {
    loadAllWebsiteMembers();
    const unsub = onSnapshot(collection(db, 'userProfiles'), () => {
      loadAllWebsiteMembers();
    });
    return () => unsub();
  }, [loadAllWebsiteMembers]);

  // Refresh when switching to Find Members tab
  useEffect(() => {
    if (activeSubTab === 'directory') {
      loadAllWebsiteMembers();
    }
  }, [activeSubTab, loadAllWebsiteMembers]);

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
    await loadAllWebsiteMembers();
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
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-4 md:p-6 overflow-y-auto transition-colors">
      {/* View Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/5">
        <div>
          <h1 className="text-lg font-display font-bold gold-gradient-text">
            Social Circle & Network
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Manage your verified contacts, pending authorizations, and user directory.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-200/70 dark:bg-black/60 rounded-xl border border-neutral-300 dark:border-white/5">
          <button
            onClick={() => setActiveSubTab('friends')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'friends'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all relative ${
              activeSubTab === 'requests'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
            }`}
          >
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[var(--accent-primary)] text-black">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'directory'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
            }`}
          >
            Find Members ({allMembers.length})
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="my-3 p-3 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] text-xs text-[var(--accent-primary)] flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-neutral-400 hover:text-white">
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
              {friends.map(friend => (
                <div
                  key={friend.uid}
                  className="p-4 rounded-2xl bg-white dark:bg-neutral-900/60 border border-[var(--accent-border)] flex items-center justify-between hover:border-[var(--accent-primary)] transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm overflow-hidden shrink-0">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                      ) : (
                        friend.displayName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[var(--text-main)] truncate max-w-[120px]">
                        {friend.displayName}
                      </h2>
                      <p className="text-[10px] font-mono text-[var(--accent-primary)]">
                        @{friend.username}
                      </p>
                      <span className="text-[9px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${friend.isOnline ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                        <span>{friend.isOnline ? 'Online' : 'Offline'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onStartChatWithUser(friend)}
                      title="Send Encrypted Message"
                      className="py-2 px-3 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Requests */}
      {activeSubTab === 'requests' && (
        <div className="mt-4 flex-1 space-y-6">
          {/* Incoming */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Incoming Friend Requests ({incomingRequests.length})
            </h2>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-neutral-600">No pending requests</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomingRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-950 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-xs">
                        {req.senderName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">{req.senderName}</h3>
                        <p className="text-[10px] font-mono text-[var(--accent-primary)]">
                          @{req.senderUsername}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900 text-neutral-400 hover:text-white"
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Sent Requests Awaiting Response ({outgoingRequests.length})
            </h2>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-neutral-600">No sent requests</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outgoingRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex items-center justify-between"
                  >
                    <span className="text-xs text-neutral-300">
                      Request sent to member ID: {req.receiverId.slice(0, 8)}...
                    </span>
                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="text-xs text-neutral-400 hover:text-rose-400 py-1 px-2.5 rounded-lg border border-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: All Website Users Directory (Find Members) */}
      {activeSubTab === 'directory' && (
        <div className="mt-4 flex-1 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <form onSubmit={handleSearchUsers} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, @username, or bio..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="py-2 px-3.5 rounded-xl gold-button border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5 hover:gold-glow-sm transition-all cursor-pointer"
                title="Refresh all website members"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </form>

            <div className="flex flex-col sm:items-end gap-0.5 text-[11px] font-mono text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Showing {searchResults.length} of {allMembers.length} website members</span>
              </div>
              {currentUserProfile?.username && (
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400">
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

                return (
                  <div
                    key={member.uid}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-between gap-3 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm overflow-hidden shrink-0">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                        ) : (
                          (member.displayName || 'U').slice(0, 1).toUpperCase()
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-card)] ${
                            member.isOnline ? 'bg-emerald-500' : 'bg-neutral-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-[var(--text-main)] truncate">
                          {member.displayName}
                        </h3>
                        <p className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                          @{member.username}
                        </p>
                        {member.bio && (
                          <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[160px] mt-0.5">
                            {member.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onStartChatWithUser(member)}
                        title="Start Private Chat"
                        className="p-2 rounded-xl gold-button border border-[var(--accent-border)] text-[var(--accent-primary)] hover:gold-glow-sm transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      {isAlreadyFriend ? (
                        <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/30">
                          Friends
                        </span>
                      ) : incomingReq ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(incomingReq)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                      ) : isPending ? (
                        <span className="text-[10px] text-[var(--text-muted)] bg-neutral-200 dark:bg-neutral-800 px-2.5 py-1.5 rounded-xl">
                          Pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendFriendRequest(member)}
                          className="py-1.5 px-3 rounded-xl gold-button border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1 hover:gold-glow-sm cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add</span>
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
  );
};
