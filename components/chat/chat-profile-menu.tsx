'use client';

import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import type { CurrentUserController } from '@/hooks/use-current-user';

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
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle btn-sm avatar placeholder border border-base-300/60 bg-base-100/70 shadow-sm ring-1 ring-black/5 transition-all hover:border-primary/40 hover:bg-base-100"
        aria-label={`Buka menu profil ${name}`}
      >
        <div className="bg-primary/10 text-primary font-semibold w-8 rounded-full text-xs">
          <span>{profileInitial(name)}</span>
        </div>
      </div>

      <ul
        tabIndex={0}
        className="dropdown-content menu z-50 mt-3 w-56 space-y-1 rounded-[22px] border border-base-300/60 bg-base-100/90 p-2 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.5)] backdrop-blur-2xl"
      >
        <li className="menu-title mb-1 rounded-2xl border border-base-300/50 bg-base-200/40 px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-base-content truncate">{name}</span>
            <span className="text-[11px] font-medium text-base-content/60 flex items-center gap-1">
              <Shield className="size-3 text-primary" />
              {roleLabel(user.role)}
            </span>
          </div>
        </li>

        {canOpenDashboard && (
          <li>
            <a href="/dashboard" className="flex items-center gap-2 rounded-xl py-2 text-sm font-medium">
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Buka Dashboard
            </a>
          </li>
        )}

        <li>
          <button
            type="button"
            onClick={() => void identity.logout()}
            disabled={identity.logoutPending}
            className="flex items-center gap-2 rounded-xl py-2 text-sm font-medium text-error hover:bg-error/10"
          >
            {identity.logoutPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
            Logout
          </button>
        </li>
      </ul>
    </div>
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
