'use client';

import { useState, type ReactNode } from 'react';
import { CircleAlert, LogIn, Menu, Plus, UserRound, X } from 'lucide-react';
import { ChatProfileMenu } from '@/components/chat/chat-profile-menu';
import { ChatThemeToggle } from '@/components/chat/chat-theme-toggle';
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';
import { SlideoutMenu } from '@/components/untitled/application/slideout-menus/slideout-menu';
import {
  Button,
  ButtonLink,
} from '@/components/untitled/base/buttons/button';
import type { ChatController } from '@/hooks/use-chat-controller';
import type { CurrentUserController } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

export function ChatShell({
  controller,
  identity,
  children,
}: {
  controller: ChatController;
  identity: CurrentUserController;
  children: ReactNode;
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const activeTitle =
    controller.sessions.find((session) => session.id === controller.chatId)?.title ??
    'Chat baru';

  const startNewChat = () => {
    controller.startNewChat();
    setIsHistoryOpen(false);
  };

  const selectSession = (chatId: string) => {
    void controller.selectSession(chatId);
    setIsHistoryOpen(false);
  };

  const sidebarProps = {
    sessions: controller.sessions,
    activeChatId: controller.chatId,
    status: controller.sessionsStatus,
    sessionsError: controller.sessionsError,
    deletingSessionId: controller.deletingSessionId,
    deleteSessionError: controller.deleteSessionError,
    onNewChat: startNewChat,
    onSelectSession: selectSession,
    onRetry: () => void controller.retrySessions(),
    onDeleteSession: controller.deleteSession,
    onDismissDeleteError: controller.clearDeleteSessionError,
  };

  return (
    <div className="ui-surface grid h-screen h-dvh w-full overflow-hidden bg-bg-primary md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-border-secondary md:block">
        <ConversationSidebar {...sidebarProps} />
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-bg-primary">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-secondary px-3 md:h-16 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="tertiary"
              size="sm"
              onPress={() => setIsHistoryOpen(true)}
              className="size-9 min-h-9 p-0 md:hidden"
              aria-label="Buka riwayat chat"
            >
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Buka riwayat chat</span>
            </Button>
            <h1 className="truncate text-sm font-semibold text-fg-primary md:text-base">
              {activeTitle}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ChatThemeToggle className="hidden size-9 min-h-9 p-0 md:inline-flex" />
            <IdentityAction identity={identity} />
            <Button
              variant="tertiary"
              size="sm"
              onPress={startNewChat}
              className="size-9 min-h-9 p-0 md:hidden"
              aria-label="Mulai chat baru"
            >
              <Plus className="size-5" aria-hidden="true" />
              <span className="sr-only">Chat baru</span>
            </Button>
          </div>
        </header>

        <IdentityBanner identity={identity} />

        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </section>

      <SlideoutMenu
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        aria-label="Riwayat chat"
      >
        <ConversationSidebar
          {...sidebarProps}
          onClose={() => setIsHistoryOpen(false)}
          showMobileFooter
        />
      </SlideoutMenu>
    </div>
  );
}

function IdentityAction({ identity }: { identity: CurrentUserController }) {
  if (identity.status === 'loading') {
    return (
      <span
        className="size-9 animate-pulse rounded-full bg-bg-tertiary"
        role="status"
        aria-label="Memuat profil"
      />
    );
  }

  if (identity.status === 'authenticated') {
    return <ChatProfileMenu identity={identity} />;
  }

  if (identity.status === 'error') {
    return (
      <Button
        variant="tertiary"
        size="sm"
        onPress={identity.retry}
        className="size-9 min-h-9 p-0"
        aria-label="Coba muat profil"
      >
        <UserRound className="size-5" aria-hidden="true" />
        <span className="sr-only">Coba muat profil</span>
      </Button>
    );
  }

  return (
    <ButtonLink
      href="/login?redirect=/"
      variant="secondary"
      size="sm"
      iconLeading={<LogIn />}
      className="px-2.5 md:px-3"
    >
      Masuk
    </ButtonLink>
  );
}

function IdentityBanner({ identity }: { identity: CurrentUserController }) {
  const message = identity.logoutError ?? identity.error ?? identity.notice;
  if (!message) return null;

  const isError = Boolean(identity.logoutError || identity.error);
  const dismiss = identity.logoutError
    ? identity.dismissLogoutError
    : identity.notice
      ? identity.dismissNotice
      : null;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex shrink-0 items-start gap-2 border-b px-4 py-2.5 text-sm md:px-5',
        isError
          ? 'border-error-border bg-error-bg text-error-fg'
          : 'border-warning-bg bg-warning-bg text-warning-fg'
      )}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{message}</p>
      {identity.error && (
        <Button
          variant="link"
          size="sm"
          onPress={identity.retry}
          className="shrink-0 text-error-fg"
        >
          Coba lagi
        </Button>
      )}
      {dismiss && (
        <Button
          variant="tertiary"
          size="sm"
          onPress={dismiss}
          className="size-7 min-h-7 shrink-0 p-0 text-current"
          aria-label="Tutup pemberitahuan"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Tutup</span>
        </Button>
      )}
    </div>
  );
}
