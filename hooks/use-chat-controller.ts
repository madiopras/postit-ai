'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteChatSession,
  fetchChatSession,
  fetchChatSessions,
  isAbortError,
  streamChat,
  submitChatFeedback,
  type ChatFeedback,
  type ChatMessageData,
  type ChatSession,
  type ChatStreamEvent,
} from '@/lib/chat-client';
import { RequestSequence } from '@/lib/request-sequence';

export interface ChatController {
  visitorId: string;
  ready: boolean;
  messages: ChatMessageData[];
  input: string;
  loading: boolean;
  chatStatus:
    | 'idle'
    | 'submitting'
    | 'streaming'
    | 'complete'
    | 'error'
    | 'login-required';
  chatId: string | null;
  conversationVersion: number;
  sessions: ChatSession[];
  sessionsStatus: 'loading' | 'ready' | 'error';
  sessionsError: string | null;
  deletingSessionId: string | null;
  deleteSessionError: string | null;
  error: string | null;
  setInput: (value: string) => void;
  send: () => Promise<boolean>;
  startNewChat: () => void;
  selectSession: (chatId: string) => Promise<void>;
  retrySessions: () => Promise<void>;
  deleteSession: (chatId: string) => Promise<boolean>;
  clearDeleteSessionError: () => void;
  submitFeedback: (
    messageId: string,
    feedback: ChatFeedback | null
  ) => Promise<void>;
}

