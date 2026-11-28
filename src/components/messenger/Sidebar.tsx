import React from 'react';
import { CrownLogo } from '../common/CrownLogo';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  Users,
  Sparkles,
  Settings,
  Lock,
  LogOut,
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

  const navItems: Array<{
    id: MessengerTab;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'chats', label: 'All Chats', mobileLabel: 'Chats', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'contacts', label: 'Contacts & Circle', mobileLabel: 'Contacts', icon: Users, badge: pendingRequestsCount },
    { id: 'status', label: 'Status & Groups', mobileLabel: 'Status', icon: Sparkles },
    { id: 'errorex_ai', label: 'ERROREX AI', mobileLabel: 'AI', icon: Bot },
    { id: 'settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings }
  ];

  return (
    <aside className="hidden md:flex w-16 lg:w-60 xl:w-64 h-full bg-[var(--bg-sidebar)] border-r border-[var(--accent-border)] flex-col justify-between py-4 select-none shrink-0 z-20 transition-colors">
      <div className="flex-1 min-h-0 flex flex-col px-2.5 lg:px-3 overflow-hidden">
        {/* Instant Vault Lock Button */}
        <button
          type="button"
          onClick={lockMessenger}
          title="Instantly Lock Application to Calculator"
          className="w-full py-2 px-2.5 lg:px-3 rounded-xl bg-gradient-to-r from-white to-neutral-100 dark:from-neutral-900 dark:to-black border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:gold-glow-sm flex items-center justify-center lg:justify-start gap-2.5 text-xs font-semibold transition-all group active:scale-95 mb-3 shadow-sm shrink-0 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-surface)] flex items-center justify-center text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-black transition-colors shrink-0">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="hidden lg:flex flex-col text-left min-w-0">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--accent-primary)] truncate">
              Lock Application
            </span>
            <span className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate">Return to Calculator</span>
          </div>
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto py-1 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'contacts' &&
                (activeTab === 'friends' || activeTab === 'requests' || activeTab === 'directory'));
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  if (item.id === 'settings' && onOpenSettingsModal) {
                    onOpenSettingsModal();
                  } else {
                    onSelectTab(item.id);
                  }
                }}
                className={`w-full py-2.5 px-2.5 rounded-xl flex items-center justify-center lg:justify-between transition-all relative cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] font-semibold shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-[var(--text-main)] hover:bg-neutral-200/50 dark:hover:bg-neutral-900/60 border border-transparent'
                }`}
                title={item.label}
              >
                <div className="flex items-center gap-3 min-w-0">
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
                  <span className="lg:relative absolute top-1 right-1 lg:top-auto lg:right-auto px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--accent-primary)] text-black shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Bar & Sign Out */}
      <div className="px-2.5 lg:px-3 pt-3 border-t border-neutral-200 dark:border-white/5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-center lg:justify-between p-2 rounded-xl bg-neutral-100 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-900 gap-2">
          <button
            type="button"
            onClick={() => onSelectTab('profile')}
            className="flex items-center gap-2.5 overflow-hidden min-w-0 cursor-pointer"
            title="View Profile"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--accent-surface)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-xs shrink-0 overflow-hidden">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                userProfile?.displayName?.slice(0, 1).toUpperCase() || 'U'
              )}
            </div>
            <div className="hidden lg:flex flex-col overflow-hidden text-left min-w-0">
              <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                {userProfile?.displayName || 'User'}
              </span>
              <span className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                @{userProfile?.username || 'member'}
              </span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={logout}
              title="Log Out"
              className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-500 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unreadMessagesCount,
  pendingRequestsCount,
  onOpenSettingsModal
}) => {
  const navItems: Array<{
    id: MessengerTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'contacts', label: 'Contacts', icon: Users, badge: pendingRequestsCount },
    { id: 'status', label: 'Status', icon: Sparkles },
    { id: 'errorex_ai', label: 'AI', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden w-full bg-[var(--bg-sidebar)]/95 backdrop-blur-xl border-t border-[var(--accent-border)] grid grid-cols-5 items-center px-1.5 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] shrink-0 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] select-none"
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive =
          activeTab === item.id ||
          (item.id === 'contacts' &&
            (activeTab === 'friends' || activeTab === 'requests' || activeTab === 'directory'));
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => {
              if (item.id === 'settings' && onOpenSettingsModal) {
                onOpenSettingsModal();
              } else {
                onSelectTab(item.id);
              }
            }}
            className={`relative min-h-[50px] flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-all active:scale-95 cursor-pointer ${
              isActive
                ? 'text-[var(--accent-primary)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {/* Active top indicator bar */}
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2.5px] rounded-full bg-[var(--accent-primary)]" />
            )}
            <span className="relative flex items-center justify-center">
              <Icon className="w-[19px] h-[19px] shrink-0" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-mono tabular-nums font-bold bg-[var(--accent-primary)] text-black flex items-center justify-center shadow-sm">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span className="text-[10px] leading-none whitespace-nowrap truncate max-w-full">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
