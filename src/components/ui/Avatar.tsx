import { ReactNode } from 'react';
import { UserRole, ROLE_THEMES } from '@/lib/types';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  url?: string | null;
}

export function Avatar({ name, color, size = 'md', url }: AvatarProps) {
  const sizes = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-14 w-14 text-lg',
  };
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div
      className={`${sizes[size]} flex items-center justify-center rounded-full font-semibold text-white shrink-0 overflow-hidden`}
      style={{ backgroundColor: color }}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        initials
      )}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  color?: string;
  variant?: 'solid' | 'soft' | 'outline';
  className?: string;
}

export function Badge({ children, color, variant = 'soft', className = '' }: BadgeProps) {
  const style: React.CSSProperties = {};
  if (color) {
    if (variant === 'solid') {
      style.backgroundColor = color;
      style.color = '#fff';
    } else if (variant === 'soft') {
      style.backgroundColor = `${color}1A`;
      style.color = color;
    } else {
      style.borderColor = color;
      style.color = color;
    }
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium leading-none ${variant === 'outline' ? 'border' : ''} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

interface RoleBadgeProps {
  role: UserRole;
  children?: ReactNode;
  className?: string;
}

export function RoleBadge({ role, children, className = '' }: RoleBadgeProps) {
  const theme = ROLE_THEMES[role];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium leading-none ${theme.badge} ${className}`}>
      {children}
    </span>
  );
}
