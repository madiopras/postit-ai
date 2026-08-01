'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const NEAR_BOTTOM_PX = 80;

export function useChatScroll(contentVersion: unknown, conversationVersion: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const measurePosition = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const isNearBottom = distanceFromBottom <= NEAR_BOTTOM_PX;
    isNearBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom && element.scrollHeight > element.clientHeight);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const element = scrollRef.current;
    if (!element) return;

    isNearBottomRef.current = true;
    setShowScrollToBottom(false);
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (isNearBottomRef.current) scrollToBottom('smooth');
      else measurePosition();
    });
    return () => cancelAnimationFrame(frame);
  }, [contentVersion, measurePosition, scrollToBottom]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollToBottom('auto'));
    return () => cancelAnimationFrame(frame);
  }, [conversationVersion, scrollToBottom]);

  return {
    scrollRef,
    showScrollToBottom,
    onScroll: measurePosition,
    scrollToBottom,
  };
}
