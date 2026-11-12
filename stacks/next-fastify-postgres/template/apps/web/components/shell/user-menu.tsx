'use client';

import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { useLogout } from '@/hooks/auth/use-logout';
import { cn } from '@/lib/utils';

export interface ShellUser {
  email: string;
  name?: string;
}

export interface UserMenuProps {
  user: ShellUser;
  /** `sidebar`: avatar + email row at the bottom of the sidebar; `compact`: avatar only (top bars). */
  variant?: 'sidebar' | 'compact';
}

const initialsOf = (user: ShellUser): string => {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);

  return parts.slice(0, 2).map((part) => part.charAt(0)).join('') || '?';
};

/** Account menu: a quiet avatar + email row at the bottom of the sidebar, or a 32 px avatar in a top bar. */
export const UserMenu = ({ user, variant = 'sidebar' }: UserMenuProps) => {
  const { logout, isLoggingOut } = useLogout();
  const isCompact = variant === 'compact';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'focus-ring flex items-center gap-2 text-left transition-colors duration-150',
          isCompact ? 'size-control justify-center rounded-full max-md:size-touch' : 'h-10 w-full rounded-md px-2 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent',
        )}
      >
        <span className="sr-only">Account menu</span>
        <Avatar aria-hidden="true" className={isCompact ? 'size-8' : 'size-6'}>
          <AvatarFallback className={isCompact ? '' : 'text-[10px]'}>{initialsOf(user)}</AvatarFallback>
        </Avatar>
        {isCompact ? null : (
          <>
            <span className="grid min-w-0 flex-1 text-caption leading-tight">
              {user.name ? <span className="truncate font-medium text-sidebar-foreground">{user.name}</span> : null}
              <span className="truncate text-sidebar-muted-foreground">{user.email}</span>
            </span>
            <Icon icon={ChevronsUpDownIcon} size="sm" className="text-sidebar-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isCompact ? 'end' : 'start'} side={isCompact ? 'bottom' : 'top'} className="w-56">
        <DropdownMenuLabel className="truncate font-normal">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isLoggingOut} onSelect={() => void logout()}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
