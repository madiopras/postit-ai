'use client';

import React from 'react';
import { Button } from './button';

/**
 * One conversation belonging to the current visitor.
 */
export interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Chat sidebar component for session management
 */
export function ChatSidebar({
  sessions,
  activeChatId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen = true,
  onToggleSidebar,
}: {
  sessions: ChatSession[];
  activeChatId?: string | null;
  onNewChat: () => void;
  onSelectSession: (chatId: string) => void;
  onDeleteSession: (chatId: string) => void;
  isOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  return (
    <div
      className={`
      flex flex-col h-full transition-all duration-300
      ${isOpen ? 'w-64' : 'w-0 opacity-0 overflow-hidden'}
    `}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-outline-variant">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">smart_toy</span>
            </div>
            <h2 className="font-bold text-on-surface">PostIt AI</h2>
          </div>
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <Button onClick={onNewChat} className="w-full gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Chat Baru
        </Button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <p className="text-xs">Belum ada riwayat chat</p>
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-on-surface-variant mb-2 px-2">
              Riwayat Chat
            </div>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`
                  group flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-colors
                  ${
                    activeChatId === session.id
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }
                `}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {session.title || 'Chat baru'}
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    {new Date(session.updatedAt).toLocaleDateString('id-ID', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    // Otherwise the row's onClick would also open the chat
                    // that is being deleted.
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error shrink-0"
                  title="Hapus percakapan"
                  aria-label={`Hapus percakapan ${session.title ?? ''}`}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
