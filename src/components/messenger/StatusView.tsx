import React, { useState, useEffect, useRef } from 'react';
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  handleFirestoreError,
  OperationType
} from '../../lib/firebase';
import { UserStatus, UserProfile } from '../../types';
import { GroupsView } from './GroupsView';
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Camera,
  Type,
  Users
} from 'lucide-react';

interface StatusViewProps {
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onOpenGroupChat?: (conversationId: string) => void;
  friends?: UserProfile[];
}

export const StatusView: React.FC<StatusViewProps> = ({
  currentUserId,
  currentUserProfile,
  onOpenGroupChat,
  friends = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'groups'>('status');
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  // Modal for new status
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [statusType, setStatusType] = useState<'text' | 'image'>('text');
  const [statusText, setStatusText] = useState('');
  const [statusBgColor, setStatusBgColor] = useState('#18181B');
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load active 24-hour statuses
  useEffect(() => {
    const q = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      snap => {
        const nowIso = new Date().toISOString();
        const list: UserStatus[] = [];
        snap.forEach((d: any) => {
          const data = d.data() as UserStatus;
          // Filter 24h expiration
          if (data.expiresAt > nowIso) {
            list.push({ ...data, id: d.id });
          }
        });
        setStatuses(list);
      },
      err => {
        handleFirestoreError(err, OperationType.GET, 'statuses');
      }
    );
    return () => unsub();
  }, []);

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setMediaDataUrl(reader.result as string);
      setStatusType('image');
    };
  };

  // Create Status
  const handlePublishStatus = async () => {
    if (statusType === 'text' && !statusText.trim()) return;
    if (statusType === 'image' && !mediaDataUrl) return;

    setIsSubmitting(true);
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      await addDoc(collection(db, 'statuses'), {
        userId: currentUserId,
        userName: currentUserProfile?.displayName || 'Member',
        userPhoto: currentUserProfile?.photoURL || '',
        type: statusType,
        text: statusText.trim(),
        mediaUrl: mediaDataUrl || '',
        caption: caption.trim(),
        bgColor: statusBgColor,
        viewers: [],
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString()
      });

      // Reset
      setIsCreatingStatus(false);
      setStatusText('');
      setMediaDataUrl(null);
      setCaption('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'statuses');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete own status
  const handleDeleteStatus = async (statusId: string) => {
    try {
      await deleteDoc(doc(db, 'statuses', statusId));
      if (activeStoryIndex !== null) {
        setActiveStoryIndex(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `statuses/${statusId}`);
    }
  };

  const myStatuses = statuses.filter(s => s.userId === currentUserId);
  const friendsStatuses = statuses.filter(s => s.userId !== currentUserId);

  if (activeSubTab === 'groups') {
    return (
      <div className="flex-1 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-4 md:p-6 overflow-y-auto transition-colors">
        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 pb-4 mb-2 border-b border-white/5">
          <button
            onClick={() => setActiveSubTab('status')}
            className="py-1.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all text-neutral-400 hover:text-white border-transparent hover:bg-neutral-900"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Status Stories</span>
          </button>
          <button
            onClick={() => setActiveSubTab('groups')}
            className="py-1.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Encrypted Groups</span>
          </button>
        </div>

        <GroupsView
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onOpenGroupChat={onOpenGroupChat || (() => {})}
          friends={friends}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-4 md:p-6 overflow-y-auto transition-colors">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-white/5">
        <button
          onClick={() => setActiveSubTab('status')}
          className="py-1.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Status Stories</span>
        </button>
        <button
          onClick={() => setActiveSubTab('groups')}
          className="py-1.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all text-neutral-400 hover:text-white border-transparent hover:bg-neutral-900"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Encrypted Groups</span>
        </button>
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h1 className="text-lg font-display font-bold gold-gradient-text">
            Status Stories
          </h1>
          <p className="text-xs text-neutral-400">
            Ephemeral 24-hour visual and text moments shared with friends.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingStatus(true)}
          className="py-2 px-4 rounded-xl gold-button-accent text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:gold-glow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Post Status</span>
        </button>
      </div>

      {/* Grid of Stories */}
      <div className="mt-6 space-y-6">
        {/* My Status */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            My Status
          </h2>
          {myStatuses.length === 0 ? (
            <div
              onClick={() => setIsCreatingStatus(true)}
              className="p-4 max-w-sm rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800 hover:border-[var(--accent-primary)] cursor-pointer flex items-center gap-3 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)]">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Add to my status</p>
                <p className="text-[10px] text-neutral-500">Disappears in 24 hours</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {myStatuses.map((st, i) => (
                <div
                  key={st.id}
                  onClick={() => setActiveStoryIndex(i)}
                  className="w-32 h-48 rounded-2xl border-2 border-[var(--accent-primary)] overflow-hidden relative cursor-pointer shrink-0 gold-glow-sm"
                  style={{ backgroundColor: st.bgColor || '#18181B' }}
                >
                  {st.mediaUrl ? (
                    <img src={st.mediaUrl} alt="Status" className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-3 w-full h-full flex items-center justify-center text-center text-xs text-white font-medium break-words">
                      {st.text}
                    </div>
                  )}
                  <div className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white">
                    You
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends' Statuses */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            Recent Updates
          </h2>
          {friendsStatuses.length === 0 ? (
            <p className="text-xs text-neutral-600">No updates from friends in the last 24 hours.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {friendsStatuses.map((st, idx) => (
                <div
                  key={st.id}
                  onClick={() => setActiveStoryIndex(myStatuses.length + idx)}
                  className="h-52 rounded-2xl border border-[var(--accent-border)] hover:border-[var(--accent-primary)] overflow-hidden relative cursor-pointer shadow-md transition-all group"
                  style={{ backgroundColor: st.bgColor || '#18181B' }}
                >
                  {st.mediaUrl ? (
                    <img src={st.mediaUrl} alt="Story" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="p-3 w-full h-full flex items-center justify-center text-center text-xs text-white font-medium break-words">
                      {st.text}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-2.5 flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-white truncate max-w-full">
                      {st.userName}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--accent-primary)]">
                      {new Date(st.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {activeStoryIndex !== null && statuses[activeStoryIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          {(() => {
            const current = statuses[activeStoryIndex];
            return (
              <div
                className="relative w-full max-w-sm h-[580px] rounded-3xl border border-[var(--accent-border)] gold-glow flex flex-col justify-between overflow-hidden p-4"
                style={{ backgroundColor: current.bgColor || '#09090B' }}
              >
                {/* Header with progress */}
                <div className="z-10 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 border border-[var(--accent-primary)] flex items-center justify-center font-bold text-xs text-[var(--accent-primary)]">
                      {current.userName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold">{current.userName}</h3>
                      <p className="text-[10px] text-neutral-400">
                        {new Date(current.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {current.userId === currentUserId && (
                      <button
                        onClick={() => handleDeleteStatus(current.id)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-rose-950 text-neutral-400 hover:text-rose-400"
                        title="Delete Story"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setActiveStoryIndex(null)}
                      className="p-1.5 rounded-lg bg-black/40 text-neutral-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex items-center justify-center overflow-hidden my-4 relative">
                  {current.mediaUrl ? (
                    <img src={current.mediaUrl} alt="Story" className="max-h-full max-w-full object-contain rounded-xl" />
                  ) : (
                    <p className="text-lg font-medium text-white text-center px-4 leading-relaxed break-words">
                      {current.text}
                    </p>
                  )}
                </div>

                {/* Caption if image */}
                {current.caption && (
                  <p className="text-center text-xs text-neutral-300 bg-black/60 py-2 px-3 rounded-xl mb-2">
                    {current.caption}
                  </p>
                )}

                {/* Navigation arrows */}
                <div className="flex items-center justify-between text-white">
                  <button
                    disabled={activeStoryIndex === 0}
                    onClick={() => setActiveStoryIndex(prev => (prev !== null ? prev - 1 : null))}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/80 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {activeStoryIndex + 1} of {statuses.length}
                  </span>
                  <button
                    disabled={activeStoryIndex === statuses.length - 1}
                    onClick={() => setActiveStoryIndex(prev => (prev !== null ? prev + 1 : null))}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/80 disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Status Modal */}
      {isCreatingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0E0E12] border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h2 className="text-sm font-display font-bold gold-gradient-text">
                Post 24-Hour Status
              </h2>
              <button onClick={() => setIsCreatingStatus(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector */}
            <div className="flex rounded-xl bg-black/50 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setStatusType('text')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  statusType === 'text' ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-white' : 'text-neutral-400'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Status</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusType('image');
                  fileInputRef.current?.click();
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  statusType === 'image' ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-white' : 'text-neutral-400'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photo Status</span>
              </button>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {statusType === 'text' ? (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={statusText}
                  onChange={e => setStatusText(e.target.value)}
                  placeholder="What's on your mind? (Encrypted story)"
                  className="w-full p-4 text-sm rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-[var(--accent-primary)] text-white focus:outline-none"
                />

                {/* Color pickers */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Background:</span>
                  {['#18181B', '#7C2D12', '#14532D', '#1E3A8A', '#581C87', '#831843'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStatusBgColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        statusBgColor === color ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {mediaDataUrl ? (
                  <div className="relative h-44 rounded-2xl overflow-hidden border border-neutral-700">
                    <img src={mediaDataUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMediaDataUrl(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-[var(--accent-primary)] flex flex-col items-center justify-center text-neutral-400 gap-2"
                  >
                    <Camera className="w-6 h-6 text-[var(--accent-primary)]" />
                    <span className="text-xs">Click to select photo</span>
                  </button>
                )}

                <input
                  type="text"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-neutral-900 border border-neutral-800 focus:border-[var(--accent-primary)] text-white focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handlePublishStatus}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl gold-button-accent text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Share Status'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
