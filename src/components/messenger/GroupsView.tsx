import React, { useState, useEffect } from 'react';
import {
  db,
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType
} from '../../lib/firebase';
import { Conversation, UserProfile } from '../../types';
import { chatStore } from '../../lib/chatStore';
import { Layers, Plus, Users, MessageSquare, X, Check } from 'lucide-react';

interface GroupsViewProps {
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onOpenGroupChat: (conversationId: string) => void;
  friends: UserProfile[];
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  currentUserId,
  currentUserProfile,
  onOpenGroupChat,
  friends
}) => {
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const syncGroups = (fromSnap: Conversation[] = []) => {
      const map = new Map<string, Conversation>();
      chatStore
        .getConversations(currentUserId)
        .filter(c => c.isGroup)
        .forEach(c => map.set(c.id, c));
      fromSnap.forEach(c => map.set(c.id, c));
      setGroups(Array.from(map.values()));
    };

    const q = query(
      collection(db, 'conversations'),
      where('isGroup', '==', true),
      where('participants', 'array-contains', currentUserId)
    );

    const unsub = onSnapshot(
      q,
      snap => {
        const list: Conversation[] = [];
        snap.forEach((d: any) => list.push({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }));
        syncGroups(list);
      },
      err => {
        handleFirestoreError(err, OperationType.GET, 'conversations');
      }
    );

    const unsubChat = chatStore.subscribe(() => syncGroups());
    syncGroups();

    return () => {
      unsub();
      unsubChat();
    };
  }, [currentUserId]);

  const toggleSelectFriend = (uid: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSubmitting(true);
    const participants = [currentUserId, ...selectedFriendIds];
    const nowIso = new Date().toISOString();

    const participantDetails: Record<string, { displayName: string; username: string; photoURL?: string }> = {
      [currentUserId]: {
        displayName: currentUserProfile?.displayName || 'Admin',
        username: currentUserProfile?.username || 'admin',
        photoURL: currentUserProfile?.photoURL || ''
      }
    };

    friends.forEach(f => {
      if (selectedFriendIds.includes(f.uid)) {
        participantDetails[f.uid] = {
          displayName: f.displayName,
          username: f.username,
          photoURL: f.photoURL || ''
        };
      }
    });

    try {
      const groupPayload = {
        participants,
        participantDetails,
        isGroup: true,
        groupName: groupName.trim(),
        groupPhoto: '',
        adminIds: [currentUserId],
        lastMessageText: 'Group created',
        lastMessageSenderId: currentUserId,
        lastMessageAt: nowIso,
        unreadCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      const docRef = await addDoc(collection(db, 'conversations'), groupPayload);
      chatStore.mergeRemoteConversations([{ id: docRef.id, ...groupPayload }], currentUserId);

      setIsCreatingGroup(false);
      setGroupName('');
      setSelectedFriendIds([]);
      onOpenGroupChat(docRef.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'conversations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-3 sm:p-5 md:p-6 overflow-y-auto transition-colors">
      <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-white/5">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-display font-bold gold-gradient-text">
            Group Communities
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Private, multi-participant encrypted circles and council rooms.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingGroup(true)}
          className="py-2.5 sm:py-2 px-4 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider flex items-center justify-center gap-2 hover:gold-glow-sm w-full sm:w-auto shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Group</span>
        </button>
      </div>

      {/* Groups List */}
      <div className="mt-5 sm:mt-6">
        {groups.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--accent-primary)]" />
            <p className="text-xs">No groups formed yet.</p>
            <button
              onClick={() => setIsCreatingGroup(true)}
              className="mt-3 text-xs text-[var(--accent-primary)] hover:underline"
            >
              Assemble your first group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map(grp => (
              <div
                key={grp.id}
                className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] transition-all flex flex-col justify-between shadow-sm min-w-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-[var(--text-main)] truncate">
                      {grp.groupName}
                    </h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                      {grp.participants.length} members
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-1">
                      {grp.lastMessageText || 'No recent activity'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-white/5 flex items-center justify-end">
                  <button
                    onClick={() => onOpenGroupChat(grp.id)}
                    className="py-1.5 px-3 rounded-lg gold-button text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5 hover:gold-glow-sm cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Council</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Create Group Modal */}
      {isCreatingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <form
            onSubmit={handleCreateGroup}
            className="w-full max-w-md my-auto max-h-[92dvh] overflow-y-auto p-5 sm:p-6 rounded-3xl bg-[#0E0E12] border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h2 className="text-sm font-display font-bold gold-gradient-text">
                Create New Group
              </h2>
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Sovereign Syndicate"
                className="w-full px-4 py-2.5 text-base sm:text-xs rounded-xl bg-neutral-900 border border-neutral-800 focus:border-[var(--accent-primary)] text-white focus:outline-none"
              />
            </div>

            {/* Member selection */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Select Members from Friends ({selectedFriendIds.length} selected)
              </label>
              {friends.length === 0 ? (
                <p className="text-xs text-neutral-500 italic p-3 bg-neutral-900 rounded-xl">
                  Add friends in the Friends tab first to invite them.
                </p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 p-1">
                  {friends.map(f => {
                    const isSelected = selectedFriendIds.includes(f.uid);
                    return (
                      <div
                        key={f.uid}
                        onClick={() => toggleSelectFriend(f.uid)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)]'
                            : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-[var(--accent-primary)] font-bold">
                            {f.displayName.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-white">{f.displayName}</p>
                            <p className="text-[10px] font-mono text-neutral-500">@{f.username}</p>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center ${
                            isSelected ? 'bg-[var(--accent-primary)] text-black' : 'border border-neutral-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !groupName.trim()}
              className="w-full py-3 rounded-xl gold-button-accent text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
            >
              {isSubmitting ? 'Assembling Group...' : 'Create Group'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
