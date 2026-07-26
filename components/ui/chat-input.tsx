'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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

/**
 * Auto-resizing textarea component
 */
function AutoResizingTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  textareaRows = 1,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  textareaRows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={textareaRows}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
          }
        }
      }}
      className="w-full max-h-[200px] bg-transparent border-0 focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground resize-none p-0 leading-relaxed"
    />
  );
}

/**
 * Chat input component with auto-resize textarea and send button
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

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
  };

  const [height, setHeight] = useState<string>('auto');

  const handleAutoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setHeight(`${Math.min(textareaRef.current.scrollHeight, 200)}px`);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setHeight('auto');
    setTimeout(() => {
      if (e.target) {
        setHeight(`${Math.min(e.target.scrollHeight, 200)}px`);
      }
    }, 0);
  };

  return (
    <div className={`
      flex items-end gap-2 p-2 rounded-xl transition-all duration-200
      ${isFocused 
        ? 'bg-card border border-primary ring-2 ring-primary/10' 
        : 'bg-muted border border-border'}
    `}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={textareaRows}
        style={{ height }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
              onSend();
            }
          }
        }}
        className="w-full bg-transparent border-0 focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground resize-none p-0 leading-relaxed"
      />
      <button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
          ${!value.trim() || disabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary active:scale-90'}
        `}
        aria-label="Kirim pesan"
      >
        <ArrowUp className="size-5" />
      </button>
    </div>
  );
}