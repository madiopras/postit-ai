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
  History,
  LogIn,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export function ChatShell({
  controller,
  identity,
  children,
}: {
  controller: ChatController;
  identity: CurrentUserController;
  children: ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const activeTitle =
    controller.sessions.find((session) => session.id === controller.chatId)
      ?.title ?? "Chat baru";

  const startNewChat = () => {
    controller.startNewChat();
    setIsDrawerOpen(false);
  };

  const selectSession = (chatId: string) => {
    void controller.selectSession(chatId);
    setIsDrawerOpen(false);
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
    <div className="drawer h-screen h-dvh w-full overflow-hidden bg-base-200/40 md:drawer-open">
      <input
        id="chat-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={isDrawerOpen}
        onChange={(e) => setIsDrawerOpen(e.target.checked)}
      />

      {/* Main Content Area */}
      <div className="drawer-content relative flex min-h-0 min-w-0 flex-col overflow-hidden pb-16 md:pb-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_70%)]" />
        {/* Header */}
        <header className="sticky top-0 z-20 mx-3 mt-3 flex h-14 shrink-0 items-center justify-between rounded-[26px] border border-base-300/60 bg-base-100/75 px-3 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/65 md:mx-4 md:h-16 md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              onClick={() => setIsDesktopSidebarOpen((open) => !open)}
              className="btn btn-ghost btn-sm btn-square hidden border border-base-300/60 bg-base-100/70 shadow-sm md:inline-flex"
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
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-8 items-center justify-center overflow-hidden rounded-2xl border border-base-300/60 bg-base-100/85 shadow-sm ring-1 ring-black/5 md:hidden">
                <PostItLogo size={28} className="size-7" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-base-content md:text-base">
                  {activeTitle}
                </h1>
                <p className="hidden text-[11px] text-base-content/45 md:block">
                  Percakapan aktif
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <ChatThemeToggle className="hidden size-9 min-h-9 p-0 md:inline-flex" />
            <IdentityAction identity={identity} />
          </div>
        </header>

        <IdentityBanner identity={identity} />
        <PWAInstallBanner />

        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>

        {/* DaisyUI Dock (Bottom App Bar for Mobile PWA) */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
          <div className="dock dock-bottom dock-sm pointer-events-auto mx-auto flex max-w-xl items-end justify-between gap-1 rounded-[26px] border border-base-300/60 bg-base-100/82 px-2 py-2 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.5)] backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/72">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-2 text-base-content/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-base-200/70 hover:text-primary active:translate-y-0"
              aria-label="Riwayat chat"
            >
              <History className="size-5" />
              {/* <span className="dock-label text-[10px] leading-none">
                Riwayat
              </span> */}
            </button>

            <button
              onClick={startNewChat}
              className="flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-[18px] bg-primary/10 px-3 py-2 font-semibold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/15 active:translate-y-0"
              aria-label="Chat Baru"
            >
              <MessageSquarePlus className="size-5" />
              {/* <span className="dock-label text-[10px] leading-none">Chat Baru</span> */}
            </button>

            <div className="flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-base-200/70 active:translate-y-0">
              <ChatThemeToggle className="size-9 min-h-9 p-0" />
              {/* <span className="dock-label text-[10px] leading-none text-base-content/70">
                Tema
              </span> */}
            </div>

            {identity.status === "authenticated" ? (
              <div className="flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-base-200/70 active:translate-y-0">
                <ChatProfileMenu identity={identity} />
                {/* <span className="dock-label text-[10px] leading-none text-base-content/70">
                  Akun
                </span> */}
              </div>
            ) : (
              <a
                href="/login?redirect=/"
                className="flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-2 text-base-content/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-base-200/70 hover:text-primary active:translate-y-0"
                aria-label="Masuk Akun"
              >
                <User className="size-5" />
                {/* <span className="dock-label text-[10px] leading-none">
                  Masuk
                </span> */}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Side (Sidebar for Desktop & Mobile Slideout) */}
      <div
        className={cn("drawer-side z-40", !isDesktopSidebarOpen && "md:hidden")}
      >
        <label
          htmlFor="chat-drawer"
          aria-label="close sidebar"
          className="drawer-overlay md:hidden"
        />
        <div className="h-full w-72 overflow-hidden border-r border-base-300/60 bg-base-100/85 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-base-100/72 sm:w-80 md:m-3 md:rounded-[28px] md:border">
          <ConversationSidebar
            {...sidebarProps}
            onClose={() => setIsDrawerOpen(false)}
            showMobileFooter
          />
        </div>
      </div>
    </div>
  );
}

function IdentityAction({ identity }: { identity: CurrentUserController }) {
  if (identity.status === "loading") {
    return (
      <span
        className="skeleton size-8 rounded-full ring-1 ring-base-300/60"
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
        className="btn btn-ghost btn-circle btn-sm border border-base-300/60 bg-base-100/70 text-error shadow-sm"
        aria-label="Coba muat profil"
      >
        <UserRound className="size-4.5" aria-hidden="true" />
        <span className="sr-only">Coba muat profil</span>
      </button>
    );
  }

  return (
    <a
      href="/login?redirect=/"
      className="btn btn-primary btn-sm gap-1.5 border border-primary/20 shadow-sm shadow-primary/10"
    >
      <LogIn className="size-4" />
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
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "alert mx-3 mt-2 flex items-center justify-between rounded-2xl border text-xs py-2 px-4 shadow-sm backdrop-blur-md md:mx-4",
        isError
          ? "alert-error border-error/20 bg-error/10"
          : "alert-warning border-warning/20 bg-warning/10",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{message}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {identity.error && (
          <button
            type="button"
            onClick={identity.retry}
            className="btn btn-link btn-xs text-inherit p-0"
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
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
