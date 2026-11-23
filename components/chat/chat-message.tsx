'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  LockKeyhole,
  LogIn,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PostItLogo } from '@/components/brand/postit-logo';
import { SourceList } from '@/components/chat/source-list';
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
          'flex justify-end',
          isCompact ? 'mt-2' : 'mt-6 first:mt-0'
        )}
        aria-label="Pesan Anda"
      >
        <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-[6px] bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-content shadow-xs [overflow-wrap:anywhere] dark:border dark:border-primary/25 dark:bg-[#123346] dark:text-base-content sm:max-w-[76%] sm:px-4.5 sm:py-3">
          {message.content}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'group/msg flex items-start gap-3 sm:gap-3.5',
        isCompact ? 'mt-3' : 'mt-6 first:mt-0'
      )}
      aria-label="Jawaban PostIt AI"
    >
      {/* Assistant Mascot Avatar */}
      <div className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-base-300/90 bg-base-100 shadow-2xs sm:size-9">
        <PostItLogo size={26} className="size-6 sm:size-6.5" />
        <span
          className="utarasu-ulos-bar absolute inset-x-0 bottom-0 h-[2px]"
          aria-hidden="true"
        />
      </div>

      {/* Editorial Open-Flow Response Column */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-bold tracking-tight text-base-content">
            PostIt AI
          </span>
          {!isComplete && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              Menjawab
            </span>
          )}
        </div>

        <div className="min-w-0 text-[15px] leading-7 text-base-content [overflow-wrap:anywhere]">
          {message.content ? (
            <div className="min-w-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
              {!isComplete && (
                <span
                  className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-full bg-primary align-middle"
                  aria-label="Mengetik"
                  role="status"
                />
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-base-300/80 bg-base-200/55 px-3.5 py-2">
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.24s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.12s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary" />
              </span>
              <span className="text-xs font-medium text-base-content/65">
                Menyiapkan jawaban...
              </span>
            </div>
          )}

          {message.loginRequired && isComplete && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-warning/35 bg-warning/10 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                <LockKeyhole className="size-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-base-content">
                  Login diperlukan untuk membuka SOP
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed text-base-content/70">
                  Konten internal dilindungi dan tidak ditampilkan pada sesi visitor.
                </p>
                <a
                  href="/login?redirect=/"
                  className="btn btn-primary btn-xs mt-3 h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold"
                >
                  <LogIn className="size-3.5" aria-hidden="true" />
                  <span>Login untuk membuka SOP</span>
                </a>
              </div>
            </div>
          )}

          {message.sources?.length ? <SourceList sources={message.sources} /> : null}
        </div>

        {/* Minimalist Action Toolbar */}
        {isComplete && message.content && (
          <div className="mt-2.5 flex min-h-7 flex-wrap items-center gap-1 text-base-content/55">
            <button
              type="button"
              onClick={() => void copyAnswer()}
              className="inline-flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}
              title={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}
            >
              {copyState === 'success' ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
            </button>

            {canGiveFeedback && (
              <>
                <button
                  type="button"
                  onClick={() => void updateFeedback('thumbs_up')}
                  disabled={feedbackState === 'pending'}
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50',
                    feedback === 'thumbs_up'
                      ? 'bg-success/12 text-success'
                      : 'hover:bg-base-200 hover:text-base-content'
                  )}
                  aria-label="Jawaban membantu"
                  aria-pressed={feedback === 'thumbs_up'}
                  title="Jawaban membantu"
                >
                  <ThumbsUp className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void updateFeedback('thumbs_down')}
                  disabled={feedbackState === 'pending'}
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50',
                    feedback === 'thumbs_down'
                      ? 'bg-error/12 text-error'
                      : 'hover:bg-base-200 hover:text-base-content'
                  )}
                  aria-label="Jawaban kurang tepat"
                  aria-pressed={feedback === 'thumbs_down'}
                  title="Jawaban kurang tepat"
                >
                  <ThumbsDown className="size-3.5" aria-hidden="true" />
                </button>
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
        <span
          className="ml-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success"
          role="status"
        >
          Tersalin
        </span>
      )}
      {copyState === 'error' && (
        <span
          className="ml-1 rounded-full bg-error/12 px-2 py-0.5 text-[11px] font-medium text-error"
          role="alert"
        >
          Gagal menyalin jawaban.
        </span>
      )}
      {feedbackState === 'pending' && (
        <span
          className="ml-1 rounded-full bg-base-200 px-2 py-0.5 text-[11px] font-medium text-base-content/65"
          role="status"
        >
          Menyimpan feedback...
        </span>
      )}
      {feedbackState === 'success' && (
        <span
          className="ml-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-success"
          role="status"
        >
          Feedback tersimpan.
        </span>
      )}
      {feedbackState === 'error' && (
        <span
          className="ml-1 rounded-full bg-error/12 px-2 py-0.5 text-[11px] font-medium text-error"
          role="alert"
        >
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
    <div className="my-3.5 overflow-hidden rounded-2xl border border-[#1a303f] bg-[#0a1822] text-[#e6f1f7] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#1a303f] bg-[#0f2230] px-3.5 py-2 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase tracking-wide text-[#8fb4c9]">
          <Code2 className="size-3.5 text-[#38b6e2]" aria-hidden="true" />
          <span>{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#b5d0df] transition-colors hover:bg-white/10 hover:text-white"
          aria-label={copied ? 'Tersalin' : 'Salin kode'}
        >
          {copied ? (
            <>
              <Check className="size-3 text-[#34d399]" aria-hidden="true" />
              <span className="text-[#34d399]">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="size-3" aria-hidden="true" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="utarasu-scroll overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
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
        className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
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
    return <ul {...props} className="my-3 list-disc space-y-1.5 pl-5 marker:text-primary/70" />;
  },
  ol: ({ node, ...props }) => {
    void node;
    return <ol {...props} className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-primary/80" />;
  },
  li: ({ node, ...props }) => {
    void node;
    return <li {...props} className="pl-0.5" />;
  },
  strong: ({ node, ...props }) => {
    void node;
    return <strong {...props} className="font-semibold text-base-content" />;
  },
  h1: ({ node, ...props }) => {
    void node;
    return (
      <h2
        {...props}
        className="mb-2.5 mt-5 text-lg font-bold tracking-tight text-base-content first:mt-0"
      />
    );
  },
  h2: ({ node, ...props }) => {
    void node;
    return (
      <h3
        {...props}
        className="mb-2 mt-4 text-base font-semibold tracking-tight text-base-content first:mt-0"
      />
    );
  },
  h3: ({ node, ...props }) => {
    void node;
    return (
      <h4
        {...props}
        className="mb-1.5 mt-3.5 text-sm font-semibold text-base-content/85 first:mt-0"
      />
    );
  },
  hr: ({ node, ...props }) => {
    void node;
    return <hr {...props} className="my-4 border-base-300" />;
  },
  blockquote: ({ node, ...props }) => {
    void node;
    return (
      <blockquote
        {...props}
        className="my-3 rounded-r-xl border-l-[3px] border-accent/70 bg-base-200/60 py-2 pl-4 pr-3 text-base-content/80 italic"
      />
    );
  },
  code: ({ node, className, children, ...props }) => {
    void node;
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = Boolean(className) || String(children).includes('\n');
    if (isBlock) {
      const codeText = String(children).replace(/\n$/, '');
      const language = match ? match[1] : '';
      return <CodeBlock language={language}>{codeText}</CodeBlock>;
    }
    return (
      <code
        {...props}
        className="rounded-md border border-base-300 bg-base-200/90 px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-primary"
      >
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
      <div className="utarasu-scroll my-4 max-w-full overflow-x-auto rounded-2xl border border-base-300 bg-base-100">
        <table {...props} className="table table-zebra table-sm w-full min-w-max" />
      </div>
    );
  },
  th: ({ node, ...props }) => {
    void node;
    return (
      <th
        {...props}
        className="bg-base-200/90 text-xs font-semibold tracking-wide text-base-content/80"
      />
    );
  },
  td: ({ node, ...props }) => {
    void node;
    return <td {...props} className="align-top text-sm" />;
  },
};
