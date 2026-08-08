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
    if (!focusRestorePendingRef.current || textareaRef.current?.disabled)
      return;
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
      className="relative shrink-0 bg-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-5"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="group relative overflow-hidden rounded-[34px] border border-base-300/60 bg-base-100/88 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.55)] ring-1 ring-black/5 backdrop-blur-2xl transition-all duration-200 hover:border-primary/35 hover:shadow-[0_28px_90px_-40px_rgba(15,23,42,0.6)] focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-90" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_52%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

          <div className="flex flex-col gap-3 p-3 md:p-4">
            <textarea
              ref={textareaRef}
              aria-label="Tanyakan sesuatu"
              aria-describedby={`${shortcutHintId} ${disclaimerId}`}
              placeholder="Tanyakan apa saja tentang Coffe Gaul"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
              className="placeholder:text-base-content/35 min-h-[108px] max-h-[200px] w-full resize-none border-0 bg-transparent px-1 py-2 text-sm leading-6 text-base-content outline-hidden placeholder:transition-opacity focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-70 md:min-h-[122px]"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div
                id={shortcutHintId}
                className="hidden items-center gap-1 text-[11px] text-base-content/50 sm:inline-flex"
              >
                <span>Tekan</span>
                <kbd className="kbd kbd-xs">Enter</kbd>
                <span>untuk kirim</span>
                <span className="text-base-content/35">·</span>
                <span>Shift</span>
                <kbd className="kbd kbd-xs">Enter</kbd>
                <span>baris baru</span>
              </div>

              <div className="flex flex-col gap-2 sm:ml-auto sm:max-w-[24rem] sm:items-end">
                {/* <p
                  id={disclaimerId}
                  className="max-w-[18rem] text-right text-[11px] leading-snug text-base-content/50 sm:truncate"
                >
                  PostIt AI dapat membuat kesalahan. Periksa informasi penting.
                </p> */}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={!canSend || loading}
                    className={cn(
                      "btn btn-circle btn-sm size-11 shrink-0 border-0 shadow-xs transition-all duration-200",
                      canSend
                        ? "btn-primary shadow-primary/25 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30 active:translate-y-0"
                        : "btn-ghost cursor-not-allowed bg-base-200 text-base-content/30 shadow-none",
                    )}
                    aria-label="Kirim pesan"
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <ArrowUp className="size-4.5" aria-hidden="true" />
                    )}
                    <span className="sr-only">Kirim pesan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2 px-2 text-center text-[11px] text-base-content/50 sm:hidden">
          PostIt AI dapat membuat kesalahan. Periksa informasi penting.
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
