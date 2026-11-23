'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import type { CurrentUserController } from '@/hooks/use-current-user';

export function ChatProfileMenu({
  identity,
}: {
  identity: CurrentUserController;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const user = identity.user;

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const name = user.displayName?.trim() || user.username;
  const canOpenDashboard = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Buka menu profil ${name}`}
        className="flex size-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-bold text-primary transition-all hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span>{profileInitial(name)}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={`Menu profil ${name}`}
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-xl"
        >
          <div className="mb-1.5 rounded-xl bg-base-200/75 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-base-content">{name}</p>
            <p className="truncate text-xs text-base-content/55">@{user.username}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <Shield className="size-3" aria-hidden="true" />
              {roleLabel(user.role)}
            </span>
          </div>

          {canOpenDashboard && (
            <a
              href="/dashboard"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-base-content transition-colors hover:bg-base-200"
            >
              <LayoutDashboard className="size-4 text-primary" aria-hidden="true" />
              <span>Buka dashboard</span>
            </a>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              void identity.logout();
            }}
            disabled={identity.logoutPending}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-60"
          >
            {identity.logoutPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
            <span>Logout</span>
          </button>
        </div>
      )}
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
