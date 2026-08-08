'use client';

import { useId, useMemo, useState } from 'react';
import {
  Bot,
  MessageSquareText,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
} from 'lucide-react';
import {
  Dialog,
  Modal,
  ModalDescription,
  ModalOverlay,
  ModalTitle,
} from '@/components/untitled/application/modals/modal';
import { Button } from '@/components/untitled/base/buttons/button';
import { Input } from '@/components/untitled/base/input/input';
import { ChatThemeToggle } from '@/components/chat/chat-theme-toggle';
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
    <div className="flex h-full min-h-0 flex-col bg-bg-primary text-fg-primary">
      <div className="border-b border-border-secondary px-4 pb-4 pt-4">
        <div className="mb-4 flex min-h-10 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-ui-lg bg-brand-solid text-fg-on-brand shadow-ui-xs">
              <Bot className="size-5" aria-hidden="true" />
            </div>
            <span className="truncate text-base font-semibold">PostIt AI</span>
          </div>
          {onClose && (
            <Button
              variant="tertiary"
              size="sm"
              onPress={onClose}
              className="size-9 min-h-9 p-0"
              aria-label="Tutup riwayat chat"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </Button>
          )}
        </div>

        <Button
          onPress={onNewChat}
          iconLeading={<Plus />}
          className="mb-3 w-full"
        >
          Chat baru
        </Button>

        <div className="relative">
          <Input
            aria-label="Cari percakapan"
            placeholder="Cari percakapan"
            leadingIcon={<Search />}
            value={query}
            onChange={setQuery}
            inputClassName={hasQuery ? 'pr-10' : undefined}
            isDisabled={status === 'loading' && sessions.length === 0}
          />
          {hasQuery && (
            <Button
              variant="tertiary"
              size="sm"
              onPress={() => setQuery('')}
              className="absolute right-1 top-1 size-8 min-h-8 p-0"
              aria-label="Hapus pencarian"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Hapus pencarian</span>
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {deleteSessionError && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-ui-md border border-error-border bg-error-bg px-3 py-2.5 text-sm text-error-fg"
          >
            <span className="min-w-0 flex-1">{deleteSessionError}</span>
            <Button
              variant="tertiary"
              size="sm"
              onPress={onDismissDeleteError}
              className="size-7 min-h-7 p-0 text-error-fg"
              aria-label="Tutup pesan gagal hapus"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </Button>
          </div>
        )}

        {sessionsError && (
          <div
            role="alert"
            className="mb-3 rounded-ui-md border border-error-border bg-error-bg px-3 py-3 text-sm text-error-fg"
          >
            <p>{sessionsError}</p>
            <Button
              variant="link"
              size="sm"
              onPress={onRetry}
              className="mt-2 text-error-fg"
            >
              Coba lagi
            </Button>
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
                  className="mb-1.5 px-2 text-xs font-semibold text-fg-quaternary"
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
        <div className="flex items-center justify-between border-t border-border-secondary px-4 py-3">
          <span className="text-sm font-medium text-fg-secondary">Tampilan</span>
          <ChatThemeToggle className="size-9 min-h-9 p-0" />
        </div>
      )}

      <ModalOverlay
        isOpen={Boolean(deleteCandidate)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isDeletingCandidate) setDeleteCandidate(null);
        }}
        isDismissable={!isDeletingCandidate}
      >
        <Modal>
          <Dialog>
            <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-error-bg text-error-fg">
              <Trash2 className="size-5" aria-hidden="true" />
            </div>
            <ModalTitle>
              Hapus percakapan “{deleteCandidate?.title ?? 'Chat baru'}”?
            </ModalTitle>
            <ModalDescription className="mt-2 block">
              Percakapan beserta seluruh pesannya akan dihapus permanen.
            </ModalDescription>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onPress={() => setDeleteCandidate(null)}
                isDisabled={isDeletingCandidate}
                autoFocus
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onPress={() => void confirmDelete()}
                isLoading={isDeletingCandidate}
              >
                Hapus percakapan
              </Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
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
        'group/item flex min-h-11 items-center gap-1 rounded-ui-md pr-1 transition',
        isActive ? 'bg-brand-subtle text-brand-text' : 'hover:bg-bg-tertiary'
      )}
    >
      <Button
        variant="tertiary"
        size="sm"
        onPress={onSelect}
        isDisabled={isDeleting}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'min-h-11 min-w-0 flex-1 justify-start border-0 bg-transparent px-2.5 py-2 text-left shadow-none hover:bg-transparent [&_[data-slot=button-label]]:min-w-0 [&_[data-slot=button-label]]:flex-1 [&_[data-slot=button-label]]:overflow-hidden',
          isActive ? 'text-brand-text' : 'text-fg-secondary'
        )}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-sm font-medium" title={title}>
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs font-normal text-fg-quaternary">
            {formatChatSessionDate(session.updatedAt)}
          </span>
        </div>
      </Button>
      <Button
        variant="tertiary"
        size="sm"
        onPress={onDelete}
        isDisabled={isDeleting}
        isLoading={isDeleting}
        className="size-9 min-h-9 shrink-0 p-0 text-fg-quaternary hover:text-error-fg"
        aria-label={`Hapus percakapan ${title}`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Hapus</span>
      </Button>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div role="status" aria-label="Memuat riwayat percakapan" className="space-y-3 px-2">
      <span className="sr-only">Memuat riwayat percakapan</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="animate-pulse py-1.5" aria-hidden="true">
          <div className="h-3 w-3/4 rounded bg-bg-tertiary" />
          <div className="mt-2 h-2.5 w-2/5 rounded bg-bg-tertiary" />
        </div>
      ))}
    </div>
  );
}

function HistoryEmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-bg-secondary text-fg-quaternary">
        <MessageSquareText className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-fg-secondary">Belum ada riwayat chat</p>
      <p className="mt-1 text-xs text-fg-quaternary">
        Percakapan baru akan muncul di sini.
      </p>
    </div>
  );
}

function SearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-bg-secondary text-fg-quaternary">
        <SearchX className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-fg-secondary">
        Tidak ada percakapan yang cocok.
      </p>
      <Button variant="link" size="sm" onPress={onClear} className="mt-3">
        Hapus pencarian
      </Button>
    </div>
  );
}
