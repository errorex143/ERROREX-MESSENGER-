import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatStore } from '../../lib/chatStore';
import { AvatarPreviewModal } from '../common/AvatarPreviewModal';
import {
  Camera,
  Check,
  ShieldCheck,
  User,
  Calendar,
  Lock,
  FileText,
  Sparkles,
  Info,
  LogOut,
  Eye
} from 'lucide-react';

const HERALDIC_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
];

const STATUS_PRESETS = [
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'Sovereign Protocol Active',
  'Encrypted comms only',
  'Can’t talk, ERROREX only',
  'Vault Secured'
];

export const ProfileView: React.FC = () => {
  const { userProfile, updateUserProfile, lockMessenger, logout } = useAuth();
  const storedProfile = chatStore.getUserProfile();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || storedProfile.displayName || 'User');
  const [username, setUsername] = useState(userProfile?.username || storedProfile.username || 'user');
  const [bio, setBio] = useState(userProfile?.bio || storedProfile.bio || 'Sovereign Account • Encrypted Vault Active');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || storedProfile.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDpPreviewOpen, setIsDpPreviewOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const url = reader.result as string;
      setPhotoURL(url);
    };
  };

  const handleSelectPresetAvatar = (url: string) => {
    setPhotoURL(url);
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';

    // Save to chatStore
    chatStore.saveUserProfile({
      displayName: displayName.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      photoURL
    });

    // Save to context / Firestore
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        photoURL
      });
    } catch (e) {
      console.warn('Profile sync:', e);
    }

    setSaving(false);
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(null), 3500);
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-3 sm:p-5 md:p-6 overflow-y-auto transition-colors">
      <div className="w-full max-w-3xl mx-auto flex flex-col min-w-0 pb-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-neutral-200 dark:border-white/5">
        <h1 className="text-base sm:text-lg font-display font-bold gold-gradient-text flex items-center gap-2">
          <span>Profile & Identity</span>
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          Manage your personal profile picture, display name, and about status.
        </p>
      </div>

      <div className="mt-5 sm:mt-6 w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {message && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-sm">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Profile DP / Avatar Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex flex-col sm:flex-row items-center gap-4 sm:gap-5 shadow-sm">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-900 border-2 border-[var(--accent-border)] gold-glow flex items-center justify-center text-[var(--accent-primary)] font-bold text-3xl overflow-hidden shadow-lg">
                {photoURL ? (
                  <img src={photoURL} alt="Profile DP" className="w-full h-full object-cover" />
                ) : (
                  displayName.slice(0, 1).toUpperCase() || 'N'
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] transition-opacity cursor-pointer"
              >
                <Camera className="w-6 h-6 mb-1 text-[var(--accent-primary)]" />
                <span>Change DP</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">{displayName || 'User'}</h2>
                <p className="text-xs font-mono text-[var(--accent-primary)]">@{username}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[40px] py-2 px-3.5 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm transition-all cursor-pointer"
                >
                  Upload New DP
                </button>
                <button
                  type="button"
                  onClick={() => setIsDpPreviewOpen(true)}
                  className="min-h-[40px] py-2 px-3.5 rounded-xl border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>View DP</span>
                </button>
                {photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="min-h-[40px] py-2 px-3 rounded-xl border border-[var(--accent-border)] text-xs text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Preset Avatar Quick Picks */}
              <div className="pt-2">
                <span className="text-[10px] text-[var(--text-muted)] block mb-1.5">Preset Avatars:</span>
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  {HERALDIC_AVATARS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Preset"
                      onClick={() => handleSelectPresetAvatar(url)}
                      className="w-9 h-9 rounded-full object-cover border border-neutral-400 dark:border-neutral-600 hover:border-[var(--accent-primary)] cursor-pointer hover:scale-110 transition-transform"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields: Display Name, Locked Username, and Bio */}
          <div className="space-y-4">
            {/* 1. Display Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--text-main)]">
                  Your Name
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {displayName.length}/25
                </span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-neutral-500" />
                <input
                  type="text"
                  required
                  maxLength={25}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none transition-colors"
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                This is not your username or PIN. This name will be visible to your ERROREX contacts.
              </p>
            </div>

            {/* 2. Username (@handle) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                  <span>Username (@handle)</span>
                </label>
                <span className="text-[10px] text-[var(--accent-primary)] font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Customizable</span>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 sm:top-2.5 text-sm sm:text-xs font-mono text-[var(--accent-primary)] font-bold">@</span>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_handle"
                  className="w-full pl-9 pr-4 py-2.5 text-base sm:text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--accent-primary)] focus:outline-none transition-colors"
                />
              </div>
              <div className="mt-1.5 p-2 rounded-xl bg-neutral-200/50 dark:bg-neutral-900/60 border border-[var(--accent-border)] flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <Info className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span className="min-w-0 break-words">
                  Your custom ERROREX username <strong>(@{username})</strong> for finding contacts and receiving messages.
                </span>
              </div>
            </div>

            {/* 3. Bio / About Status */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1.5">
                About / Bio Status
              </label>
              <div className="relative mb-2">
                <FileText className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-neutral-500" />
                <textarea
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell your contacts about yourself..."
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none transition-colors"
                />
              </div>

              {/* Quick Status Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] block">Quick Status Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBio(preset)}
                      className={`py-1 px-2.5 rounded-lg text-[11px] border transition-colors cursor-pointer ${
                        bio === preset
                          ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold'
                          : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto min-h-[44px] py-3 px-8 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider disabled:opacity-50 hover:gold-glow-sm transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        {/* Session & Quick Lock Actions (especially convenient on Mobile) */}
        <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)]">Session & Vault Security</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Lock instantly back to the calculator or sign out of this device.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={lockMessenger}
              className="flex-1 sm:flex-initial min-h-[44px] py-2.5 px-4 rounded-xl gold-button border border-[var(--accent-border)] text-xs font-semibold text-[var(--accent-primary)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Vault</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex-1 sm:flex-initial min-h-[44px] py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
      </div>

      <AvatarPreviewModal
        target={
          isDpPreviewOpen
            ? {
                displayName: displayName || 'User',
                username,
                photoURL: photoURL || null,
                bio,
                isOnline: true,
                showOnlineStatus: true
              }
            : null
        }
        onClose={() => setIsDpPreviewOpen(false)}
      />
    </div>
  );
};
