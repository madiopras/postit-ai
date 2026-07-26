'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/components/ui/chat-message';
import { ChatInput } from '@/components/ui/chat-input';
import { ChatSidebar } from '@/components/ui/chat-sidebar';

interface ChatSession {
  id: string;
  title: string;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  sources?: any[];
  feedback?: string;
}


export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await fetch('/api/chat/sessions');
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setSessions(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    };
    loadSessions();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    
    const currentInput = input;
    setInput('');
    setLoading(true);

    // Create session if not exists
    if (!sessionId) {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          sessionId: sessionId || undefined,
        }),
      });

      if (!res.body) {
        setLoading(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';
      
      // Add empty assistant message placeholder
      setMessages((m) => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const json = line.slice(6).trim();
          if (!json || json === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(json);
            
            // Handle status events
            if (parsed.event) {
              if (parsed.event === 'done' && parsed.data?.usage) {
                // Update message with usage info
              }
              continue;
            }
            
            // Handle content chunks
            if (parsed.content) {
              assistantMsg += parsed.content;
            }
            
            // Update message
            setMessages((m) => {
              const copy = [...m];
              if (copy.length > 1) {
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantMsg };
              }
              return copy;
            });
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
      
      // Reload sessions to get updated list
      try {
        const sessRes = await fetch('/api/chat/sessions');
        if (sessRes.ok) {
          const data = await sessRes.json();
          if (data.data) {
            setSessions(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to reload sessions:', err);
      }

    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId('');
    setInput('');
  };

  const handleSelectSession = (selSessionId: string) => {
    // Load messages for selected session
    setSessionId(selSessionId);
    setLoading(true);
    
    fetch(`/api/chat/sessions?sessionId=${selSessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.data?.[0]) {
          setSessionId(data.data[0].sessionId || '');
        }
      });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar (Desktop) */}
      <div className="w-64 hidden md:flex flex-col border-r border-outline-variant bg-surface">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={sessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onClearHistory={() => {
            setMessages([]);
            setSessionId('');
          }}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-outline-variant bg-surface flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-2xl">smart_toy</span>
            </div>
            <span className="text-headline-sm text-on-surface">SimpleAI</span>
          </div>
          <button 
            onClick={handleNewChat} 
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface text-2xl">add</span>
          </button>
        </header>

        {/* Chat Canvas */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 flex flex-col gap-4"
        >
          {/* Date Divider */}
          <div className="flex justify-center my-4">
            <span className="text-label-sm text-on-surface-variant bg-surface-container py-2 px-4 rounded-full">
              Hari Ini
            </span>
          </div>

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
              <div className="w-20 h-20 bg-primary-container rounded-xl flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-on-primary text-5xl">smart_toy</span>
              </div>
              <div className="text-center">
                <h2 className="text-headline-md text-on-surface mb-2">Halo! Saya SimpleAI</h2>
                <p className="text-body-md text-on-surface-variant max-w-md">
                  Saya bisa membantu Anda dengan pertanyaan seputar SOP dan FAQ perusahaan.
                  Silakan tanyakan apa saja!
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                <button
                  onClick={() => setInput('Apa itu SOP?')}
                  className="bg-secondary-container text-on-secondary-container px-5 py-2.5 rounded-lg text-label-md hover:bg-secondary-fixed transition-colors"
                >
                  Apa itu SOP?
                </button>
                <button
                  onClick={() => setInput('Bagaimana cara menggunakan layanan ini?')}
                  className="bg-secondary-container text-on-secondary-container px-5 py-2.5 rounded-lg text-label-md hover:bg-secondary-fixed transition-colors"
                >
                  Cara Penggunaan
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m as any} />
          ))}

          {/* Loading state */}
          {loading && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </main>

        {/* Input Area (sticky bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface to-transparent pt-8 pb-4">
          <div className="px-4">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={loading}
              placeholder="Tanya sesuatu..."
            />
            <p className="text-label-sm text-on-surface-variant text-center mt-2 opacity-60">
              SimpleAI dapat membuat kesalahan. Periksa informasi penting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
