import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, LayoutGrid, Table2, CalendarDays, Palette, Plus, ChevronDown, Bell, Check, BarChart3, UserCog, Settings, ExternalLink } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Avatar, RoleBadge } from '@/components/ui/Avatar';
import { Notification, Episode } from '@/lib/types';

export type ViewKey = 'kanban' | 'table' | 'calendar' | 'brands' | 'analytics';

interface HeaderProps {
  view: ViewKey;
  onViewChange: (v: ViewKey) => void;
  canAddTask: boolean;
  onAddTask: () => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  showAnalytics: boolean;
  onNotificationClick: (notification: Notification) => void;
  onEditProfile: () => void;
  onStudioSettings: () => void;
}

const BASE_VIEWS: { key: ViewKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'kanban', label: 'Board', icon: LayoutGrid },
  { key: 'table', label: 'Table', icon: Table2 },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'brands', label: 'Brand Hub', icon: Palette },
];

const ANALYTICS_VIEW = { key: 'analytics' as ViewKey, label: 'Team Analytics', icon: BarChart3 };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationsBell({ notifications, onMarkRead, onMarkAllRead, onClick }: {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClick: (n: Notification) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (n: Notification) => {
    onMarkRead(n.id);
    setOpen(false);
    onClick(n);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 flex items-center justify-center rounded-lg border tf-border tf-muted hover:tf-text transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 tf-card border tf-border rounded-xl shadow-lg overflow-hidden z-50 tf-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b tf-border">
            <span className="text-sm font-semibold tf-text">Notifications</span>
            {unread.length > 0 && (
              <button onClick={onMarkAllRead} className="text-[11px] text-blue-500 hover:underline flex items-center gap-1">
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-6 w-6 tf-muted mx-auto mb-2 opacity-40" />
                <p className="text-xs tf-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-2.5 px-4 py-3 border-b tf-border last:border-0 text-left cursor-pointer hover:bg-slate-800/50 dark:hover:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? 'bg-blue-500/5' : ''}`}
                >
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : 'bg-blue-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs tf-text leading-snug">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {n.actor_name && <span className="text-[10px] tf-muted">by {n.actor_name}</span>}
                      <span className="text-[10px] tf-muted">{timeAgo(n.created_at)}</span>
                      {n.episode_id && (
                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5 ml-auto">
                          <ExternalLink className="h-2.5 w-2.5" />
                          Open
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ onEditProfile, onStudioSettings, showSettings }: {
  onEditProfile: () => void;
  onStudioSettings: () => void;
  showSettings: boolean;
}) {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!profile) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border tf-border px-2 py-1 hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <Avatar name={profile.name} color={profile.avatarColor} size="sm" url={profile.avatarUrl ?? null} />
        <div className="hidden sm:block text-left">
          <div className="text-xs font-medium tf-text leading-none">{profile.name}</div>
          <div className="text-[10px] tf-muted mt-0.5">{profile.role}</div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 tf-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 tf-card border tf-border rounded-xl shadow-lg overflow-hidden z-50 tf-fade-in">
          <div className="p-3 border-b tf-border">
            <div className="flex items-center gap-2.5">
              <Avatar name={profile.name} color={profile.avatarColor} size="md" url={profile.avatarUrl ?? null} />
              <div className="min-w-0">
                <div className="text-sm font-medium tf-text truncate">{profile.name}</div>
                <div className="text-xs tf-muted truncate">{profile.email}</div>
              </div>
            </div>
            <div className="mt-2.5">
              <RoleBadge role={profile.role}>{profile.role}</RoleBadge>
            </div>
          </div>
          <button
            onClick={() => { setOpen(false); onEditProfile(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm tf-text hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <UserCog className="h-4 w-4 tf-muted" />
            Edit Profile
          </button>
          {showSettings && (
            <button
              onClick={() => { setOpen(false); onStudioSettings(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm tf-text hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <Settings className="h-4 w-4 tf-muted" />
              Studio Settings & Export
            </button>
          )}
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm tf-text hover:bg-[var(--bg-subtle)] transition-colors border-t tf-border"
          >
            <LogOut className="h-4 w-4 tf-muted" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({ view, onViewChange, canAddTask, onAddTask, notifications, onMarkNotificationRead, onMarkAllNotificationsRead, showAnalytics, onNotificationClick, onEditProfile, onStudioSettings }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const views = showAnalytics ? [...BASE_VIEWS, ANALYTICS_VIEW] : BASE_VIEWS;

  return (
    <header className="sticky top-0 z-30 tf-card border-b tf-border">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
            <span className="text-white dark:text-slate-900 font-bold text-xs">RH</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold tf-text leading-none">RH-Studio</div>
            <div className="text-[10px] tf-muted mt-0.5">Production Department</div>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-0.5 rounded-lg p-0.5 tf-bg-subtle border tf-border">
          {views.map((v) => {
            const Icon = v.icon;
            const active = view === v.key;
            return (
              <button
                key={v.key}
                onClick={() => onViewChange(v.key)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active ? 'tf-card tf-text shadow-sm' : 'tf-muted hover:tf-text'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {canAddTask && (
            <button onClick={onAddTask} className="tf-btn tf-btn-primary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          )}
          <NotificationsBell
            notifications={notifications}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={onMarkAllNotificationsRead}
            onClick={onNotificationClick}
          />
          <button
            onClick={toggleTheme}
            className="h-8 w-8 flex items-center justify-center rounded-lg border tf-border tf-muted hover:tf-text transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <UserMenu
            onEditProfile={onEditProfile}
            onStudioSettings={onStudioSettings}
            showSettings={showAnalytics}
          />
        </div>
      </div>
    </header>
  );
}
