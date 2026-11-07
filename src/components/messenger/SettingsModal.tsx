import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { ThemeName, ColorMode, PrivacySettings } from '../../types';
import { chatStore } from '../../lib/chatStore';
import {
  X,
  Palette,
  Eye,
  User,
  KeyRound,
  Shield,
  Sun,
  Moon,
  Laptop,
  Check,
  Lock,
  ShieldCheck,
  Camera,
  AlertCircle,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';

const HERALDIC_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
];

const WHATSAPP_STATUS_PRESETS = [
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'Sovereign Protocol Active',
  'Encrypted comms only',
  'Can’t talk, ERROREX only',
  'Vault Secured'
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'appearance' | 'privacy' | 'profile' | 'pin';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'appearance'
}) => {
  const { userProfile, updateUserProfile, verifyPin, setupPin, lockMessenger } = useAuth();
  const {
    theme,
    setTheme,
    mode,
    setMode,
    autoCycleEnabled,
    setAutoCycleEnabled,
    cycleNextTheme,
    formattedCountdown
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'appearance' | 'privacy' | 'profile' | 'pin'>(initialTab);

  // Profile State
  const storedProfile = chatStore.getUserProfile();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || storedProfile.displayName || 'Noor');
  // USERNAME IS PERMANENT & IMMUTABLE (@noor)
  const permanentUsername = userProfile?.username || storedProfile.username || 'noor';
  const [bio, setBio] = useState(userProfile?.bio || storedProfile.bio || 'Sovereign Account • Encrypted Vault Active');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || storedProfile.photoURL || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Privacy State
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => chatStore.getPrivacySettings());
  const [privacySavedNotice, setPrivacySavedNotice] = useState(false);

  // PIN Change State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Profile Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setPhotoURL(reader.result as string);
    };
  };

  // Handle Profile Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    chatStore.saveUserProfile({
      displayName: displayName.trim(),
      bio: bio.trim(),
      photoURL
    });

    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL
      });
    } catch (err) {
      console.warn('Profile sync:', err);
    }

    setProfileSaving(false);
    setProfileMessage('Profile details updated successfully!');
    setTimeout(() => setProfileMessage(null), 3000);
  };

  // Handle Privacy Change
  const updatePrivacyField = (key: keyof PrivacySettings, value: any) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    chatStore.savePrivacySettings(updated);
    setPrivacySavedNotice(true);
    setTimeout(() => setPrivacySavedNotice(false), 2500);
  };

  // Handle PIN Change
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);
    setPinError(null);

    if (!/^\d{8}$/.test(currentPin)) {
      setPinError('Current PIN must be 8 numeric digits.');
      return;
    }
    if (!/^\d{8}$/.test(newPin)) {
      setPinError('New PIN must be exactly 8 numeric digits.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError('New PIN and confirmation do not match.');
      return;
    }

    setPinLoading(true);
    try {
      const verifyRes = await verifyPin(currentPin);
      if (!verifyRes.unlocked) {
        setPinError('Current secret PIN is incorrect.');
        setPinLoading(false);
        return;
      }

      const updateRes = await setupPin(newPin);
      if (updateRes.success) {
        setPinMessage('Your secret 8-digit PIN was updated successfully!');
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
      } else {
        setPinError(updateRes.error || 'Failed to update PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error communicating with server.');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden text-[var(--text-main)]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between bg-[var(--bg-card)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <span>ERROREX Settings</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-semibold">
                  Messenger Preferences
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 py-2 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-sidebar)] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'appearance'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Themes & 8 Colors</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'profile'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <User className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Profile & DP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'privacy'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'pin'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Secret 8-Digit PIN</span>
          </button>
        </div>

        {/* Modal Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: Themes & 8 Colors (Dark, Light, System) */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              {/* 3 Mode Options */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-3 shadow-sm">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Theme Mode (3 Options)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('dark')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      mode === 'dark'
                        ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Dark Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('light')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      mode === 'light'
                        ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Light Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('system')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      mode === 'system'
                        ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>System Auto</span>
                  </button>
                </div>
              </div>

              {/* Auto Color Change System: 10-minute automatic rotation */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                    <RefreshCw className={`w-4 h-4 ${autoCycleEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[var(--text-main)]">Auto Color System (10 Mins)</h4>
                      {autoCycleEnabled && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          {formattedCountdown}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      Changes website theme every 10 minutes automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {autoCycleEnabled && (
                    <button
                      type="button"
                      onClick={cycleNextTheme}
                      className="py-1 px-2.5 rounded-xl gold-button text-[11px] font-semibold text-[var(--accent-primary)] hover:border-[var(--accent-primary)] shadow-sm transition-all"
                    >
                      Cycle Now
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAutoCycleEnabled(!autoCycleEnabled)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      autoCycleEnabled
                        ? 'gold-button-accent text-black'
                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:text-white'
                    }`}
                  >
                    {autoCycleEnabled ? 'Auto ON' : 'Auto OFF'}
                  </button>
                </div>
              </div>

              {/* 14 Unique Luxury Colors */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>14 Luxury Colors (Active in Dark & Light)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold">
                    {THEMES.find(t => t.id === theme)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEMES.map(th => {
                    const isSelected = theme === th.id;
                    const colorNames: Record<string, string> = {
                      gold: 'Imperial Gold',
                      white: 'Platinum White',
                      black: 'Obsidian Black',
                      crimson: 'Blood Crimson',
                      midnight: 'Midnight Indigo',
                      forest: 'Dark Forest',
                      bronze: 'Dark Bronze',
                      emerald: 'Emerald Green',
                      ocean: 'Sapphire Blue',
                      purple: 'Royal Purple',
                      rose: 'Ruby Red',
                      sunset: 'Amber Orange',
                      electric: 'Cyan Blue',
                      teal: 'Midnight Teal'
                    };
                    const displayName = colorNames[th.id] || th.name;

                    return (
                      <div
                        key={th.id}
                        onClick={() => setTheme(th.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between shadow-sm ${
                          isSelected
                            ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] shadow-md'
                            : 'bg-[var(--bg-card)] border-neutral-200 dark:border-neutral-800 hover:border-[var(--accent-border)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full border-2 border-white/20 shadow-sm shrink-0"
                            style={{ backgroundColor: th.primaryHex }}
                          />
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-[var(--text-main)] truncate">{displayName}</h4>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center shrink-0 ml-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WhatsApp Profile & DP */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {profileMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-sm">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{profileMessage}</span>
                </div>
              )}

              {/* DP Changer */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-900 border-2 border-[var(--accent-border)] gold-glow flex items-center justify-center text-[var(--accent-primary)] font-bold text-2xl overflow-hidden shadow-md">
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
                    title="Change Profile Photo"
                  >
                    <Camera className="w-5 h-5 mb-0.5 text-[var(--accent-primary)]" />
                    <span>Change</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-main)]">{displayName}</h3>
                    <p className="text-[11px] font-mono text-[var(--accent-primary)]">@{permanentUsername}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1 px-3 rounded-lg gold-button text-xs font-semibold text-[var(--accent-primary)] hover:gold-glow-sm"
                    >
                      Upload New DP
                    </button>
                    {photoURL && (
                      <button
                        type="button"
                        onClick={() => setPhotoURL('')}
                        className="py-1 px-2.5 rounded-lg border border-neutral-700 text-xs text-neutral-400 hover:text-rose-400 transition-colors"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  {/* Preset Avatars */}
                  <div className="pt-1">
                    <span className="text-[10px] text-[var(--text-muted)] block mb-1">Preset Avatars:</span>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      {HERALDIC_AVATARS.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="Preset"
                          onClick={() => setPhotoURL(url)}
                          className="w-6 h-6 rounded-full object-cover border border-neutral-600 hover:border-[var(--accent-primary)] cursor-pointer hover:scale-110 transition-transform"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields: Name, Locked Username, Bio */}
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                {/* 1. Display Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-main)]">
                      Your Display Name (Changeable)
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {displayName.length}/25
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    This name will be visible to your contacts across the ERROREX network.
                  </p>
                </div>

                {/* 2. Permanent Username (CANNOT BE CHANGED) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                      <span>Username (@handle)</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                        Permanent
                      </span>
                    </label>
                    <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--accent-primary)] opacity-80" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={`@${permanentUsername}`}
                      className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl bg-neutral-200/50 dark:bg-black/50 border border-neutral-300 dark:border-neutral-800 text-[var(--accent-primary)] cursor-not-allowed select-all"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Your ERROREX username <strong>(@{permanentUsername})</strong> is fixed and cannot be changed.
                  </p>
                </div>

                {/* 3. Bio / About Status */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                    About / Bio Status (Changeable)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell contacts about yourself..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none transition-colors"
                  />

                  {/* Status Presets */}
                  <div className="mt-1.5 space-y-1">
                    <span className="text-[10px] text-[var(--text-muted)] block">Status Presets:</span>
                    <div className="flex flex-wrap gap-1">
                      {WHATSAPP_STATUS_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBio(preset)}
                          className={`py-0.5 px-2 rounded-lg text-[10px] border transition-colors ${
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

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider hover:gold-glow-sm transition-all disabled:opacity-50"
                >
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: WhatsApp Privacy Rules */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              {privacySavedNotice && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Privacy settings saved successfully!</span>
                </div>
              )}

              {/* 1. Profile Photo Privacy */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2 shadow-sm">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)]">Profile Photo (DP) Privacy</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Who can see your profile picture</p>
                </div>
                <div className="flex gap-1.5">
                  {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updatePrivacyField('profilePhoto', option)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-xl border capitalize transition-colors ${
                        privacy.profilePhoto === option
                          ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                          : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {option === 'contacts' ? 'My Contacts' : option}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Bio / About Privacy */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2 shadow-sm">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)]">About / Bio Privacy</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Who can view your status and bio information</p>
                </div>
                <div className="flex gap-1.5">
                  {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updatePrivacyField('bio', option)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-xl border capitalize transition-colors ${
                        privacy.bio === option
                          ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                          : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {option === 'contacts' ? 'My Contacts' : option}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Last Seen & Online Presence */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2 shadow-sm">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)]">Last Seen & Online Presence</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">Control visibility of your active online indicator</p>
                </div>
                <div className="flex gap-1.5">
                  {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updatePrivacyField('lastSeen', option)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-xl border capitalize transition-colors ${
                        privacy.lastSeen === option
                          ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                          : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {option === 'contacts' ? 'My Contacts' : option}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Read Receipts */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)]">Read Receipts (Blue Ticks)</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Show double checkmarks when messages are read
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updatePrivacyField('readReceipts', !privacy.readReceipts)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    privacy.readReceipts ? 'bg-[var(--accent-primary)]' : 'bg-neutral-300 dark:bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      privacy.readReceipts ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Secret 8-Digit PIN & Lock */}
          {activeTab === 'pin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-3.5 shadow-sm">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main)]">Change Secret 8-Digit PIN</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Update the secret 8-digit PIN used to unlock the private messenger from the calculator.
                  </p>
                </div>

                {pinMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{pinMessage}</span>
                  </div>
                )}

                {pinError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>{pinError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-main)] mb-1">
                      Current 8-Digit PIN
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={8}
                      value={currentPin}
                      onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-main)] mb-1">
                      New 8-Digit PIN
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={8}
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-main)] mb-1">
                      Confirm New 8-Digit PIN
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={8}
                      value={confirmNewPin}
                      onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pinLoading || newPin.length !== 8}
                    className="w-full py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider disabled:opacity-50 mt-1"
                  >
                    {pinLoading ? 'Verifying & Updating...' : 'Update Secret PIN'}
                  </button>
                </form>
              </div>

              {/* Instant Lock to Calculator */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-rose-950/50 flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-rose-500">Lock Application</h4>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Immediately exit messenger and display the calculator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={lockMessenger}
                  className="py-1.5 px-3.5 rounded-xl bg-neutral-900 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs text-white font-semibold flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Lock Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-5 border-t border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            ERROREX Sovereign Preferences
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl gold-button text-xs font-semibold text-[var(--text-main)] hover:gold-glow-sm"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
