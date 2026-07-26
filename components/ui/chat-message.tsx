'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Card } from './card';

/**
 * Source citation for RAG
 */
export interface SourceCitation {
  id: string;
  type: 'faq' | 'sop';
  title: string;
  content: string;
  score: number;
  chunkIndex?: number;
}

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  feedback?: 'thumbs_up' | 'thumbs_down' | null;
  createdAt?: string;
}

/**
 * Chat message component
 */
export function ChatMessage({
  message,
  visitorId,
}: {
  message: ChatMessage;
  visitorId?: string;
}) {
  const [feedback, setFeedback] = useState(message.feedback || null);
  const [showSources, setShowSources] = useState(false);

  const isUser = message.role === 'user';

  // A message only becomes ratable once the server has persisted it and sent
  // its id back in the `done` frame.
  const canGiveFeedback = !isUser && Boolean(message.id) && Boolean(visitorId);

  const handleFeedback = async (type: 'thumbs_up' | 'thumbs_down') => {
    const previous = feedback;
    setFeedback(type); // optimistic

    try {
      const res = await fetch(`/api/feedback/${message.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: type, visitorId }),
      });
      if (!res.ok) throw new Error(`Feedback failed: ${res.status}`);
    } catch (err) {
      console.error(err);
      setFeedback(previous); // roll back so the UI does not claim a saved rating
    }
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
          isUser ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface border border-outline-variant'
        }`}>
          {isUser ? (
            <span className="material-symbols-outlined text-[18px]">person</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]"> smart_toy </span>
          )}
        </div>

        {/* Message content */}
        <div className="flex flex-col gap-2">
          {/* Message bubble */}
          <Card className={`p-4 rounded-xl ${
            isUser 
              ? 'bg-primary text-on-primary' 
              : 'bg-surface text-on-surface border border-outline-variant'
          }`}>
            <div className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </Card>

          {/* Sources accordion */}
          {message.sources && message.sources.length > 0 && (
            <div className="w-full">
              <button
                onClick={() => setShowSources(!showSources)}
                className="text-label-sm text-primary hover:text-primary/70 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showSources ? 'expand_less' : 'expand_more'}
                </span>
                {showSources ? 'Hide sources' : `${message.sources.length} source${message.sources.length > 1 ? 's' : ''}`}
              </button>

              {showSources && (
                <div className="mt-2 space-y-2">
                  {message.sources.map((source) => (
                    <div 
                      key={source.id} 
                      className={`text-body-sm p-3 rounded-lg border ${
                        source.type === 'faq'
                          ? 'bg-primary/10 border-primary/20 text-on-surface'
                          : 'bg-secondary-container/50 border-secondary-container/30 text-on-surface-variant'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          source.type === 'faq' ? 'default' : 'secondary'
                        }>
                          {source.type.toUpperCase()}
                        </Badge>
                        <span className="font-medium truncate max-w-[200px]">
                          {source.title}
                        </span>
                        <span className="text-xs opacity-60 ml-auto">
                          {(source.score * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <div className="text-sm opacity-80 line-clamp-2">
                        {source.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feedback buttons */}
          {canGiveFeedback && (
            <div className="flex gap-2 mt-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 hover:text-emerald-600 ${
                  feedback === 'thumbs_up' ? 'text-emerald-600' : 'text-on-surface-variant'
                }`}
                onClick={() => handleFeedback('thumbs_up')}
                title="Jawaban membantu"
                aria-pressed={feedback === 'thumbs_up'}
              >
                <span className="material-symbols-outlined text-[16px]">thumb_up</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 hover:text-red-600 ${
                  feedback === 'thumbs_down' ? 'text-red-600' : 'text-on-surface-variant'
                }`}
                onClick={() => handleFeedback('thumbs_down')}
                title="Jawaban kurang tepat"
                aria-pressed={feedback === 'thumbs_down'}
              >
                <span className="material-symbols-outlined text-[16px]">thumb_down</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}