import React, { useState, useEffect, useRef } from 'react';
import { ContactItem, UserProfile } from '../../types';
import { chatStore } from '../../lib/chatStore';
import {
  Search,
  UserPlus,
  MessageSquare,
  X,
  Check,
  Trash2,
  Lock,
  AtSign,
  User,
  FileText,
  Camera,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface ContactsViewProps {
  onStartChatWithContact: (contact: { displayName: string; username: string; photoURL?: string; bio?: string }) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onStartChatWithContact }) => {
  const [contacts, setContacts] = useState<ContactItem[]>(() => chatStore.getContacts());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Contact form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('Hey there! I am using ERROREX.');
  const [photoURL, setPhotoURL] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const newContact = chatStore.addContact({
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
    setTimeout(() => setNotice(null), 3500);
  };

  const handleDeleteContact = (contactId: string, contactName: string) => {
    if (confirm(`Remove ${contactName} from your private contacts?`)) {
      chatStore.deleteContact(contactId);
      setNotice(`${contactName} removed from contacts.`);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const filteredContacts = contacts.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.bio && c.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-4 md:p-6 overflow-y-auto transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-white/5">
        <div>
          <h1 className="text-lg font-display font-bold gold-gradient-text flex items-center gap-2">
            <span>Private Contacts Book</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-mono">
              {contacts.length}
            </span>
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Manage your personal private contacts and start direct encrypted dialogues.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="py-2 px-4 rounded-xl gold-button-accent text-xs font-bold text-black flex items-center justify-center gap-1.5 hover:gold-glow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Contact</span>
        </button>
      </div>

      {notice && (
        <div className="my-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400" />
            {notice}
          </span>
          <button onClick={() => setNotice(null)} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mt-4 mb-4 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, @username, or status..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Contacts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-neutral-500">
            <User className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--accent-primary)]" />
            <p className="text-xs">No contacts match your query.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 text-xs text-[var(--accent-primary)] hover:underline"
            >
              Add a new contact to your book
            </button>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div
              key={contact.id}
              className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-start justify-between transition-all shadow-sm group"
            >
              <div className="flex items-start gap-3 min-w-0">
                {/* Contact DP */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm shrink-0 overflow-hidden shadow-inner">
                    {contact.photoURL ? (
                      <img src={contact.photoURL} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      contact.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  {contact.isOnline && (
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] absolute bottom-0 right-0" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-[var(--text-main)] truncate">
                    {contact.name}
                  </h3>
                  <p className="text-[11px] font-mono text-[var(--accent-primary)]">
                    @{contact.username}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 max-w-[150px] sm:max-w-[180px]">
                    {contact.bio || 'Encrypted contact'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() =>
                    onStartChatWithContact({
                      displayName: contact.name,
                      username: contact.username,
                      photoURL: contact.photoURL,
                      bio: contact.bio
                    })
                  }
                  className="py-1.5 px-3 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm flex items-center gap-1 transition-all"
                  title={`Start Chat with ${contact.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
                <button
                  onClick={() => handleDeleteContact(contact.id, contact.name)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Contact"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h2 className="text-sm font-display font-bold gold-gradient-text flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Add Private Contact</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-[var(--text-main)]"
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
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
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
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Used for sovereign end-to-end addressing.
                </p>
              </div>

              {/* Bio / Status */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                  Bio / About Status
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="e.g. Available, Encrypted only"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-neutral-700 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
