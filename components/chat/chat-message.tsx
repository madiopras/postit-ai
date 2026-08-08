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
          'chat chat-end transition-all',
          isCompact ? 'mt-1.5' : 'mt-4 sm:mt-5'
        )}
        aria-label="Pesan Anda"
      >
        <div className="chat-bubble chat-bubble-primary max-w-[88%] whitespace-pre-wrap break-words border border-primary/20 bg-primary/90 text-sm leading-relaxed [overflow-wrap:anywhere] shadow-lg shadow-primary/10 sm:max-w-[75%] backdrop-blur-sm">
          {message.content}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'chat chat-start group/msg transition-all',
        isCompact ? 'mt-2' : 'mt-5 sm:mt-6'
      )}
      aria-label="Jawaban PostIt AI"
    >
      <div className="chat-image avatar hidden sm:block">
        <div className="bg-base-100/90 flex size-10 items-center justify-center overflow-hidden rounded-2xl border border-base-300/60 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
          <PostItLogo size={28} className="size-7" />
        </div>
      </div>

      <div className="chat-header text-base-content/60 mb-1.5 flex items-center gap-1.5 text-xs font-medium">
        <span className="font-semibold text-base-content/80">PostIt AI</span>
        <span className="badge badge-neutral badge-soft badge-xs border border-base-300/60 uppercase tracking-wide">
          Asisten
        </span>
      </div>

      <div className="chat-bubble min-w-0 max-w-[95%] border border-base-300/60 bg-base-100/80 text-base-content text-sm leading-relaxed [overflow-wrap:anywhere] shadow-sm sm:max-w-[85%] backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/70">
        {message.content ? (
          <div className="min-w-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            {!isComplete && (
              <span
                className="bg-primary ml-1 inline-block size-2 animate-pulse rounded-full align-middle"
                aria-label="Mengetik"
                role="status"
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <span className="loading loading-dots loading-sm text-primary" />
            <span className="text-base-content/60 text-xs">Menyiapkan jawaban...</span>
          </div>
        )}

        {message.loginRequired && isComplete && (
          <div className="alert alert-warning/70 border border-warning/20 mt-3 rounded-2xl py-3 shadow-sm backdrop-blur-md">
            <LockKeyhole className="size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-semibold sm:text-sm">Login diperlukan untuk membuka SOP</h3>
              <p className="text-xs opacity-90">
                Konten internal dilindungi dan tidak ditampilkan pada sesi visitor.
              </p>
              <a
                href="/login?redirect=/"
                className="btn btn-warning btn-xs mt-2 gap-1.5 font-medium"
              >
                <LogIn className="size-3" />
                <span>Login sekarang</span>
              </a>
            </div>
          </div>
        )}

        {message.sources?.length ? <SourceList sources={message.sources} /> : null}
      </div>

      {isComplete && message.content && (
        <div className="chat-footer mt-2 flex min-h-8 flex-wrap items-center gap-1.5 rounded-full border border-base-300/60 bg-base-100/70 px-2 py-1 opacity-90 shadow-xs backdrop-blur-md transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover/msg:opacity-100">
          <button
            onClick={() => void copyAnswer()}
            className="btn btn-ghost btn-xs btn-square rounded-full text-base-content/60 hover:bg-base-200/70 hover:text-base-content"
            aria-label={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}
            title={copyState === 'success' ? 'Tersalin' : 'Salin jawaban'}
          >
            {copyState === 'success' ? (
              <Check className="text-success size-3.5" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
          </button>

          {canGiveFeedback && (
            <>
              <button
                onClick={() => void updateFeedback('thumbs_up')}
                disabled={feedbackState === 'pending'}
                className={cn(
                  'btn btn-ghost btn-xs btn-square rounded-full',
                  feedback === 'thumbs_up'
                    ? 'bg-success/10 text-success hover:bg-success/15'
                    : 'text-base-content/60 hover:bg-base-200/70 hover:text-base-content'
                )}
                aria-label="Jawaban membantu"
                aria-pressed={feedback === 'thumbs_up'}
                title="Jawaban membantu"
              >
                <ThumbsUp className="size-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={() => void updateFeedback('thumbs_down')}
                disabled={feedbackState === 'pending'}
                className={cn(
                  'btn btn-ghost btn-xs btn-square rounded-full',
                  feedback === 'thumbs_down'
                    ? 'bg-error/10 text-error hover:bg-error/15'
                    : 'text-base-content/60 hover:bg-base-200/70 hover:text-base-content'
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
        <span className="badge badge-success badge-soft badge-xs border border-success/20 font-medium" role="status">
          Tersalin
        </span>
      )}
      {copyState === 'error' && (
        <span className="badge badge-error badge-soft badge-xs border border-error/20 font-medium" role="alert">
          Gagal menyalin.
        </span>
      )}
      {feedbackState === 'pending' && (
        <span className="badge badge-ghost badge-soft badge-xs border border-base-300/60 font-medium" role="status">
          Menyimpan feedback...
        </span>
      )}
      {feedbackState === 'success' && (
        <span className="badge badge-success badge-soft badge-xs border border-success/20 font-medium" role="status">
          Feedback tersimpan.
        </span>
      )}
      {feedbackState === 'error' && (
        <span className="badge badge-error badge-soft badge-xs border border-error/20 font-medium" role="alert">
          Feedback gagal disimpan.
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
    <div className="bg-base-300/60 border-base-300 relative my-3 overflow-hidden rounded-xl border shadow-xs">
      <div className="bg-base-300/90 border-base-300 text-base-content/70 flex items-center justify-between border-b px-3.5 py-1.5 text-xs">
        <div className="text-base-content/60 flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider">
          <Code2 className="size-3.5" aria-hidden="true" />
          <span>{language || 'code'}</span>
        </div>
        <button
          onClick={() => void handleCopy()}
          className="btn btn-ghost btn-xs gap-1 text-[11px] font-normal"
          aria-label={copied ? 'Tersalin' : 'Salin kode'}
        >
          {copied ? (
            <>
              <Check className="text-success size-3" aria-hidden="true" />
              <span className="text-success">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="size-3" aria-hidden="true" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <pre className="text-base-content overflow-x-auto p-3.5 font-mono text-xs leading-relaxed">
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
        className="link link-primary font-medium underline underline-offset-4"
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
    return <h2 {...props} className="text-base-content mb-2 mt-4 text-base font-semibold first:mt-0" />;
  },
  h2: ({ node, ...props }) => {
    void node;
    return <h3 {...props} className="text-base-content mb-1.5 mt-3.5 text-sm font-semibold first:mt-0" />;
  },
  h3: ({ node, ...props }) => {
    void node;
    return <h4 {...props} className="text-base-content/70 mb-1 mt-3 text-xs font-semibold uppercase tracking-wider first:mt-0" />;
  },
  blockquote: ({ node, ...props }) => {
    void node;
    return <blockquote {...props} className="border-primary/60 text-base-content/70 my-2.5 border-l-2 pl-3.5 italic" />;
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
      <code {...props} className="bg-base-300/80 text-base-content border-base-300 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em] font-medium">
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
      <div className="border-base-300 my-3 max-w-full overflow-x-auto rounded-xl border shadow-xs">
        <table {...props} className="table table-zebra table-sm w-full min-w-max" />
      </div>
    );
  },
  th: ({ node, ...props }) => {
    void node;
    return <th {...props} className="bg-base-300/70 text-base-content font-semibold" />;
  },
  td: ({ node, ...props }) => {
    void node;
    return <td {...props} className="align-top" />;
  },
};
