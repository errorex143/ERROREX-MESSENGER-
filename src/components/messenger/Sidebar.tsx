import React from 'react';
import { CrownLogo } from '../common/CrownLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  MessageSquare,
  Users,
  UserPlus,
  Compass,
  Sparkles,
  Bell,
  User,
  Settings,
  Lock,
  LogOut,
  Layers,
  Bot
} from 'lucide-react';

export type MessengerTab =
  | 'chats'
  | 'contacts'
  | 'friends'
  | 'requests'
  | 'directory'
  | 'status'
  | 'groups'
  | 'errorex_ai'
  | 'notifications'
  | 'profile'
  | 'settings';

interface SidebarProps {
  activeTab: MessengerTab;
  onSelectTab: (tab: MessengerTab) => void;
  unreadMessagesCount: number;
  pendingRequestsCount: number;
  onOpenSettingsModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unreadMessagesCount,
  pendingRequestsCount,
  onOpenSettingsModal
}) => {
  const { userProfile, lockMessenger, logout } = useAuth();
  const { mode } = useTheme();

  const handleOpenSettings = () => {
    if (onOpenSettingsModal) {
      onOpenSettingsModal();
    } else {
      onSelectTab('settings');
    }
  };

  const navItems = [
    { id: 'chats', label: 'All Chats', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'contacts', label: 'Contacts Book', icon: Users },
    { id: 'status', label: 'Status & Groups', icon: Sparkles },
    { id: 'friends', label: 'Social Circle', icon: UserPlus, badge: pendingRequestsCount },
    { id: 'errorex_ai', label: 'ERROREX AI', icon: Bot },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings & Themes', icon: Settings }
  ];

  return (
    <aside className="w-16 lg:w-64 h-full bg-[var(--bg-sidebar)] border-r border-[var(--accent-border)] flex flex-col justify-between py-4 select-none shrink-0 z-20 transition-colors">
      {/* Brand & Top Lock Button */}
      <div className="flex-1 min-h-0 flex flex-col px-3 overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-1 shrink-0">
          <CrownLogo size="sm" showWordmark={true} className="hidden lg:inline-flex" />
          <CrownLogo size="sm" showWordmark={false} className="lg:hidden mx-auto" />
          
          {/* Settings Function Button */}
          <button
            onClick={handleOpenSettings}
            title="Open Settings (Themes, 3 Modes, Profile, Privacy & PIN)"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-primary)] hover:gold-glow-sm hover:scale-105 active:scale-95 transition-all shadow-sm group cursor-pointer"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            <span className="text-[11px] font-semibold">Settings</span>
          </button>
        </div>

        {/* Instant Vault Lock Button */}
        <button
          onClick={lockMessenger}
          title="Instantly Lock Application to Calculator"
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-neutral-900 to-black dark:from-neutral-900 dark:to-black from-white to-neutral-100 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:gold-glow-sm flex items-center justify-center lg:justify-start gap-2.5 text-xs font-semibold transition-all group active:scale-95 mb-3 shadow-sm shrink-0"
        >
          <div className="w-6 h-6 rounded-lg bg-[var(--accent-surface)] flex items-center justify-center text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-black transition-colors shrink-0">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--accent-primary)]">
              Lock Application
            </span>
            <span className="text-[9px] text-neutral-500 dark:text-neutral-400">Return to Calculator</span>
          </div>
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto py-1 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as MessengerTab)}
                className={`w-full py-2 px-2.5 rounded-xl flex items-center justify-center lg:justify-between transition-all relative ${
                  isActive
                    ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] font-semibold shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)] hover:bg-neutral-200/50 dark:hover:bg-neutral-900/60 border border-transparent'
                }`}
                title={item.label}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[var(--accent-primary)]' : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  />
                  <span className="hidden lg:inline-block text-xs truncate">
                    {item.label}
                  </span>
                </div>

                {/* Badge Counter */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="lg:relative absolute top-1 right-1 lg:top-auto lg:right-auto px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--accent-primary)] text-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Bar & Sign Out */}
      <div className="px-3 pt-3 border-t border-neutral-200 dark:border-white/5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-100 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-900">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-xs shrink-0 overflow-hidden">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                userProfile?.displayName?.slice(0, 1).toUpperCase() || 'E'
              )}
            </div>
            <div className="hidden lg:flex flex-col overflow-hidden text-left">
              <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                {userProfile?.displayName || 'User'}
              </span>
              <span className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                @{userProfile?.username || 'member'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Settings Function Button on Mobile & Tablet */}
            <button
              onClick={handleOpenSettings}
              title="Open Settings"
              className="lg:hidden p-1.5 rounded-lg text-neutral-500 hover:text-[var(--accent-primary)] hover:bg-[var(--accent-surface)] transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              title="Log Out"
              className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
