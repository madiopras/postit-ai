'use client';

import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './button';
import { Badge } from './badge';
import { Card } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { ASSISTANT_AVATAR, avatarForVisitor } from '@/lib/avatars';

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
  metadata?: Record<string, unknown>;
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

  // Each browser keeps the same face across reloads without anything being
  // stored — the chat has no accounts, and one shared face for every stranger
  // would read as if they were all the same person.
  const avatar = isUser ? avatarForVisitor(visitorId) : ASSISTANT_AVATAR;

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
        {/* Avatar — illustrated, with the lucide icon kept as the fallback for
            when the image has not loaded or the visitor id is not known yet. */}
        <Avatar className="shrink-0 size-8 mr-3 border border-border">
          <AvatarImage src={avatar?.src} alt={avatar?.label ?? ''} />
          <AvatarFallback
            className={isUser ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}
          >
            {isUser ? <User className="size-4.5" /> : <Bot className="size-4.5" />}
          </AvatarFallback>
        </Avatar>

        {/* Message content */}
        <div className="flex flex-col gap-2">
          {/* Message bubble */}
          <Card className={`p-4 rounded-xl ${
            isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-card text-foreground border border-border'
          }`}>
            {isUser ? (
              // A question is literal text — rendering it as markdown would let
              // stray asterisks or underscores silently reformat what was typed.
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
            ) : (
              // The model replies in markdown. This used to be whitespace-pre-wrap
              // too, so "**Forgot Password**" and bullet lists arrived on screen
              // as raw syntax.
              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1 prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            )}
          </Card>

          {/* Sources accordion */}
          {message.sources && message.sources.length > 0 && (
            <div className="w-full">
              <button
                onClick={() => setShowSources(!showSources)}
                className="text-xs font-medium text-primary hover:text-primary/70 flex items-center gap-1"
              >
                {showSources ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                {showSources ? 'Hide sources' : `${message.sources.length} source${message.sources.length > 1 ? 's' : ''}`}
              </button>

              {showSources && (
                <div className="mt-2 space-y-2">
                  {message.sources.map((source) => (
                    <div 
                      key={source.id} 
                      className={`text-xs p-3 rounded-lg border ${
                        source.type === 'faq'
                          ? 'bg-primary/10 border-primary/20 text-foreground'
                          : 'bg-secondary/50 border-secondary/40 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          source.type === 'faq' ? 'default' : 'secondary'
                        }>
                          {source.type.toUpperCase()}
                        </Badge>
                        <span className="font-medium truncate max-w-50">
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
                className={`h-6 w-6 hover:text-success ${
                  feedback === 'thumbs_up' ? 'text-success' : 'text-muted-foreground'
                }`}
                onClick={() => handleFeedback('thumbs_up')}
                title="Jawaban membantu"
                aria-pressed={feedback === 'thumbs_up'}
              >
                <ThumbsUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 hover:text-destructive ${
                  feedback === 'thumbs_down' ? 'text-destructive' : 'text-muted-foreground'
                }`}
                onClick={() => handleFeedback('thumbs_down')}
                title="Jawaban kurang tepat"
                aria-pressed={feedback === 'thumbs_down'}
              >
                <ThumbsDown className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
