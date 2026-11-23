"use client";

import { PostItLogo } from "@/components/brand/postit-logo";
import { ChatProfileMenu } from "@/components/chat/chat-profile-menu";
import { ChatThemeToggle } from "@/components/chat/chat-theme-toggle";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import type { ChatController } from "@/hooks/use-chat-controller";
import type { CurrentUserController } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import {
  CircleAlert,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function ChatShell({
  controller,
  identity,
  children,
}: {
  controller: ChatController;
  identity: CurrentUserController;
  children: ReactNode;
}) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const activeSession = controller.sessions.find(
    (session) => session.id === controller.chatId,
  );
  const activeTitle = activeSession?.title ?? "Chat baru";

  const closeMobileDrawer = (restoreFocus = false) => {
    setIsMobileDrawerOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => mobileMenuTriggerRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileDrawer(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileDrawerOpen]);

  const startNewChat = () => {
    controller.startNewChat();
    setIsMobileDrawerOpen(false);
  };

  const selectSession = (chatId: string) => {
    void controller.selectSession(chatId);
    setIsMobileDrawerOpen(false);
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
    <div className="relative flex h-screen h-dvh w-full overflow-hidden bg-base-100 text-base-content">
      {/* Signature Utarasu Ulos accent hairline */}
      <div
        className="utarasu-ulos-bar pointer-events-none fixed inset-x-0 top-0 z-50 h-[2.5px]"
        aria-hidden="true"
      />

      {/* Desktop Collapsible Left Rail */}
      <aside
        aria-label="Riwayat chat"
        className={cn(
          "hidden shrink-0 border-r border-base-300/80 bg-base-200/75 transition-[width,opacity] duration-200 ease-out md:flex md:flex-col",
          isDesktopSidebarOpen
            ? "w-[276px] opacity-100"
            : "w-0 overflow-hidden border-r-0 opacity-0",
        )}
      >
        {isDesktopSidebarOpen && (
          <ConversationSidebar
            {...sidebarProps}
            onToggleDesktop={() => setIsDesktopSidebarOpen(false)}
          />
        )}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Riwayat chat"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
            onClick={() => closeMobileDrawer(true)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-[min(86vw,320px)] flex-col border-r border-base-300 bg-base-200 shadow-2xl">
            <ConversationSidebar
              {...sidebarProps}
              onClose={() => closeMobileDrawer(true)}
              showMobileFooter
            />
          </div>
        </div>
      )}

      {/* Main Chat Workspace */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-base-100">
        {/* Top Slim Header */}
        <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-base-300/60 bg-base-100/85 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {/* Mobile Drawer Trigger */}
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="btn btn-ghost btn-sm btn-square rounded-xl text-base-content/75 hover:bg-base-200 hover:text-base-content md:hidden"
              aria-label="Buka riwayat chat"
            >
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            </button>

            {/* Desktop Sidebar Toggle */}
            <button
              type="button"
              onClick={() => setIsDesktopSidebarOpen((open) => !open)}
              className="btn btn-ghost btn-sm btn-square hidden rounded-xl text-base-content/75 hover:bg-base-200 hover:text-base-content md:inline-flex"
              aria-label={
                isDesktopSidebarOpen
                  ? "Sembunyikan sidebar"
                  : "Tampilkan sidebar"
              }
            >
              {isDesktopSidebarOpen ? (
                <PanelLeftClose className="size-5" aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="size-5" aria-hidden="true" />
              )}
            </button>

            {/* Quick New Chat shortcut (mobile or when desktop sidebar is collapsed) */}
            <button
              type="button"
              onClick={startNewChat}
              className={cn(
                "btn btn-ghost btn-sm btn-square rounded-xl text-base-content/75 hover:bg-base-200 hover:text-primary",
                isDesktopSidebarOpen && "md:hidden",
              )}
              aria-label="Mulai chat baru"
              title="Chat baru"
            >
              <SquarePen className="size-4.5" aria-hidden="true" />
            </button>

            {/* Active Conversation Title / Brand Pill */}
            <div className="flex min-w-0 items-center gap-2.5 pl-0.5">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-base-300/80 bg-base-100 shadow-2xs",
                  isDesktopSidebarOpen && "md:hidden",
                )}
              >
                <PostItLogo size={22} className="size-5.5" />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-tight text-base-content sm:text-[15px]">
                  {activeTitle}
                </h1>
                {!activeSession && (
                  <span className="hidden items-center gap-1.5 rounded-full border border-base-300/80 bg-base-200/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-base-content/65 sm:inline-flex">
                    <span
                      className="size-1.5 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    utaraSU
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ChatThemeToggle className="size-9 min-h-9 rounded-xl p-0" />
            <IdentityAction identity={identity} />
          </div>
        </header>

        <IdentityBanner identity={identity} />
        <PWAInstallBanner />

        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

function IdentityAction({ identity }: { identity: CurrentUserController }) {
  if (identity.status === "loading") {
    return (
      <span
        className="skeleton size-8 rounded-full"
        role="status"
        aria-label="Memuat profil"
      />
    );
  }

  if (identity.status === "authenticated") {
    return <ChatProfileMenu identity={identity} />;
  }

  if (identity.status === "error") {
    return (
      <button
        type="button"
        onClick={identity.retry}
        className="btn btn-ghost btn-circle btn-sm border border-error/30 bg-error/10 text-error"
        aria-label="Coba muat profil"
      >
        <UserRound className="size-4" aria-hidden="true" />
        <span className="sr-only">Coba muat profil</span>
      </button>
    );
  }

  return (
    <a
      href="/login?redirect=/"
      className="btn btn-primary btn-sm h-9 min-h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold shadow-2xs"
    >
      <LogIn className="size-3.5" aria-hidden="true" />
      <span>Masuk</span>
    </a>
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
    <div className="mx-auto w-full max-w-3xl px-4 pt-3">
      <div
        role={isError ? "alert" : "status"}
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-xs shadow-2xs",
          isError
            ? "border-error/25 bg-error/10 text-error"
            : "border-warning/30 bg-warning/10 text-warning-content dark:text-warning",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span className="leading-snug">{message}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {identity.error && (
            <button
              type="button"
              onClick={identity.retry}
              className="btn btn-ghost btn-xs h-7 px-2 font-semibold text-inherit"
            >
              Coba lagi
            </button>
          )}
          {dismiss && (
            <button
              type="button"
              onClick={dismiss}
              className="btn btn-ghost btn-circle btn-xs text-inherit"
              aria-label="Tutup pemberitahuan"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
