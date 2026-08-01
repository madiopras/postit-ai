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
    <div className="mx-auto w-full max-w-3xl pb-6">
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
          className="mt-6 flex items-start gap-3 rounded-ui-lg border border-error-border bg-error-bg px-4 py-3 text-sm text-error-fg"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
