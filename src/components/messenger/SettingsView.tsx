import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../context/ThemeContext';
import { PrivacySettings } from '../../types';
import { chatStore } from '../../lib/chatStore';
import { AvatarCropModal } from '../common/AvatarCropModal';
import {
  Palette,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Sun,
  Moon,
  Laptop,
  Lock,
  User,
  ShieldCheck,
  Sparkles,
  Camera,
  RefreshCw,
  Crop,
  Trash2,
  Mail
} from 'lucide-react';
import { updatePassword } from '../../lib/firebase';

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

export const SettingsView: React.FC = () => {
  const {
    user,
    verifyPin,
    setupPin,
    lockMessenger,
    updateUserProfile,
    verifyAccountForDeletion,
    permanentlyDeleteAccount
  } = useAuth();
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

  // Active settings tab
  const [activeTab, setActiveTab] = useState<'appearance' | 'privacy' | 'profile' | 'pin'>('appearance');

  // Privacy settings state
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => chatStore.getPrivacySettings());
  const [privacySavedNotice, setPrivacySavedNotice] = useState(false);

  // Profile fields inside settings
  const storedProfile = chatStore.getUserProfile();
  const [displayName, setDisplayName] = useState(user?.displayName || storedProfile.displayName || 'User');
  const [username, setUsername] = useState(storedProfile.username || user?.email?.split('@')[0] || 'user');
  const [bio, setBio] = useState(storedProfile.bio || 'Sovereign Account • Encrypted Vault Active');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || storedProfile.photoURL || '');
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permanent Remove Account State (Secret section only)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'credentials' | 'confirm'>('idle');
  const [deleteEmail, setDeleteEmail] = useState(user?.email || '');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setCropSourceUrl(reader.result as string);
    };
  };

  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Handle Privacy Change & sync globally
  const updatePrivacyField = (key: keyof PrivacySettings, value: any) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    chatStore.savePrivacySettings(updated);
    updateUserProfile({ privacySettings: updated }).catch(() => {});
    setPrivacySavedNotice(true);
    setTimeout(() => setPrivacySavedNotice(false), 2500);
  };

  // Handle Profile Save inside settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
    chatStore.saveUserProfile({
      displayName: displayName.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      photoURL
    });
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        photoURL
      });
    } catch (err) {
      console.warn('Profile sync:', err);
    }
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 3000);
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

  // Handle Account Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (!user) return;

    setPasswordLoading(true);
    try {
      await updatePassword(user, newPassword);
      setPasswordMessage('Account password updated successfully!');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetDeleteAccountFlow = () => {
    setDeleteStep('idle');
    setDeletePassword('');
    setDeleteError(null);
    setShowDeletePassword(false);
  };

  const handleVerifyDeleteCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await verifyAccountForDeletion(deleteEmail, deletePassword);
      setDeleteStep('confirm');
    } catch (err: any) {
      setDeleteError(err?.message || 'Could not verify your Gmail and password.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await permanentlyDeleteAccount(deleteEmail, deletePassword);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to permanently delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] select-none p-3 sm:p-5 md:p-6 overflow-y-auto transition-colors">
      <div className="w-full max-w-4xl mx-auto flex flex-col min-w-0 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-white/5">
        <div>
          <h1 className="text-base sm:text-lg font-display font-bold gold-gradient-text flex items-center gap-2">
            <span>Settings & Preferences</span>
          </h1>
        </div>
      </div>

      {/* 4 Function Buttons: Theme Color, Privacy, PROFILE IDENTITY, Secret 8 Digit */}
      <div className="mt-4 p-2 sm:p-2.5 rounded-2xl bg-[var(--bg-card)] border border-neutral-300 dark:border-white/5 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold shadow-sm'
                : 'bg-[var(--bg-sidebar)] border border-neutral-200 dark:border-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
            <span className="truncate">Theme Color</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold shadow-sm'
                : 'bg-[var(--bg-sidebar)] border border-neutral-200 dark:border-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
            <span className="truncate">Privacy</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold shadow-sm'
                : 'bg-[var(--bg-sidebar)] border border-neutral-200 dark:border-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
            <span className="truncate font-bold">PROFILE IDENTITY</span>
          </button>

          <button
            onClick={() => setActiveTab('pin')}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'pin'
                ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold shadow-sm'
                : 'bg-[var(--bg-sidebar)] border border-neutral-200 dark:border-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
            <span className="truncate">Secret 8 Digit</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Appearance: 3 Mode Options + 14 Luxury Colors */}
      {activeTab === 'appearance' && (
        <div className="mt-5 sm:mt-6 w-full space-y-5 sm:space-y-6">
          {/* Mode Selector: 3 Options (Dark, Light, System) */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-3 shadow-sm">
            <div>
              <h2 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Theme Mode (3 Options)</span>
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 border transition-all cursor-pointer ${
                  mode === 'dark'
                    ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Moon className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
                <span className="truncate">Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('light')}
                className={`py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 border transition-all cursor-pointer ${
                  mode === 'light'
                    ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Sun className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
                <span className="truncate">Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('system')}
                className={`py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 border transition-all cursor-pointer ${
                  mode === 'system'
                    ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />
                <span className="truncate">System Auto</span>
              </button>
            </div>
          </div>

          {/* Auto Color Change System: 10-minute automatic rotation across the website */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                <RefreshCw className={`w-5 h-5 ${autoCycleEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[var(--text-main)]">Auto Color System (10 Minutes)</h3>
                  {autoCycleEnabled && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ACTIVE: {formattedCountdown}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  Automatically changes theme color every 10 minutes across the whole website (Calculator, Messenger, Modals, Chat).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {autoCycleEnabled && (
                <button
                  type="button"
                  onClick={cycleNextTheme}
                  className="py-1.5 px-3 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] hover:border-[var(--accent-primary)] shadow-sm transition-all cursor-pointer"
                  title="Immediately advance to next color"
                >
                  Cycle Now (Test)
                </button>
              )}
              <button
                type="button"
                onClick={() => setAutoCycleEnabled(!autoCycleEnabled)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  autoCycleEnabled
                    ? 'gold-button-accent text-black'
                    : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:text-white'
                }`}
              >
                {autoCycleEnabled ? 'Auto ON' : 'Auto OFF'}
              </button>
            </div>
          </div>

          {/* Theme Colors (Swatches only, no written color names) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Theme Colors</span>
              </h2>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-8 gap-2.5 sm:gap-3">
              {THEMES.map(th => {
                const isSelected = theme === th.id;
                const swatchBg =
                  th.id === 'rainbow'
                    ? 'linear-gradient(135deg, #FF0055 0%, #FF7700 25%, #FFDD00 50%, #00CC66 75%, #0099FF 100%)'
                    : th.primaryHex;

                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    aria-label={`Select color ${th.id}`}
                    aria-pressed={isSelected}
                    className={`aspect-square min-h-[48px] rounded-2xl border cursor-pointer transition-all flex items-center justify-center shadow-sm ${
                      isSelected
                        ? 'bg-[var(--accent-surface)] border-2 border-[var(--accent-primary)] scale-105 shadow-md'
                        : 'bg-[var(--bg-card)] border-neutral-200 dark:border-neutral-800 hover:border-[var(--accent-border)] hover:scale-105'
                    }`}
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white/30 shadow-inner flex items-center justify-center"
                      style={{ background: swatchBg }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 stroke-[3] ${
                            th.id === 'white' ? 'text-black' : th.id === 'black' ? 'text-white' : 'text-black'
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Privacy Rules */}
      {activeTab === 'privacy' && (
        <div className="mt-5 sm:mt-6 w-full max-w-2xl space-y-4">
          {privacySavedNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Privacy settings updated successfully!</span>
            </div>
          )}

          {/* 1. Profile Photo (DP) Privacy */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2.5 shadow-sm">
            <div>
              <h2 className="text-xs font-bold text-[var(--text-main)]">Profile Photo (DP) Privacy</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Who can see your profile picture</p>
            </div>
            <div className="flex gap-2">
              {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updatePrivacyField('profilePhoto', option)}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border capitalize transition-colors cursor-pointer ${
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

          {/* 2. Bio / About Status Privacy */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2.5 shadow-sm">
            <div>
              <h2 className="text-xs font-bold text-[var(--text-main)]">About / Bio Privacy</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Who can view your status and bio information</p>
            </div>
            <div className="flex gap-2">
              {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updatePrivacyField('bio', option)}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border capitalize transition-colors cursor-pointer ${
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
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2.5 shadow-sm">
            <div>
              <h2 className="text-xs font-bold text-[var(--text-main)]">Last Seen & Online Presence</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Control visibility of your active online indicator</p>
            </div>
            <div className="flex gap-2">
              {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updatePrivacyField('lastSeen', option)}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border capitalize transition-colors cursor-pointer ${
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
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-[var(--text-main)]">Read Receipts (Blue Ticks)</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                If turned off, you won't send or receive read receipts
              </p>
            </div>
            <button
              type="button"
              onClick={() => updatePrivacyField('readReceipts', !privacy.readReceipts)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
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

      {/* Tab 3: PROFILE IDENTITY */}
      {activeTab === 'profile' && (
        <div className="mt-5 sm:mt-6 w-full max-w-2xl space-y-4">
          {/* Sovereign Profile Identity Header */}
          <div className="p-4 rounded-2xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex flex-wrap items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black flex items-center justify-center font-bold text-lg shadow-md">
                👑
              </div>
              <div>
                <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-1.5">
                  <span>PROFILE IDENTITY</span>
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                </h2>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Sovereign Cryptographic Profile & Display Credentials
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/40 border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold">
              VERIFIED 👑
            </span>
          </div>

          {profileSavedNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Profile details saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* WhatsApp DP Changer */}
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
                  <p className="text-[11px] font-mono text-[var(--accent-primary)]">@{username}</p>
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
                    <>
                      <button
                        type="button"
                        onClick={() => setCropSourceUrl(photoURL)}
                        className="py-1.5 px-3 rounded-lg border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Crop DP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoURL('')}
                        className="py-1.5 px-2.5 rounded-lg border border-neutral-700 text-xs text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    </>
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

            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-4 shadow-sm">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  Display Name (Changeable)
                </label>
                <input
                  type="text"
                  required
                  maxLength={25}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                />
              </div>

              {/* Username (@handle) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                    <span>Username (@handle)</span>
                  </label>
                  <span className="text-[10px] font-mono text-[var(--accent-primary)] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Customizable</span>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-[var(--accent-primary)] font-bold">@</span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="your_handle"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  Your custom ERROREX username <strong>(@{username})</strong> for finding contacts and receiving messages.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                  About / Bio Status (Changeable)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell contacts about yourself..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                />

                {/* Status presets */}
                <div className="mt-1.5 space-y-1">
                  <span className="text-[10px] text-[var(--text-muted)] block">Status Presets:</span>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_PRESETS.map((preset, idx) => (
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
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider cursor-pointer"
              >
                Save Name & Bio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Secret 8-Digit PIN & Account Security */}
      {activeTab === 'pin' && (
        <div className="mt-5 sm:mt-6 w-full max-w-2xl space-y-5">
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-4 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">Change Secret 8-Digit PIN</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Enter your current 8-digit PIN followed by your new 8-digit secret PIN to update calculator unlock code.
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

            <form onSubmit={handleChangePin} className="space-y-3.5">
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
                  className="w-full px-4 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
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
                  className="w-full px-4 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
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
                  className="w-full px-4 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={pinLoading || newPin.length !== 8}
                className="w-full py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider disabled:opacity-50 mt-2 cursor-pointer"
              >
                {pinLoading ? 'Verifying & Updating...' : 'Update Secret PIN'}
              </button>
            </form>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-4 shadow-sm">
            <div>
              <h2 className="text-xs font-bold text-[var(--text-main)]">Change Account Password</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Update your primary account login password.
              </p>
            </div>

            {passwordMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                {passwordMessage}
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (minimum 6 characters)"
                className="w-full px-4 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={passwordLoading}
                className="py-2 px-4 rounded-xl gold-button text-xs font-semibold text-[var(--accent-primary)] cursor-pointer"
              >
                {passwordLoading ? 'Updating...' : 'Save New Password'}
              </button>
            </form>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-rose-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-rose-500">Lock Application</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Immediately lock messenger and return to the normal calculator facade.
              </p>
            </div>
            <button
              onClick={lockMessenger}
              className="py-2 px-4 rounded-xl bg-neutral-900 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs text-white font-semibold flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Lock Now</span>
            </button>
          </div>

          {/* Permanent Remove Account (Only inside Secret section) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-rose-500/35 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Permanent Remove Account</span>
                </h4>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                  Verify your Gmail and account password to permanently remove your entire account and data.
                </p>
              </div>

              {deleteStep === 'idle' && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteEmail(user?.email || '');
                    setDeletePassword('');
                    setDeleteError(null);
                    setDeleteStep('credentials');
                  }}
                  className="min-h-[44px] py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shrink-0 shadow-sm transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Account</span>
                </button>
              )}
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/35 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {deleteStep === 'credentials' && (
              <form onSubmit={handleVerifyDeleteCredentials} className="space-y-3 pt-1 border-t border-rose-500/20">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-main)] mb-1">
                    Account Gmail / Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={deleteEmail}
                      onChange={e => setDeleteEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full pl-9 pr-3.5 py-2.5 sm:py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-rose-500 text-[var(--text-main)] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-main)] mb-1">
                    Current Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      required
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 sm:py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-rose-500 text-[var(--text-main)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(prev => !prev)}
                      aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetDeleteAccountFlow}
                    disabled={deleteLoading}
                    className="flex-1 min-h-[44px] py-2 px-3 rounded-xl border border-[var(--accent-border)] text-xs font-semibold text-[var(--text-main)] hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="flex-1 min-h-[44px] py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleteLoading ? 'Verifying...' : 'Delete Account'}</span>
                  </button>
                </div>
              </form>
            )}

            {deleteStep === 'confirm' && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 space-y-3">
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-rose-600 dark:text-rose-300">
                    Confirm Permanent Deletion
                  </h5>
                  <p className="text-[11px] text-[var(--text-main)] leading-relaxed">
                    Gmail <span className="font-mono font-semibold">{deleteEmail}</span> verified. Clicking{' '}
                    <strong>Permanent Delete</strong> will permanently remove your profile, DP, bio, messages,
                    contacts, statuses, and 8-digit PIN from ERROREX. This cannot be undone.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={resetDeleteAccountFlow}
                    disabled={deleteLoading}
                    className="flex-1 min-h-[44px] py-2 px-3 rounded-xl border border-[var(--accent-border)] bg-[var(--bg-sidebar)] text-xs font-semibold text-[var(--text-main)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPermanentDelete}
                    disabled={deleteLoading}
                    className="flex-1 min-h-[44px] py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white uppercase tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleteLoading ? 'Removing Account...' : 'Permanent Delete'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      <AvatarCropModal
        imageSrc={cropSourceUrl}
        onConfirm={cropped => {
          setPhotoURL(cropped);
          setCropSourceUrl(null);
        }}
        onCancel={() => setCropSourceUrl(null)}
      />
    </div>
  );
};
