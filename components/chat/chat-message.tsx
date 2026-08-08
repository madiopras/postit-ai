'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  LockKeyhole,
  LogIn,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
          'flex w-full justify-end transition-all',
          isCompact ? 'mt-2.5' : 'mt-6'
        )}
        aria-label="Pesan Anda"
      >
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-brand-solid px-4.5 py-3 text-sm leading-relaxed text-fg-on-brand shadow-ui-xs [overflow-wrap:anywhere] md:max-w-[75%]">
          {message.content}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group/msg flex w-full items-start gap-3 transition-all',
        isCompact ? 'mt-3' : 'mt-6'
      )}
      aria-label="Jawaban PostIt AI"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border-brand/30 bg-brand-subtle/80 text-brand-text shadow-ui-xs">
        <Sparkles className="size-4 text-brand-text" aria-hidden="true" />
      </div>
      <div className="min-w-0 max-w-[calc(100%-2.5rem)] flex-1">
        {message.content ? (
          <div className="min-w-0 text-sm leading-relaxed text-fg-secondary [overflow-wrap:anywhere]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            {!isComplete && (
              <span
                className="inline-block size-2 rounded-full bg-brand-solid align-middle animate-pulse ml-1"
                aria-label="Mengetik"
                role="status"
              />
            )}
          </div>
        ) : (
          <LoadingIndicator
            size="sm"
            label={<span className="text-sm text-fg-tertiary">Menyiapkan jawaban...</span>}
            className="min-h-10 flex-row items-center justify-start py-1"
          />
        )}

        {message.loginRequired && isComplete && (
          <div className="mt-3.5 rounded-xl border border-warning-bg bg-warning-bg/60 p-3.5 backdrop-blur-xs">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 size-4.5 shrink-0 text-warning-fg" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg-primary">
                  Login diperlukan untuk membuka SOP
                </p>
                <p className="mt-0.5 text-xs leading-5 text-fg-tertiary">
                  Konten internal dilindungi dan tidak ditampilkan pada sesi visitor.
                </p>
                <ButtonLink
                  href="/login?redirect=/"
                  variant="primary"
                  size="sm"
                  iconLeading={<LogIn className="size-3.5" />}
                  className="mt-2.5 h-8 text-xs font-medium"
                >
                  Login untuk membuka SOP
                </ButtonLink>
              </div>
            </div>
          </div>
        )}

        {isComplete && message.content && (
          <div className="mt-2.5 flex min-h-8 flex-wrap items-center gap-1.5 opacity-90 transition-opacity md:opacity-0 md:group-hover/msg:opacity-100 focus-within:opacity-100">
            <Tooltip content={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => void copyAnswer()}
                className="size-8 min-h-8 rounded-lg p-0 text-fg-quaternary hover:bg-bg-secondary hover:text-fg-secondary"
                aria-label={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}
              >
                {copyState === 'success' ? (
                  <Check className="size-3.5 text-success-fg" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
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
                      'size-8 min-h-8 rounded-lg p-0 transition-colors',
                      feedback === 'thumbs_up'
                        ? 'bg-success-bg text-success-fg'
                        : 'text-fg-quaternary hover:bg-bg-secondary hover:text-fg-secondary'
                    )}
                    aria-label="Jawaban membantu"
                    aria-pressed={feedback === 'thumbs_up'}
                  >
                    <ThumbsUp className="size-3.5" aria-hidden="true" />
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
                      'size-8 min-h-8 rounded-lg p-0 transition-colors',
                      feedback === 'thumbs_down'
                        ? 'bg-error-bg text-error-fg'
                        : 'text-fg-quaternary hover:bg-bg-secondary hover:text-fg-secondary'
                    )}
                    aria-label="Jawaban kurang tepat"
                    aria-pressed={feedback === 'thumbs_down'}
                  >
                    <ThumbsDown className="size-3.5" aria-hidden="true" />
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

function CodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(children);
      setCopied(true);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl border border-border-secondary/80 bg-bg-secondary/95 shadow-ui-xs">
      <div className="flex items-center justify-between border-b border-border-secondary/60 bg-bg-secondary/70 px-3.5 py-1.5 text-xs text-fg-tertiary">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-fg-quaternary">
          <Code2 className="size-3.5" aria-hidden="true" />
          <span>{language || 'code'}</span>
        </div>
        <Button
          variant="tertiary"
          size="sm"
          onPress={() => void handleCopy()}
          className="h-6 gap-1 rounded-md px-2 text-[11px] text-fg-quaternary hover:bg-bg-tertiary hover:text-fg-secondary"
          aria-label={copied ? 'Tersalin' : 'Salin kode'}
        >
          {copied ? (
            <>
              <Check className="size-3 text-success-fg" aria-hidden="true" />
              <span className="text-success-fg">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="size-3" aria-hidden="true" />
              <span>Salin</span>
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-fg-primary">
        <code>{children}</code>
      </pre>
    </div>
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
        className="font-medium text-brand-text underline underline-offset-4 decoration-border-brand/60 hover:decoration-brand-text"
      >
        {children}
      </a>
    );
  },
  p: ({ node, ...props }) => {
    void node;
    return <p {...props} className="my-2.5 first:mt-0 last:mb-0" />;
  },
  ul: ({ node, ...props }) => {
    void node;
    return <ul {...props} className="my-2.5 list-disc space-y-1 pl-5" />;
  },
  ol: ({ node, ...props }) => {
    void node;
    return <ol {...props} className="my-2.5 list-decimal space-y-1 pl-5" />;
  },
  h1: ({ node, ...props }) => {
    void node;
    return <h2 {...props} className="mb-2 mt-4 text-base font-semibold text-fg-primary first:mt-0" />;
  },
  h2: ({ node, ...props }) => {
    void node;
    return <h3 {...props} className="mb-1.5 mt-3.5 text-sm font-semibold text-fg-primary first:mt-0" />;
  },
  h3: ({ node, ...props }) => {
    void node;
    return <h4 {...props} className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-fg-tertiary first:mt-0" />;
  },
  blockquote: ({ node, ...props }) => {
    void node;
    return <blockquote {...props} className="my-2.5 border-l-2 border-border-brand/70 pl-3.5 text-fg-tertiary italic" />;
  },
  code: ({ node, className, children, ...props }) => {
    void node;
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = Boolean(className) || String(children).includes('\n');
    if (isBlock) {
      const codeText = String(children).replace(/\n$/, '');
      const language = match ? match[1] : '';
      return <CodeBlock language={language} children={codeText} />;
    }
    return (
      <code {...props} className="rounded-md bg-bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-fg-primary border border-border-secondary/60">
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    return <>{children}</>;
  },
  table: ({ node, ...props }) => {
    void node;
    return (
      <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-border-secondary/80 shadow-ui-xs">
        <table {...props} className="w-full min-w-max border-collapse text-left text-xs" />
      </div>
    );
  },
  th: ({ node, ...props }) => {
    void node;
    return <th {...props} className="border-b border-border-secondary/80 bg-bg-secondary/70 px-3.5 py-2.5 font-semibold text-fg-primary" />;
  },
  td: ({ node, ...props }) => {
    void node;
    return <td {...props} className="border-b border-border-secondary/40 px-3.5 py-2 align-top last:border-b-0" />;
  },
};