export function useChatController({
  visitorId,
  identityReady,
}: {
  visitorId: string;
  identityReady: boolean;
}): ChatController {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatController['chatStatus']>('idle');
  const [chatId, setChatId] = useState<string | null>(null);
  const [conversationVersion, setConversationVersion] = useState(0);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsStatus, setSessionsStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deleteSessionError, setDeleteSessionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationRequests] = useState(() => new RequestSequence());
  const [sessionListRequests] = useState(() => new RequestSequence());

  const refreshSessions = useCallback(async () => {
    if (!visitorId || !identityReady) return;

    const request = sessionListRequests.begin();
    try {
      const nextSessions = await fetchChatSessions(visitorId, { signal: request.signal });
      if (request.isCurrent()) {
        setSessions(nextSessions);
        setSessionsStatus('ready');
        setSessionsError(null);
      }
    } catch (caught) {
      if (!isAbortError(caught) && request.isCurrent()) {
        setSessionsError('Riwayat percakapan tidak dapat dimuat.');
        setSessionsStatus((current) => (current === 'loading' ? 'error' : current));
      }
    }
  }, [identityReady, sessionListRequests, visitorId]);

  useEffect(() => {
    if (!visitorId || !identityReady) return;

    const request = sessionListRequests.begin();
    fetchChatSessions(visitorId, { signal: request.signal })
      .then((nextSessions) => {
        if (request.isCurrent()) {
          setSessions(nextSessions);
          setSessionsStatus('ready');
          setSessionsError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!isAbortError(caught) && request.isCurrent()) {
          setSessionsError('Riwayat percakapan tidak dapat dimuat.');
          setSessionsStatus('error');
        }
      });

    return () => {
      if (request.isCurrent()) sessionListRequests.invalidate();
    };
  }, [identityReady, sessionListRequests, visitorId]);

  useEffect(
    () => () => {
      conversationRequests.invalidate();
      sessionListRequests.invalidate();
    },
    [conversationRequests, sessionListRequests]
  );

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || loading || !visitorId || !identityReady) return false;

    const userMessage: ChatMessageData = {
      role: 'user',
      content: question,
      deliveryState: 'complete',
    };
    const history = [...messages, userMessage];
    const request = conversationRequests.begin();

    setMessages([
      ...history,
      { role: 'assistant', content: '', deliveryState: 'streaming' },
    ]);
    setInput('');
    setLoading(true);
    setChatStatus('submitting');
    setError(null);

    let answer = '';
    let receivedDone = false;
    let loginRequiredAnswer: string | null = null;
    const updateAssistant = (patch: Partial<ChatMessageData>) => {
      if (!request.isCurrent()) return;

      setMessages((current) => {
        const copy = [...current];
        const last = copy.length - 1;
        if (last >= 0 && copy[last].role === 'assistant') {
          copy[last] = { ...copy[last], ...patch };
        }
        return copy;
      });
    };

    const handleStreamEvent = (event: ChatStreamEvent) => {
      if (!request.isCurrent()) return;

      if (event.type === 'content') {
        setChatStatus('streaming');
        if (loginRequiredAnswer && event.content === loginRequiredAnswer) return;
        answer += event.content;
        updateAssistant({ content: answer, deliveryState: 'streaming' });
        return;
      }

      if (event.type === 'login_required') {
        setChatStatus('login-required');
        loginRequiredAnswer = event.message;
        answer = event.message;
        updateAssistant({
          content: event.message,
          loginRequired: true,
          deliveryState: 'streaming',
        });
        return;
      }

      if (event.type === 'done') {
        receivedDone = true;
        setChatStatus(event.loginRequired ? 'login-required' : 'complete');
        if (event.chatId) setChatId(event.chatId);
        updateAssistant({
          id: event.messageId,
          sources: event.sources,
          loginRequired: event.loginRequired,
          deliveryState: 'complete',
        });
      }
    };

    try {
      await streamChat(
        {
          messages: history.map(({ role, content }) => ({ role, content })),
          visitorId,
          chatId: chatId ?? undefined,
        },
        {
          signal: request.signal,
          onEvent: handleStreamEvent,
        }
      );

      if (!receivedDone) {
        throw new Error('Streaming response ended before completion');
      }

      if (request.isCurrent()) {
        void refreshSessions();
        return true;
      }
    } catch (caught) {
      if (!isAbortError(caught) && request.isCurrent()) {
        setChatStatus('error');
        setError(
          'Jawaban tidak dapat dimuat. Pertanyaan Anda tetap terlihat dan aman untuk dikirim ulang.'
        );
        setMessages((current) =>
          current.length && current[current.length - 1].content === ''
            ? current.slice(0, -1)
            : current.map((message, index) =>
                index === current.length - 1 && message.role === 'assistant'
                  ? { ...message, deliveryState: 'error' }
                  : message
              )
        );
      }
    } finally {
      if (request.isCurrent()) {
        setLoading(false);
      }
    }

    return false;
  }, [
    chatId,
    conversationRequests,
    input,
    identityReady,
    loading,
    messages,
    refreshSessions,
    visitorId,
  ]);

  const startNewChat = useCallback(() => {
    conversationRequests.invalidate();
    setMessages([]);
    setChatId(null);
    setConversationVersion((current) => current + 1);
    setInput('');
    setLoading(false);
    setChatStatus('idle');
    setError(null);
  }, [conversationRequests]);

  const selectSession = useCallback(
    async (selectedChatId: string) => {
      if (!visitorId || !identityReady || selectedChatId === chatId) return;

      const request = conversationRequests.begin();
      setLoading(true);
      setChatStatus('idle');
      setError(null);

      try {
        const history = await fetchChatSession(selectedChatId, visitorId, {
          signal: request.signal,
        });

        if (!request.isCurrent()) return;
        setMessages(history);
        setChatId(selectedChatId);
        setConversationVersion((current) => current + 1);
      } catch (caught) {
        if (!isAbortError(caught) && request.isCurrent()) {
          setError(errorMessage(caught, 'Gagal memuat percakapan'));
        }
      } finally {
        if (request.isCurrent()) setLoading(false);
      }
    },
    [chatId, conversationRequests, identityReady, visitorId]
  );

  const deleteSession = useCallback(
    async (targetChatId: string) => {
      if (!visitorId || !identityReady || deletingSessionId) return false;

      setDeletingSessionId(targetChatId);
      setDeleteSessionError(null);
      try {
        await deleteChatSession(targetChatId, visitorId);
        if (targetChatId === chatId) startNewChat();
        await refreshSessions();
        return true;
      } catch {
        setDeleteSessionError('Percakapan tidak dapat dihapus. Coba lagi.');
        return false;
      } finally {
        setDeletingSessionId((current) =>
          current === targetChatId ? null : current
        );
      }
    },
    [
      chatId,
      deletingSessionId,
      identityReady,
      refreshSessions,
      startNewChat,
      visitorId,
    ]
  );

  const retrySessions = useCallback(async () => {
    setSessionsStatus('loading');
    setSessionsError(null);
    await refreshSessions();
  }, [refreshSessions]);

  const clearDeleteSessionError = useCallback(() => {
    setDeleteSessionError(null);
  }, []);

  const submitFeedback = useCallback(
    async (messageId: string, feedback: ChatFeedback | null) => {
      if (!visitorId || !identityReady) {
        throw new Error('Chat identity is not available');
      }

      await submitChatFeedback(messageId, feedback, visitorId);
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, feedback } : message
        )
      );
    },
    [identityReady, visitorId]
  );

  return {
    visitorId,
    ready: Boolean(visitorId) && identityReady,
    messages,
    input,
    loading,
    chatStatus,
    chatId,
    conversationVersion,
    sessions,
    sessionsStatus,
    sessionsError,
    deletingSessionId,
    deleteSessionError,
    error,
    setInput,
    send,
    startNewChat,
    selectSession,
    retrySessions,
    deleteSession,
    clearDeleteSessionError,
    submitFeedback,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
