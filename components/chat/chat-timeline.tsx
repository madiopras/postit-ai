'use client';

import { CircleAlert } from 'lucide-react';
import { ChatMessage } from '@/components/chat/chat-message';
import type {
  ChatFeedback,
  ChatMessageData,
} from '@/lib/chat-client';

export function ChatTimeline({
  messages,
  visitorId,
  error,
  onFeedback,
}: {
  messages: ChatMessageData[];
  visitorId: string;
  error: string | null;
  onFeedback: (
    messageId: string,
    feedback: ChatFeedback | null
  ) => Promise<void>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-1 pb-10 pt-1">
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id ?? `${message.role}-${index}`}
          message={message}
          visitorId={visitorId}
          onFeedback={onFeedback}
          isCompact={index > 0 && messages[index - 1]?.role === message.role}
        />
      ))}

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-xs text-error sm:text-sm"
        >
          <CircleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  );
}
