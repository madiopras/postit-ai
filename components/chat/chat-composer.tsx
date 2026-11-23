"use client";

import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";

const MAX_TEXTAREA_HEIGHT_PX = 200;

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => Promise<boolean>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  loading: boolean;
  status:
    | "idle"
    | "submitting"
    | "streaming"
    | "complete"
    | "error"
    | "login-required";
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
  const shortcutHintId = "chat-composer-shortcuts";
  const disclaimerId = "chat-composer-disclaimer";

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
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
    const shouldRestoreFocus =
      composerRef.current?.contains(document.activeElement) ?? false;
    const succeeded = await onSend();
    if (succeeded && shouldRestoreFocus) {
      focusRestorePendingRef.current = true;
      requestAnimationFrame(restoreFocusIfAppropriate);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div
      ref={composerRef}
      className="relative z-10 shrink-0 bg-base-100 px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 md:pb-5"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="group relative rounded-[24px] border border-base-300 bg-base-200/65 shadow-sm transition-all duration-150 hover:border-primary/35 focus-within:border-primary/60 focus-within:bg-base-100 focus-within:shadow-md focus-within:shadow-primary/5 focus-within:ring-4 focus-within:ring-primary/10">
          <div className="flex flex-col px-3.5 pb-2.5 pt-3 sm:px-4 sm:pb-3 sm:pt-3.5">
            <textarea
              ref={textareaRef}
              aria-label="Tanyakan sesuatu"
              aria-describedby={`${shortcutHintId} ${disclaimerId}`}
              placeholder="Tanyakan sesuatu tentang SOP, FAQ, atau kebijakan..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
              className="utarasu-scroll min-h-[44px] max-h-[200px] w-full resize-none border-0 bg-transparent px-0.5 py-1 text-[15px] leading-6 text-base-content outline-none placeholder:text-base-content/45 disabled:cursor-not-allowed disabled:opacity-65"
            />

            <div className="mt-1.5 flex items-center justify-between gap-2 pt-1">
              <div
                id={shortcutHintId}
                className="hidden items-center gap-1.5 text-[11px] text-base-content/45 sm:inline-flex"
              >
                <kbd className="rounded-md border border-base-300 bg-base-100 px-1.5 py-0.5 font-mono text-[10px] text-base-content/65">
                  Enter
                </kbd>
                <span>kirim</span>
                <span className="text-base-content/30">·</span>
                <kbd className="rounded-md border border-base-300 bg-base-100 px-1.5 py-0.5 font-mono text-[10px] text-base-content/65">
                  Shift + Enter
                </kbd>
                <span>baris baru</span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!canSend || loading}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    canSend
                      ? "bg-primary text-primary-content shadow-sm hover:brightness-110 active:scale-95"
                      : "cursor-not-allowed bg-base-300/80 text-base-content/35",
                  )}
                  aria-label="Kirim pesan"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <ArrowUp className="size-4.5 stroke-[2.25]" aria-hidden="true" />
                  )}
                  <span className="sr-only">Kirim pesan</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <p
          id={disclaimerId}
          className="mt-2 px-2 text-center text-[11px] text-base-content/45"
        >
          PostIt AI dapat membuat kesalahan. Periksa kembali informasi penting.
        </p>

        <p className="sr-only" aria-live="polite">
          {statusLabel(status)}
        </p>
      </div>
    </div>
  );
}

function statusLabel(status: ChatComposerProps["status"]): string {
  if (status === "submitting") return "Mengirim pertanyaan";
  if (status === "streaming") return "PostIt AI sedang menulis jawaban";
  if (status === "complete") return "Jawaban selesai";
  if (status === "error") return "Jawaban gagal dimuat";
  if (status === "login-required") return "Login diperlukan untuk membuka SOP";
  return "";
}
