'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  LockKeyhole,
  LogIn,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SourceList } from '@/components/chat/source-list';
import { LoadingIndicator } from '@/components/untitled/application/loading-indicator/loading-indicator';
import {
  Button,
  ButtonLink,
} from '@/components/untitled/base/buttons/button';
import { Tooltip } from '@/components/untitled/base/tooltip/tooltip';
import type {
  ChatFeedback,
  ChatMessageData,
} from '@/lib/chat-client';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageData;
  isCompact: boolean;
  visitorId: string;
  onFeedback: (
    messageId: string,
    feedback: ChatFeedback | null
  ) => Promise<void>;
}

type CopyState = 'idle' | 'success' | 'error';
type FeedbackState = 'idle' | 'pending' | 'success' | 'error';

export function ChatMessage({
  message,
  isCompact,
  visitorId,
  onFeedback,
}: ChatMessageProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [feedback, setFeedback] = useState<ChatFeedback | null>(
    message.feedback ?? null
  );
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const copyTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const isUser = message.role === 'user';
  const isComplete = (message.deliveryState ?? 'complete') === 'complete';
  const canGiveFeedback =
    isComplete && Boolean(message.id) && Boolean(visitorId);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    },
    []
  );

  const resetCopyLater = () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), 2_000);
  };

  const resetFeedbackLater = () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedbackState('idle'), 2_000);
  };

  const copyAnswer = async () => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(message.content);
      setCopyState('success');
      resetCopyLater();
    } catch {
      setCopyState('error');
      resetCopyLater();
    }
  };

  const updateFeedback = async (type: ChatFeedback) => {
    if (!message.id || feedbackState === 'pending') return;

    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    const previous = feedback;
    const next = feedback === type ? null : type;
    setFeedback(next);
    setFeedbackState('pending');

    try {
      await onFeedback(message.id, next);
      setFeedbackState('success');
      resetFeedbackLater();
    } catch {
      setFeedback(previous);
      setFeedbackState('error');
    }
  };

  if (isUser) {
    return (
      <article
        className={cn(
          'flex w-full justify-end',
          isCompact ? 'mt-3' : 'mt-7'
        )}
        aria-label="Pesan Anda"
      >
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-ui-xl rounded-br-ui-sm bg-brand-solid px-4 py-3 text-sm leading-6 text-fg-on-brand [overflow-wrap:anywhere] md:max-w-[72%]">
          {message.content}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn('flex w-full items-start gap-3', isCompact ? 'mt-4' : 'mt-7')}
      aria-label="Jawaban PostIt AI"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand-text">
        <Bot className="size-4.5" aria-hidden="true" />
      </div>
      <div className="min-w-0 max-w-[calc(100%-2.75rem)] flex-1">
        {message.content ? (
          <div className="min-w-0 text-sm leading-6 text-fg-secondary [overflow-wrap:anywhere]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <LoadingIndicator
            size="sm"
            label={<span>Menyiapkan jawaban...</span>}
            className="min-h-12 flex-row items-center justify-start"
          />
        )}

        {message.loginRequired && isComplete && (
          <div className="mt-4 rounded-ui-lg border border-warning-bg bg-warning-bg px-4 py-3">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-warning-fg" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg-primary">
                  Login diperlukan untuk membuka SOP
                </p>
                <p className="mt-1 text-xs leading-5 text-fg-tertiary">
                  Konten internal dilindungi dan tidak ditampilkan pada sesi visitor.
                </p>
                <ButtonLink
                  href="/login?redirect=/"
                  variant="primary"
                  size="sm"
                  iconLeading={<LogIn />}
                  className="mt-3"
                >
                  Login untuk membuka SOP
                </ButtonLink>
              </div>
            </div>
          </div>
        )}

        {isComplete && <SourceList sources={message.sources ?? []} />}

        {isComplete && message.content && (
          <div className="mt-3 flex min-h-9 flex-wrap items-center gap-1">
            <Tooltip content={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => void copyAnswer()}
                className="size-9 min-h-9 p-0 text-fg-quaternary"
                aria-label={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}
              >
                {copyState === 'success' ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}
                </span>
              </Button>
            </Tooltip>

            {canGiveFeedback && (
              <>
                <Tooltip content="Jawaban membantu">
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={() => void updateFeedback('thumbs_up')}
                    isDisabled={feedbackState === 'pending'}
                    className={cn(
                      'size-9 min-h-9 p-0',
                      feedback === 'thumbs_up'
                        ? 'bg-success-bg text-success-fg'
                        : 'text-fg-quaternary'
                    )}
                    aria-label="Jawaban membantu"
                    aria-pressed={feedback === 'thumbs_up'}
                  >
                    <ThumbsUp className="size-4" aria-hidden="true" />
                    <span className="sr-only">Jawaban membantu</span>
                  </Button>
                </Tooltip>
                <Tooltip content="Jawaban kurang tepat">
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={() => void updateFeedback('thumbs_down')}
                    isDisabled={feedbackState === 'pending'}
                    className={cn(
                      'size-9 min-h-9 p-0',
                      feedback === 'thumbs_down'
                        ? 'bg-error-bg text-error-fg'
                        : 'text-fg-quaternary'
                    )}
                    aria-label="Jawaban kurang tepat"
                    aria-pressed={feedback === 'thumbs_down'}
                  >
                    <ThumbsDown className="size-4" aria-hidden="true" />
                    <span className="sr-only">Jawaban kurang tepat</span>
                  </Button>
                </Tooltip>
              </>
            )}

            <ActionStatus copyState={copyState} feedbackState={feedbackState} />
          </div>
        )}
      </div>
    </article>
  );
}

