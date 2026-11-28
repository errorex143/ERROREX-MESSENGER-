import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ContactItem, UserProfile } from '../../types';
import { chatStore } from '../../lib/chatStore';
import { AvatarPreviewModal, AvatarPreviewTarget } from '../common/AvatarPreviewModal';
import { FriendsView } from './FriendsView';
import {
  Search,
  UserPlus,
  MessageSquare,
  X,
  Check,
  Trash2,
  AtSign,
  User,
  FileText,
  Camera
} from 'lucide-react';

export type ContactsSubTab = 'saved' | 'friends' | 'requests' | 'directory';

interface ContactsViewProps {
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onStartChatWithUser: (
    targetUser: UserProfile | { displayName: string; uid?: string; username?: string; photoURL?: string; bio?: string }
  ) => void;
  initialSubTab?: ContactsSubTab;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  currentUserId,
  currentUserProfile,
  onStartChatWithUser,
  initialSubTab = 'saved'
}) => {
  const [subTab, setSubTab] = useState<ContactsSubTab>(initialSubTab);
  const [contacts, setContacts] = useState<ContactItem[]>(() => chatStore.getContacts());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{ id: string; name: string } | null>(null);
  const [circleCounts, setCircleCounts] = useState({
    friendsCount: 0,
    incomingCount: 0,
    membersCount: 0
  });

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const handleCountsChange = useCallback(
    (counts: { friendsCount: number; incomingCount: number; membersCount: number }) => {
      setCircleCounts(counts);
    },
    []
  );

  // New Contact form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('Hey there! I am using ERROREX.');
  const [photoURL, setPhotoURL] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dpPreviewTarget, setDpPreviewTarget] = useState<AvatarPreviewTarget | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to contact updates in chatStore
  useEffect(() => {
    setContacts(chatStore.getContacts());
    const unsub = chatStore.subscribe(() => {
      setContacts(chatStore.getContacts());
    });
    return () => unsub();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setPhotoURL(reader.result as string);
    };
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Contact name is required.');
      return;
    }
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
    chatStore.addContact({
      name: name.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      photoURL: photoURL || undefined
    });

    setNotice(`Contact @${cleanUsername} added successfully!`);
    setName('');
    setUsername('');
    setBio('Hey there! I am using ERROREX.');
    setPhotoURL('');
    setIsAddModalOpen(false);
    setSubTab('saved');
    setTimeout(() => setNotice(null), 3500);
  };

  const confirmDeleteContact = () => {
    if (!contactToDelete) return;
    chatStore.deleteContact(contactToDelete.id);
    setNotice(`${contactToDelete.name} removed from contacts.`);
    setContactToDelete(null);
    setTimeout(() => setNotice(null), 3000);
  };

  const filteredContacts = contacts.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.bio && c.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-3 sm:p-5 md:p-6 overflow-y-auto transition-colors">
      <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 min-w-0">
      {/* Unified Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-neutral-200 dark:border-white/5">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-display font-bold gold-gradient-text flex items-baseline gap-2 flex-wrap">
            <span>Contacts Book & Social Circle</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Manage saved contacts, friends, friend requests, and member discovery in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[44px] py-2.5 sm:py-2 px-4 rounded-xl gold-button-accent text-xs font-bold flex items-center justify-center gap-1.5 hover:gold-glow-sm transition-all w-full lg:w-auto shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* Unified Sub-Tabs */}
      <div className="mt-3 flex items-center gap-1 p-1 bg-neutral-200/70 dark:bg-black/60 rounded-xl border border-neutral-300 dark:border-white/5 overflow-x-auto scrollbar-none w-full shrink-0">
        <button
          type="button"
          onClick={() => setSubTab('saved')}
          className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex-1 sm:flex-initial tabular-nums cursor-pointer ${
            subTab === 'saved'
              ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
          }`}
        >
          Saved Contacts ({contacts.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('friends')}
          className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex-1 sm:flex-initial tabular-nums cursor-pointer ${
            subTab === 'friends'
              ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
          }`}
        >
          Friends{circleCounts.friendsCount > 0 ? ` (${circleCounts.friendsCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('requests')}
          className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-all relative whitespace-nowrap shrink-0 flex-1 sm:flex-initial tabular-nums cursor-pointer ${
            subTab === 'requests'
              ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
          }`}
        >
          <span>Requests</span>
          {circleCounts.incomingCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--accent-primary)] text-black">
              {circleCounts.incomingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('directory')}
          className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex-1 sm:flex-initial tabular-nums cursor-pointer ${
            subTab === 'directory'
              ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)]'
          }`}
        >
          Find Members{circleCounts.membersCount > 0 ? ` (${circleCounts.membersCount})` : ''}
        </button>
      </div>

      {notice && (
        <div className="my-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{notice}</span>
          </span>
          <button type="button" onClick={() => setNotice(null)} className="text-neutral-400 hover:text-white shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Keep FriendsView mounted inside Contacts Book so live badges stay synced and transitions are instant */}
      <div className={subTab === 'saved' ? 'hidden' : 'flex-1 flex flex-col min-w-0'}>
        <FriendsView
          embedded
          externalSubTab={subTab === 'saved' ? 'friends' : subTab}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onStartChatWithUser={onStartChatWithUser}
          onCountsChange={handleCountsChange}
        />
      </div>

      {subTab === 'saved' && (
        <>
          {/* Search Bar */}
          <div className="mt-4 mb-4 relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, @username, or status..."
              className="w-full min-h-[42px] pl-10 pr-4 py-2.5 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Contacts List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredContacts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-neutral-500">
                <User className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--accent-primary)]" />
                <p className="text-xs">No saved contacts match your query.</p>
                <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer"
                  >
                    Add a new contact
                  </button>
                  <span className="text-neutral-600">·</span>
                  <button
                    type="button"
                    onClick={() => setSubTab('directory')}
                    className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer"
                  >
                    Browse Find Members
                  </button>
                </div>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-between gap-2.5 transition-all shadow-sm group min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Contact DP (Click to view full size) */}
                    <button
                      type="button"
                      onClick={() =>
                        setDpPreviewTarget({
                          displayName: contact.name,
                          username: contact.username,
                          photoURL: contact.photoURL || null,
                          bio: contact.bio || 'Encrypted contact',
                          isOnline: Boolean(contact.isOnline),
                          showOnlineStatus: true
                        })
                      }
                      className="relative shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      title="Tap to view DP & Bio"
                    >
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm shrink-0 overflow-hidden shadow-inner">
                        {contact.photoURL ? (
                          <img src={contact.photoURL} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          contact.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      {contact.isOnline && (
                        <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] absolute bottom-0 right-0" />
                      )}
                    </button>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-[var(--text-main)] truncate">
                        {contact.name}
                      </h3>
                      <p className="text-[11px] font-mono text-[var(--accent-primary)] truncate">
                        @{contact.username}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                        {contact.bio || 'Encrypted contact'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onStartChatWithUser({
                          displayName: contact.name,
                          username: contact.username,
                          photoURL: contact.photoURL,
                          bio: contact.bio
                        })
                      }
                      className="min-h-[40px] py-2 px-3.5 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      title={`Start Chat with ${contact.name}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactToDelete({ id: contact.id, name: contact.name })}
                      aria-label={`Delete ${contact.name}`}
                      className="min-w-[40px] min-h-[40px] rounded-xl text-neutral-400 hover:text-rose-500 flex items-center justify-center transition-colors opacity-90 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      </div>

      {/* Delete Contact Confirmation Modal */}
      {contactToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setContactToDelete(null)}
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
                <h3 className="text-sm font-bold text-[var(--text-main)]">Remove Contact?</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Remove {contactToDelete.name} from your saved contacts?
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[var(--accent-border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteContact}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Contact Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[92dvh] overflow-y-auto p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col space-y-4"
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-neutral-400/40 mx-auto -mt-1" />

            <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-display font-bold gold-gradient-text flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Add Private Contact</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddContact} className="space-y-4">
              {/* DP Selection */}
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-lg overflow-hidden shadow-inner">
                    {photoURL ? (
                      <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      name ? name.slice(0, 1).toUpperCase() : <Camera className="w-6 h-6 text-neutral-500" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition-opacity">
                    Change
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-main)]">Contact Profile Picture</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-[var(--accent-primary)] hover:underline"
                  >
                    Upload Photo (Optional)
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Contact Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sarah Connor, Dr. Vance"
                    className="w-full pl-9 pr-3 py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Unique Username (@handle)
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="sarah_connor"
                    className="w-full pl-9 pr-3 py-2 text-base sm:text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Used for sovereign end-to-end addressing.
                </p>
              </div>

              {/* Bio / Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)]">
                    Bio / About Status
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono tabular-nums">
                    {bio.length}/80
                  </span>
                </div>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    maxLength={80}
                    value={bio}
                    onChange={e => setBio(e.target.value.slice(0, 80))}
                    placeholder="e.g. Available, Encrypted only"
                    className="w-full pl-9 pr-3 py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AvatarPreviewModal target={dpPreviewTarget} onClose={() => setDpPreviewTarget(null)} />
    </div>
  );
};
