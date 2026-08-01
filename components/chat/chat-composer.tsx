'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';
import { TextArea } from '@/components/untitled/base/textarea/textarea';

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
      className="shrink-0 border-t border-border-secondary bg-bg-primary px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pt-4"
    >
      <div className="mx-auto w-full max-w-[800px]">
        <div className="relative mx-auto w-full max-w-3xl">
          <TextArea
            aria-label="Tanyakan sesuatu"
            placeholder="Tanyakan sesuatu..."
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            isDisabled={disabled}
            rows={1}
            textAreaRef={textareaRef}
            textAreaClassName="min-h-14 resize-none overflow-y-auto rounded-ui-xl py-4 pl-4 pr-14 text-sm shadow-ui-sm"
          />
          <Button
            onPress={() => void submit()}
            isDisabled={!canSend}
            isLoading={loading}
            className="absolute bottom-2 right-2 size-10 min-h-10 rounded-full p-0"
            aria-label="Kirim pesan"
          >
            <ArrowUp className="size-5" aria-hidden="true" />
            <span className="sr-only">Kirim pesan</span>
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-fg-quaternary">
          PostIt AI dapat membuat kesalahan. Periksa informasi penting.
        </p>
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