function ActionStatus({
  copyState,
  feedbackState,
}: {
  copyState: CopyState;
  feedbackState: FeedbackState;
}) {
  return (
    <>
      {copyState === 'success' && (
        <span className="text-xs text-success-fg" role="status">Tersalin</span>
      )}
      {copyState === 'error' && (
        <span className="text-xs text-error-fg" role="alert">Gagal menyalin jawaban.</span>
      )}
      {feedbackState === 'pending' && (
        <span className="text-xs text-fg-quaternary" role="status">Menyimpan feedback...</span>
      )}
      {feedbackState === 'success' && (
        <span className="text-xs text-success-fg" role="status">Feedback tersimpan.</span>
      )}
      {feedbackState === 'error' && (
        <span className="text-xs text-error-fg" role="alert">
          Feedback gagal disimpan. Pilihan dikembalikan.
        </span>
      )}
    </>
  );
}

const markdownComponents: Components = {
  a: ({ node, href, children, ...props }) => {
    void node;
    const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
    return (
      <a
        {...props}
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="font-medium text-brand-text underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
  p: ({ node, ...props }) => {
    void node;
    return <p {...props} className="my-3 first:mt-0 last:mb-0" />;
  },
  ul: ({ node, ...props }) => {
    void node;
    return <ul {...props} className="my-3 list-disc space-y-1 pl-6" />;
  },
  ol: ({ node, ...props }) => {
    void node;
    return <ol {...props} className="my-3 list-decimal space-y-1 pl-6" />;
  },
  h1: ({ node, ...props }) => {
    void node;
    return <h2 {...props} className="mb-2 mt-5 text-lg font-semibold text-fg-primary first:mt-0" />;
  },
  h2: ({ node, ...props }) => {
    void node;
    return <h3 {...props} className="mb-2 mt-5 text-base font-semibold text-fg-primary first:mt-0" />;
  },
  h3: ({ node, ...props }) => {
    void node;
    return <h4 {...props} className="mb-2 mt-4 text-sm font-semibold text-fg-primary first:mt-0" />;
  },
  blockquote: ({ node, ...props }) => {
    void node;
    return <blockquote {...props} className="my-3 border-l-2 border-border-brand pl-4 text-fg-tertiary" />;
  },
  code: ({ node, ...props }) => {
    void node;
    return <code {...props} className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono text-[0.875em] text-fg-primary" />;
  },
  pre: ({ node, ...props }) => {
    void node;
    return <pre {...props} className="my-3 max-w-full overflow-x-auto rounded-ui-lg bg-bg-tertiary p-4 text-sm text-fg-primary" />;
  },
  table: ({ node, ...props }) => {
    void node;
    return (
      <div className="my-4 max-w-full overflow-x-auto rounded-ui-lg border border-border-secondary">
        <table {...props} className="w-full min-w-max border-collapse text-left text-sm" />
      </div>
    );
  },
  th: ({ node, ...props }) => {
    void node;
    return <th {...props} className="border-b border-border-secondary bg-bg-secondary px-3 py-2 font-semibold text-fg-primary" />;
  },
  td: ({ node, ...props }) => {
    void node;
    return <td {...props} className="border-b border-border-secondary px-3 py-2 align-top last:border-b-0" />;
  },
};
