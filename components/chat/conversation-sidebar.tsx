"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  MessageSquareText,
  Search,
  SearchX,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { ChatThemeToggle } from "@/components/chat/chat-theme-toggle";
import { PostItLogo } from "@/components/brand/postit-logo";
import {
  filterChatSessions,
  formatChatSessionDate,
  groupChatSessions,
} from "@/lib/chat-session-groups";
import type { ChatSession } from "@/lib/chat-client";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  sessions: ChatSession[];
  activeChatId: string | null;
  status: "loading" | "ready" | "error";
  sessionsError: string | null;
  deletingSessionId: string | null;
  deleteSessionError: string | null;
  onNewChat: () => void;
  onSelectSession: (chatId: string) => void;
  onRetry: () => void;
  onDeleteSession: (chatId: string) => Promise<boolean>;
  onDismissDeleteError: () => void;
  onClose?: () => void;
  onToggleDesktop?: () => void;
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
  const [query, setQuery] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<ChatSession | null>(
    null,
  );
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const historyHeadingPrefix = useId();
  const filteredSessions = useMemo(
    () => filterChatSessions(sessions, query),
    [query, sessions],
  );
  const groupedSessions = useMemo(
    () => groupChatSessions(filteredSessions),
    [filteredSessions],
  );
  const hasQuery = Boolean(query.trim());
  const isDeletingCandidate = deleteCandidate?.id === deletingSessionId;

  useEffect(() => {
    if (!deleteCandidate) return;
    const frame = requestAnimationFrame(() =>
      cancelDeleteButtonRef.current?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeletingCandidate) {
        event.preventDefault();
        setDeleteCandidate(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteCandidate, isDeletingCandidate]);

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    await onDeleteSession(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-base-200/60 text-base-content">
      {/* Brand + Actions Header */}
      <div className="shrink-0 space-y-3 px-3.5 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-2xs">
              <PostItLogo size={28} className="size-7" />
              <span
                className="utarasu-ulos-bar absolute inset-x-0 bottom-0 h-[2px]"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-bold tracking-tight text-base-content">
                  PostIt AI
                </span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-base-content/55">
                <span
                  className="inline-block size-1.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
                by utaraSU
              </span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-square rounded-xl text-base-content/70 hover:bg-base-300/60 hover:text-base-content"
              aria-label="Tutup riwayat chat"
            >
              <X className="size-4.5" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="btn btn-primary btn-sm h-10 min-h-10 w-full justify-start gap-2.5 rounded-xl px-3.5 text-sm font-semibold shadow-2xs transition-all hover:brightness-105"
        >
          <SquarePen className="size-4 shrink-0" aria-hidden="true" />
          <span>Chat baru</span>
        </button>

        <div className="relative">
          <div className="flex h-9 items-center gap-2 rounded-xl border border-base-300/90 bg-base-100/90 px-3 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
            <Search
              className="size-3.5 shrink-0 text-base-content/45"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label="Cari percakapan"
              placeholder="Cari percakapan..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={status === "loading" && sessions.length === 0}
              className="w-full min-w-0 bg-transparent text-xs text-base-content outline-none placeholder:text-base-content/45"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex size-5 shrink-0 items-center justify-center rounded-md text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
                aria-label="Hapus pencarian"
              >
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Hapus pencarian</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable History List */}
      <div className="utarasu-scroll relative min-h-0 flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
        {deleteSessionError && (
          <div
            role="alert"
            className="mb-3 flex items-center gap-2 rounded-xl border border-error/25 bg-error/10 px-3 py-2 text-xs text-error"
          >
            <span className="min-w-0 flex-1">{deleteSessionError}</span>
            <button
              type="button"
              onClick={onDismissDeleteError}
              className="btn btn-ghost btn-xs btn-square text-error"
              aria-label="Tutup pesan gagal hapus"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </button>
          </div>
        )}

        {sessionsError && (
          <div
            role="alert"
            className="mb-3 space-y-2 rounded-xl border border-error/25 bg-error/10 p-3 text-xs text-error"
          >
            <p>{sessionsError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-xs rounded-lg border-error/30 bg-base-100 text-base-content hover:bg-base-200"
            >
              Coba lagi
            </button>
          </div>
        )}

        {status === "loading" ? (
          <HistorySkeleton />
        ) : status === "error" && sessions.length === 0 ? null : sessions.length ===
          0 ? (
          <HistoryEmptyState />
        ) : filteredSessions.length === 0 ? (
          <SearchEmptyState onClear={() => setQuery("")} />
        ) : (
          <nav aria-label="Riwayat percakapan" className="space-y-4">
            {groupedSessions.map((group) => (
              <section
                key={group.label}
                aria-labelledby={`${historyHeadingPrefix}-${group.label.replaceAll(" ", "-")}`}
              >
                <h2
                  id={`${historyHeadingPrefix}-${group.label.replaceAll(" ", "-")}`}
                  className="mb-1 px-2.5 text-[11px] font-semibold tracking-wide text-base-content/50"
                >
                  {group.label}
                </h2>
                <div className="space-y-0.5">
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

      {/* Sidebar Footer */}
      <div className="shrink-0 border-t border-base-300/70 px-3.5 py-2.5">
        {showMobileFooter ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-base-content/80">
                Tampilan Tema
              </span>
              <span className="block text-[11px] text-base-content/50">
                Terang / Gelap
              </span>
            </div>
            <ChatThemeToggle className="size-8 min-h-8 rounded-xl border border-base-300/80 bg-base-100 p-0" />
          </div>
        ) : (
          <div className="flex items-center justify-between px-1 text-[11px] text-base-content/50">
            <span className="truncate font-medium">Asisten SOP & FAQ</span>
            <span className="inline-flex items-center gap-1 font-semibold text-primary">
              <span
                className="size-1.5 rounded-full bg-accent"
                aria-hidden="true"
              />
              utaraSU
            </span>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteCandidate && (
        <dialog
          className="modal modal-open"
          aria-modal="true"
          onCancel={(event) => {
            event.preventDefault();
            if (!isDeletingCandidate) setDeleteCandidate(null);
          }}
        >
          <div className="modal-box max-w-sm rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl">
            <div className="mb-3.5 flex size-10 items-center justify-center rounded-xl bg-error/10 text-error">
              <Trash2 className="size-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold leading-snug text-base-content">
              Hapus percakapan “{deleteCandidate.title ?? "Chat baru"}”?
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-base-content/65">
              Percakapan beserta seluruh pesannya akan dihapus secara permanen.
            </p>
            <div className="modal-action mt-5">
              <button
                ref={cancelDeleteButtonRef}
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeletingCandidate}
                className="btn btn-ghost btn-sm rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeletingCandidate}
                className="btn btn-error btn-sm rounded-xl"
              >
                {isDeletingCandidate ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : null}
                Hapus percakapan
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              onClick={() => !isDeletingCandidate && setDeleteCandidate(null)}
            >
              close
            </button>
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
  const title = session.title ?? "Chat baru";

  return (
    <div
      className={cn(
        "group/item relative flex min-h-10 items-center gap-1 rounded-xl pr-1 transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-base-content/80 hover:bg-base-300/55 hover:text-base-content",
      )}
    >
      {isActive && (
        <span
          className="absolute bottom-2 left-0.5 top-2 w-[3px] rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={onSelect}
        disabled={isDeleting}
        aria-current={isActive ? "page" : undefined}
        className="min-h-10 min-w-0 flex-1 overflow-hidden rounded-xl px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="block truncate text-[13px] leading-snug" title={title}>
          {title}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[11px] font-normal",
            isActive ? "text-primary/75" : "text-base-content/45",
          )}
        >
          {formatChatSessionDate(session.updatedAt)}
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/45 opacity-80 transition-opacity hover:bg-error/12 hover:text-error focus-visible:opacity-100 md:opacity-0 md:group-hover/item:opacity-100"
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
    <div
      role="status"
      aria-label="Memuat riwayat percakapan"
      className="space-y-2 px-1.5 pt-2"
    >
      <span className="sr-only">Memuat riwayat percakapan</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="space-y-1.5 rounded-xl px-2.5 py-2.5"
          aria-hidden="true"
        >
          <div className="skeleton h-3.5 w-4/5 rounded-md" />
          <div className="skeleton h-2.5 w-2/5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function HistoryEmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-base-300/80 bg-base-100 text-base-content/45">
        <MessageSquareText className="size-4.5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold text-base-content/75">
        Belum ada riwayat chat
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-base-content/50">
        Mulai percakapan baru dan riwayatnya akan tersimpan di sini.
      </p>
    </div>
  );
}

function SearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-base-300/80 bg-base-100 text-base-content/45">
        <SearchX className="size-4.5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold text-base-content/75">
        Tidak ada percakapan yang cocok.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="btn btn-ghost btn-xs mt-2 rounded-lg text-primary hover:bg-primary/10"
      >
        Hapus pencarian
      </button>
    </div>
  );
}
