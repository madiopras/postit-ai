'use client';

import { useEffect, useRef } from 'react';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { ChatShell } from '@/components/chat/chat-shell';
import { ChatTimeline } from '@/components/chat/chat-timeline';
import { ScrollToBottom } from '@/components/chat/scroll-to-bottom';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import type { ChatController } from '@/hooks/use-chat-controller';
import type { CurrentUserController } from '@/hooks/use-current-user';

export function ChatView({
  controller,
  identity,
}: {
  controller: ChatController;
  identity: CurrentUserController;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionFocusPendingRef = useRef(false);
  const {
    scrollRef,
    showScrollToBottom,
    onScroll,
    scrollToBottom,
  } = useChatScroll(controller.messages, controller.conversationVersion);

  useEffect(() => {
    if (!controller.ready || !suggestionFocusPendingRef.current) return;
    suggestionFocusPendingRef.current = false;
    textareaRef.current?.focus();
  }, [controller.ready]);

  const selectSuggestion = (suggestion: string) => {
    controller.setInput(suggestion);
    suggestionFocusPendingRef.current = true;
    requestAnimationFrame(() => {
      if (!textareaRef.current?.disabled) {
        suggestionFocusPendingRef.current = false;
        textareaRef.current?.focus();
      }
    });
  };

  return (
    <ChatShell controller={controller} identity={identity}>
      <div className="relative flex min-h-0 flex-1">
        <main
          ref={scrollRef}
          onScroll={onScroll}
          aria-label="Percakapan"
          aria-busy={controller.loading}
          className="absolute inset-0 flex overflow-y-auto px-4 py-5 md:px-6 md:py-7"
        >
          {controller.messages.length === 0 ? (
            <ChatEmptyState
              onSelectSuggestion={selectSuggestion}
              displayName={identity.user?.displayName ?? identity.user?.username}
            />
          ) : (
            <ChatTimeline
              messages={controller.messages}
              visitorId={controller.visitorId}
              error={controller.error}
              onFeedback={controller.submitFeedback}
            />
          )}
        </main>

        {showScrollToBottom && (
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <ScrollToBottom onPress={() => scrollToBottom('smooth')} />
          </div>
        )}
      </div>

      <ChatComposer
        value={controller.input}
        onChange={controller.setInput}
        onSend={controller.send}
        textareaRef={textareaRef}
        disabled={controller.loading || !controller.ready}
        loading={controller.loading}
        status={controller.chatStatus}
      />
    </ChatShell>
  );
}
