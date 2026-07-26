'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Props for ChatInput component
 */
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  textareaRows?: number;
}

const MAX_HEIGHT_PX = 200;

/**
 * Chat input with an auto-growing textarea.
 *
 * The file previously carried a second, unused `AutoResizingTextarea`
 * component plus a duplicate keydown handler and a `setTimeout(…, 0)` resize
 * hack — all dead. Height is now driven by one layout effect against the ref,
 * so it settles before paint instead of one frame late.
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Tanya sesuatu...',
  textareaRows = 1,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Collapse first so shrinking works, then grow to fit.
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  };

  const canSend = Boolean(value.trim()) && !disabled;

  return (
    <div
      className={`
      flex items-end gap-2 p-2 rounded-xl transition-all duration-200
      ${
        isFocused
          ? 'bg-card border border-primary ring-2 ring-primary/10'
          : 'bg-muted border border-border'
      }
    `}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={textareaRows}
        className="w-full max-h-50 bg-transparent border-0 focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground resize-none p-0 leading-relaxed"
      />
      <button
        onClick={onSend}
        disabled={!canSend}
        className={`
          shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
          ${
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary active:scale-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }
        `}
        aria-label="Kirim pesan"
      >
        <ArrowUp className="size-5" />
      </button>
    </div>
  );
}
