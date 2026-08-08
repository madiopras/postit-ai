'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { ArrowUp, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';
import { TextArea } from '@/components/untitled/base/textarea/textarea';
import { cn } from '@/lib/utils';

const MAX_TEXTAREA_HEIGHT_PX = 200;

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => Promise<boolean>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  loading: boolean;
  status: 'idle' | 'submitting' | 'streaming' | 'complete' | 'error' | 'login-required';
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  textareaRef,
  disabled,
  loading,
  status,
}: ChatComposerProps) {
  const composerRef = useRef<HTMLDivElement>(null);
  const focusRestorePendingRef = useRef(false);
  const canSend = Boolean(value.trim()) && !disabled;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [textareaRef, value]);

  const restoreFocusIfAppropriate = useCallback(() => {
    if (!focusRestorePendingRef.current || textareaRef.current?.disabled) return;
    focusRestorePendingRef.current = false;
    const activeElement = document.activeElement;
    if (
      activeElement === document.body ||
      (activeElement && composerRef.current?.contains(activeElement))
    ) {
      textareaRef.current?.focus();
    }
  }, [textareaRef]);

  useEffect(() => {
    if (!disabled) restoreFocusIfAppropriate();
  }, [disabled, restoreFocusIfAppropriate]);

  const submit = async () => {
    if (!canSend) return;
    const shouldRestoreFocus = composerRef.current?.contains(document.activeElement) ?? false;
    const succeeded = await onSend();
    if (succeeded && shouldRestoreFocus) {
      focusRestorePendingRef.current = true;
      requestAnimationFrame(restoreFocusIfAppropriate);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div
      ref={composerRef}
      className="relative shrink-0 bg-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-5"
    >
      <div className="mx-auto w-full max-w-3xl">
        {/* Floating Capsule Box */}
        <div className="group relative rounded-2xl border border-border-secondary/80 bg-bg-primary/95 p-1.5 shadow-ui-md ring-1 ring-border-secondary/40 backdrop-blur-md transition-all duration-200 focus-within:border-border-brand/70 focus-within:ring-2 focus-within:ring-border-brand/20">
          <TextArea
            aria-label="Tanyakan sesuatu"
            placeholder="Tanyakan sesuatu tentang SOP, kebijakan, atau panduan..."
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            isDisabled={disabled}
            rows={1}
            textAreaRef={textareaRef}
            textAreaClassName="min-h-[52px] border-0 bg-transparent py-3 pl-3.5 pr-14 text-sm leading-relaxed text-fg-primary placeholder:text-fg-quaternary focus:ring-0 shadow-none"
          />

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
            <Button
              onPress={() => void submit()}
              isDisabled={!canSend}
              isLoading={loading}
              className={cn(
                'size-9 min-h-9 rounded-xl p-0 transition-all duration-200',
                canSend
                  ? 'bg-brand-solid text-fg-on-brand shadow-ui-xs hover:bg-brand-solid-hover'
                  : 'bg-bg-tertiary text-fg-disabled'
              )}
              aria-label="Kirim pesan"
            >
              <ArrowUp className="size-4.5" aria-hidden="true" />
              <span className="sr-only">Kirim pesan</span>
            </Button>
          </div>
        </div>

        {/* Footer info & shortcut hint */}
        <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-fg-quaternary">
          <span className="hidden items-center gap-1 sm:inline-flex">
            <span>Tekan</span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border-secondary bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-fg-tertiary shadow-ui-xs">
              <span>Enter</span>
              <CornerDownLeft className="size-2.5" aria-hidden="true" />
            </kbd>
            <span>untuk kirim</span>
          </span>
          <p className="mx-auto truncate text-center text-fg-quaternary sm:mx-0">
            PostIt AI dapat membuat kesalahan. Periksa informasi penting.
          </p>
        </div>

        <p className="sr-only" aria-live="polite">
          {statusLabel(status)}
        </p>
      </div>
    </div>
  );
}

function statusLabel(status: ChatComposerProps['status']): string {
  if (status === 'submitting') return 'Mengirim pertanyaan';
  if (status === 'streaming') return 'PostIt AI sedang menulis jawaban';
  if (status === 'complete') return 'Jawaban selesai';
  if (status === 'error') return 'Jawaban gagal dimuat';
  if (status === 'login-required') return 'Login diperlukan untuk membuka SOP';
  return '';
}
