'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, LogIn, Menu, Plus } from 'lucide-react';
import { ChatMessage, type SourceCitation } from '@/components/ui/chat-message';
import { ChatInput } from '@/components/ui/chat-input';
import { ChatSidebar, type ChatSession } from '@/components/ui/chat-sidebar';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useVisitorId } from '@/hooks/use-visitor-id';
import { parseSseStream } from '@/lib/sse';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  feedback?: 'thumbs_up' | 'thumbs_down' | null;
  loginRequired?: boolean;
}

/** Plain fetch, no state — so effects can call it without setting state directly. */
async function fetchSessions(visitorId: string): Promise<ChatSession[]> {
  const res = await fetch(`/api/chat/sessions?visitorId=${encodeURIComponent(visitorId)}`);
  if (!res.ok) return [];
  const body = await res.json();
  return body.data ?? [];
}

export default function Chat() {
  const visitorId = useVisitorId();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  /** Imperative refresh, used after sending a message or deleting a chat. */
  const refreshSessions = useCallback(async () => {
    if (!visitorId) return;
    try {
      setSessions(await fetchSessions(visitorId));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, [visitorId]);

  // Load the sidebar once a visitor id is available. `cancelled` guards against
  // a response landing after the id changed or the component unmounted.
  useEffect(() => {
    if (!visitorId) return;

    let cancelled = false;
    fetchSessions(visitorId)
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err) => console.error('Failed to load sessions:', err));

    return () => {
      cancelled = true;
    };
  }, [visitorId]);

  // Keep the newest message in view as it streams in.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading || !visitorId) return;

    const userMsg: Message = { role: 'user', content: question };
    const history = [...messages, userMsg];

    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    setError(null);

    // Mutate only the assistant placeholder appended above.
    const updateAssistant = (patch: Partial<Message>) => {
      setMessages((current) => {
        const copy = [...current];
        const last = copy.length - 1;
        if (last >= 0 && copy[last].role === 'assistant') {
          copy[last] = { ...copy[last], ...patch };
        }
        return copy;
      });
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          visitorId,
          chatId: chatId ?? undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Gagal menghubungi server');
      }

      let answer = '';

      for await (const frame of parseSseStream(res.body)) {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(frame.data);
        } catch {
          continue;
        }

        if (frame.event === 'error') {
          throw new Error((payload.message as string) ?? 'Terjadi kesalahan');
        }

        if (frame.event === 'done') {
          // The server assigns ids only after persisting, so citations and the
          // feedback target arrive with this final frame.
          if (payload.chatId) setChatId(payload.chatId as string);
          updateAssistant({
            id: (payload.messageId as string) ?? undefined,
            sources: (payload.sources as SourceCitation[]) ?? [],
            loginRequired: payload.loginRequired === true,
          });
          continue;
        }

        if (frame.event === 'login_required') {
          const message =
            typeof payload.message === 'string'
              ? payload.message
              : 'Silakan login untuk mengakses SOP ini.';
          answer = message;
          updateAssistant({ content: message, loginRequired: true });
          continue;
        }

        // Unnamed frames carry answer text; named 'status' frames are progress.
        if (frame.event === 'message' && typeof payload.content === 'string') {
          answer += payload.content;
          updateAssistant({ content: answer });
        }
      }

      await refreshSessions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(message);
      // Drop the empty placeholder so the error is not shown as a blank reply.
      setMessages((current) =>
        current.length && current[current.length - 1].content === ''
          ? current.slice(0, -1)
          : current
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setChatId(null);
    setInput('');
    setError(null);
  };

  const handleSelectSession = async (selectedChatId: string) => {
    if (!visitorId || selectedChatId === chatId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/chat/sessions/${selectedChatId}?visitorId=${encodeURIComponent(visitorId)}`
      );
      if (!res.ok) throw new Error('Percakapan tidak ditemukan');

      const body = await res.json();
      setMessages(
        (body.data?.messages ?? []).map((m: Message & { sources?: SourceCitation[] }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources ?? [],
          feedback: m.feedback ?? null,
          loginRequired: m.loginRequired === true,
        }))
      );
      setChatId(selectedChatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat percakapan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (targetChatId: string) => {
    if (!visitorId) return;
    try {
      await fetch(
        `/api/chat/sessions/${targetChatId}?visitorId=${encodeURIComponent(visitorId)}`,
        { method: 'DELETE' }
      );
      if (targetChatId === chatId) handleNewChat();
      await refreshSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const showTypingIndicator =
    loading && messages[messages.length - 1]?.role === 'assistant' &&
    messages[messages.length - 1]?.content === '';

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar (Desktop) */}
      <div className="w-64 hidden md:flex flex-col border-r border-border bg-card">
        <ChatSidebar
          sessions={sessions}
          activeChatId={chatId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Mobile Header — the sidebar is hidden below md, so history and the
            theme toggle are only reachable through this drawer. Without it a
            phone user could start new chats but never reopen an old one. */}
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger
                className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Buka riwayat chat"
              >
                <Menu className="size-6 text-foreground" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Riwayat chat</SheetTitle>
                <ChatSidebar
                  sessions={sessions}
                  activeChatId={chatId}
                  onNewChat={handleNewChat}
                  onSelectSession={handleSelectSession}
                  onDeleteSession={handleDeleteSession}
                />
              </SheetContent>
            </Sheet>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="size-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">PostIt AI</span>
          </div>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Plus className="size-6 text-foreground" />
          </button>
        </header>

        {/* Chat Canvas */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 flex flex-col gap-4"
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
              <div className="w-20 h-20 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <Bot className="size-12 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Halo! Saya PostIt AI</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Saya bisa membantu Anda dengan pertanyaan seputar SOP dan FAQ perusahaan.
                  Silakan tanyakan apa saja!
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                <button
                  onClick={() => setInput('Bagaimana cara reset password?')}
                  className="bg-secondary text-secondary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Reset password
                </button>
                <button
                  onClick={() => setInput('Bagaimana prosedur refund?')}
                  className="bg-secondary text-secondary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Prosedur refund
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <ChatMessage
              key={m.id ?? `${m.role}-${i}`}
              message={{
                id: m.id ?? '',
                role: m.role,
                content: m.content,
                sources: m.sources,
                feedback: m.feedback ?? null,
              }}
              visitorId={visitorId}
            />
          ))}

          {/* Typing indicator */}
          {showTypingIndicator && (
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-xl p-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mx-auto max-w-md w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {messages[messages.length - 1]?.loginRequired && (
            <div className="flex justify-start pl-11">
              <a
                href="/login?redirect=/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <LogIn className="size-4" />
                Login untuk membuka SOP
              </a>
            </div>
          )}
        </main>

        {/* Input Area (sticky bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4">
          <div className="px-4">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={loading || !visitorId}
              placeholder="Tanya sesuatu..."
            />
            <p className="text-xs font-medium text-muted-foreground text-center mt-2 opacity-60">
              PostIt AI dapat membuat kesalahan. Periksa informasi penting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
