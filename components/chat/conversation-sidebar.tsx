'use client';

import { useId, useMemo, useState } from 'react';
import {
  MessageSquareText,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
} from 'lucide-react';
import { ChatThemeToggle } from '@/components/chat/chat-theme-toggle';
import { PostItLogo } from '@/components/brand/postit-logo';
import {
  filterChatSessions,
  formatChatSessionDate,
  groupChatSessions,
} from '@/lib/chat-session-groups';
import type { ChatSession } from '@/lib/chat-client';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  sessions: ChatSession[];
  activeChatId: string | null;
  status: 'loading' | 'ready' | 'error';
  sessionsError: string | null;
  deletingSessionId: string | null;
  deleteSessionError: string | null;
  onNewChat: () => void;
  onSelectSession: (chatId: string) => void;
  onRetry: () => void;
  onDeleteSession: (chatId: string) => Promise<boolean>;
  onDismissDeleteError: () => void;
  onClose?: () => void;
  showMobileFooter?: boolean;
}

export function ConversationSidebar({
  sessions,
  activeChatId,
  status,
  sessionsError,
  deletingSessionId,
  deleteSessionError,
  onNewChat,
  onSelectSession,
  onRetry,
  onDeleteSession,
  onDismissDeleteError,
  onClose,
  showMobileFooter = false,
}: ConversationSidebarProps) {
  const [query, setQuery] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<ChatSession | null>(null);
  const historyHeadingPrefix = useId();
  const filteredSessions = useMemo(
    () => filterChatSessions(sessions, query),
    [query, sessions]
  );
  const groupedSessions = useMemo(
    () => groupChatSessions(filteredSessions),
    [filteredSessions]
  );
  const hasQuery = Boolean(query.trim());
  const isDeletingCandidate = deleteCandidate?.id === deletingSessionId;

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    await onDeleteSession(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-base-100/75 text-base-content backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/65">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_72%)]" />
      <div className="relative border-b border-base-300/60 bg-base-100/55 px-4 pb-4 pt-4 backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/45">
        <div className="mb-4 flex min-h-10 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="bg-base-100/85 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-base-300/60 shadow-sm ring-1 ring-black/5">
              <PostItLogo size={32} className="size-8" />
            </div>
            <span className="truncate text-base font-bold">PostIt AI</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-square border border-base-300/60 bg-base-100/75 shadow-sm"
              aria-label="Tutup riwayat chat"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </button>
          )}
        </div>

        <button
          onClick={onNewChat}
          className="btn btn-primary btn-sm mb-3 w-full gap-2 border border-primary/20 shadow-[0_14px_34px_-20px_rgba(79,70,229,0.55)]"
        >
          <Plus className="size-4" />
          <span>Chat baru</span>
        </button>

        <div className="relative">
          <label className="input input-sm flex items-center gap-2 border-base-300/60 bg-base-100/75 shadow-sm ring-1 ring-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/60">
            <Search className="text-base-content/50 size-4" />
            <input
              type="text"
              aria-label="Cari percakapan"
              placeholder="Cari percakapan..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={status === 'loading' && sessions.length === 0}
              className="grow"
            />
          </label>
          {hasQuery && (
            <button
              onClick={() => setQuery('')}
              className="btn btn-ghost btn-xs btn-square absolute right-1 top-1 text-base-content/45 hover:bg-base-200/70 hover:text-base-content"
              aria-label="Hapus pencarian"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Hapus pencarian</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        {deleteSessionError && (
          <div
            role="alert"
            className="alert alert-error mb-3 rounded-2xl border border-error/20 bg-error/10 py-2 text-xs shadow-sm backdrop-blur-md"
          >
            <span className="min-w-0 flex-1">{deleteSessionError}</span>
            <button
              onClick={onDismissDeleteError}
              className="btn btn-ghost btn-xs btn-square"
              aria-label="Tutup pesan gagal hapus"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </button>
          </div>
        )}

        {sessionsError && (
          <div
            role="alert"
            className="alert alert-error mb-3 flex-col items-start gap-2 py-3 text-xs shadow-xs"
          >
            <p>{sessionsError}</p>
            <button
              onClick={onRetry}
              className="btn btn-neutral btn-xs"
            >
              Coba lagi
            </button>
          </div>
        )}

        {status === 'loading' ? (
          <HistorySkeleton />
        ) : status === 'error' && sessions.length === 0 ? null : sessions.length === 0 ? (
          <HistoryEmptyState />
        ) : filteredSessions.length === 0 ? (
          <SearchEmptyState onClear={() => setQuery('')} />
        ) : (
          <nav aria-label="Riwayat percakapan" className="space-y-5">
            {groupedSessions.map((group) => (
              <section
                key={group.label}
                aria-labelledby={`${historyHeadingPrefix}-${group.label.replaceAll(' ', '-')}`}
              >
                <h2
                  id={`${historyHeadingPrefix}-${group.label.replaceAll(' ', '-')}`}
                  className="text-base-content/50 mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                >
                  {group.label}
                </h2>
                <div className="space-y-1">
                  {group.sessions.map((session) => (
                    <ConversationListItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeChatId}
                      isDeleting={session.id === deletingSessionId}
                      onSelect={() => onSelectSession(session.id)}
                      onDelete={() => setDeleteCandidate(session)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </nav>
        )}
      </div>

      {showMobileFooter && (
        <div className="mx-3 mb-3 rounded-[24px] border border-base-300/60 bg-base-100/82 px-4 py-3 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/72">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-sm font-medium text-base-content/80">Tampilan Tema</span>
              <span className="block text-[11px] text-base-content/45">Berubah mengikuti preferensi sistem</span>
            </div>
            <ChatThemeToggle className="size-9 min-h-9 p-0 border border-base-300/60 bg-base-100/80 shadow-sm" />
          </div>
        </div>
      )}

      {/* DaisyUI Confirmation Modal */}
      {deleteCandidate && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm border border-base-300/60 bg-base-100/84 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/72">
            <div className="bg-error/10 text-error mb-4 flex size-10 items-center justify-center rounded-full ring-1 ring-error/10">
              <Trash2 className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-base-content text-base font-bold">
              Hapus percakapan “{deleteCandidate.title ?? 'Chat baru'}”?
            </h3>
            <p className="text-base-content/70 mt-2 text-xs leading-relaxed">
              Percakapan beserta seluruh pesannya akan dihapus secara permanen.
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeletingCandidate}
                className="btn btn-ghost btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeletingCandidate}
                className="btn btn-error btn-sm"
              >
                {isDeletingCandidate ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : null}
                Hapus percakapan
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => !isDeletingCandidate && setDeleteCandidate(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}

function ConversationListItem({
  session,
  isActive,
  isDeleting,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const title = session.title ?? 'Chat baru';

  return (
    <div
      className={cn(
        'group/item flex min-h-11 items-center gap-1 rounded-2xl border border-transparent pr-1 transition-all duration-200',
        isActive
          ? 'border-primary/10 bg-primary/10 text-primary font-medium shadow-[0_10px_30px_-24px_rgba(79,70,229,0.6)]'
          : 'text-base-content/80 hover:border-base-300/60 hover:bg-base-200/70 hover:text-base-content'
      )}
    >
      <button
        onClick={onSelect}
        disabled={isDeleting}
        aria-current={isActive ? 'page' : undefined}
        className="min-h-11 min-w-0 flex-1 overflow-hidden rounded-2xl px-3 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-sm" title={title}>
            {title}
          </span>
          <span className="text-base-content/50 mt-0.5 block truncate text-[11px] font-normal">
            {formatChatSessionDate(session.updatedAt)}
          </span>
        </div>
      </button>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="btn btn-ghost btn-xs btn-square text-base-content/40 opacity-70 transition-all group-hover/item:opacity-100 hover:bg-error/10 hover:text-error focus-within:opacity-100 md:opacity-0"
        aria-label={`Hapus percakapan ${title}`}
      >
        {isDeleting ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Trash2 className="size-3.5" aria-hidden="true" />
        )}
        <span className="sr-only">Hapus</span>
      </button>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div role="status" aria-label="Memuat riwayat percakapan" className="space-y-3 px-2">
      <span className="sr-only">Memuat riwayat percakapan</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="space-y-2 rounded-2xl border border-base-300/40 bg-base-100/55 px-3 py-3 shadow-sm" aria-hidden="true">
          <div className="skeleton h-3.5 w-3/4 rounded" />
          <div className="skeleton h-2.5 w-2/5 rounded" />
        </div>
      ))}
    </div>
  );
}

function HistoryEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-[24px] border border-base-300/50 bg-base-100/60 px-4 py-10 text-center shadow-sm">
      <div className="bg-base-200/70 text-base-content/50 mb-3 flex size-10 items-center justify-center rounded-full ring-1 ring-base-300/40">
        <MessageSquareText className="size-5" aria-hidden="true" />
      </div>
      <p className="text-base-content/80 text-sm font-medium">Belum ada riwayat chat</p>
      <p className="text-base-content/50 mt-1 text-xs">
        Percakapan baru akan muncul di sini.
      </p>
    </div>
  );
}

function SearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] border border-base-300/50 bg-base-100/60 px-4 py-10 text-center shadow-sm">
      <div className="bg-base-200/70 text-base-content/50 mb-3 flex size-10 items-center justify-center rounded-full ring-1 ring-base-300/40">
        <SearchX className="size-5" aria-hidden="true" />
      </div>
      <p className="text-base-content/80 text-sm font-medium">
        Tidak ada percakapan yang cocok.
      </p>
      <button onClick={onClear} className="btn btn-link btn-xs mt-2 text-primary">
        Hapus pencarian
      </button>
    </div>
  );
}
