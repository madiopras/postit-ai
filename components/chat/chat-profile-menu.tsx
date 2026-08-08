'use client';

import { ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Separator,
} from 'react-aria-components';
import { Button } from '@/components/untitled/base/buttons/button';
import type { CurrentUserController } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

export function ChatProfileMenu({
  identity,
}: {
  identity: CurrentUserController;
}) {
  const user = identity.user;
  if (!user) return null;

  const name = user.displayName?.trim() || user.username;
  const canOpenDashboard = user.role === 'admin' || user.role === 'super_admin';

  return (
    <MenuTrigger>
      <Button
        variant="tertiary"
        size="sm"
        isLoading={identity.logoutPending}
        className="size-9 min-h-9 p-0"
        aria-label={`Buka menu profil ${name}`}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-text">
          {profileInitial(name)}
        </span>
      </Button>

      <Popover
        placement="bottom end"
        offset={8}
        className={({ isEntering, isExiting }) =>
          cn(
            'ui-surface z-50 w-64 rounded-ui-lg border border-border-secondary bg-bg-primary p-1.5 shadow-ui-lg outline-none',
            isEntering && 'animate-in fade-in zoom-in-95 duration-100',
            isExiting && 'animate-out fade-out zoom-out-95 duration-75'
          )
        }
      >
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-fg-primary">{name}</p>
          <p className="mt-1 text-xs font-medium text-fg-quaternary">
            {roleLabel(user.role)}
          </p>
        </div>

        <Separator className="my-1 h-px bg-border-secondary" />

        <Menu
          aria-label="Menu profil"
          selectionMode="none"
          onAction={(key) => {
            if (key === 'logout') void identity.logout();
          }}
          className="outline-none"
        >
          {canOpenDashboard && (
            <MenuItem
              id="dashboard"
              href="/dashboard"
              className={menuItemClassName}
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Buka dashboard
            </MenuItem>
          )}
          <MenuItem
            id="logout"
            isDisabled={identity.logoutPending}
            className={(state) =>
              cn(menuItemClassName(state), 'text-error-fg')
            }
          >
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function menuItemClassName({
  isFocused,
  isDisabled,
}: {
  isFocused: boolean;
  isDisabled: boolean;
}) {
  return cn(
    'flex min-h-10 cursor-pointer items-center gap-2 rounded-ui-md px-3 py-2 text-sm font-medium text-fg-secondary outline-none',
    isFocused && 'bg-bg-secondary',
    isDisabled && 'cursor-not-allowed text-fg-disabled'
  );
}

function profileInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('id-ID') || 'U';
}

function roleLabel(role: 'super_admin' | 'admin' | 'user'): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'Pengguna';
}
