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
    <div className="mx-auto w-full max-w-3xl space-y-1.5 pb-6 sm:space-y-2">
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
          className="alert alert-error mt-5 rounded-2xl border border-error/20 bg-error/10 text-xs shadow-sm backdrop-blur-md md:text-sm"
        >
          <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
