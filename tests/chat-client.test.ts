import { describe, expect, it, vi } from 'vitest';
import {
  ChatClientError,
  fetchChatSessions,
  streamChat,
  submitChatFeedback,
  type ChatStreamEvent,
} from '@/lib/chat-client';

function sseResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('chat client', () => {
  it('loads and validates session data at the network boundary', async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(
      Response.json({
        data: [
          {
            id: 'session-1',
            title: null,
            createdAt: '2026-08-01T01:00:00.000Z',
            updatedAt: '2026-08-01T02:00:00.000Z',
          },
          { id: 'invalid-session-without-dates' },
        ],
      })
    );

    const sessions = await fetchChatSessions('visitor / one', { fetcher });

    expect(sessions).toEqual([
      {
        id: 'session-1',
        title: null,
        createdAt: '2026-08-01T01:00:00.000Z',
        updatedAt: '2026-08-01T02:00:00.000Z',
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/chat/sessions?visitorId=visitor%20%2F%20one',
      { signal: undefined }
    );
  });

  it('maps content, status, login-required, and done SSE frames', async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(
      sseResponse(
        [
          'event: status\ndata: {"type":"retrieving"}\n\n',
          'data: {"content":"Halo "}\n\n',
          'event: login_required\ndata: {"message":"Silakan login"}\n\n',
          'event: done\ndata: {"chatId":"chat-1","messageId":"message-1","sources":[{"id":"faq-1","type":"faq","title":"Reset","content":"Langkah reset","score":0.9}],"loginRequired":true}\n\n',
        ].join('')
      )
    );
    const events: ChatStreamEvent[] = [];

    await streamChat(
      {
        visitorId: 'visitor-1',
        messages: [{ role: 'user', content: 'Halo' }],
      },
      { fetcher, onEvent: (event) => events.push(event) }
    );

    expect(events).toEqual([
      { type: 'status', status: 'retrieving' },
      { type: 'content', content: 'Halo ' },
      { type: 'login_required', message: 'Silakan login' },
      {
        type: 'done',
        chatId: 'chat-1',
        messageId: 'message-1',
        sources: [
          {
            id: 'faq-1',
            type: 'faq',
            title: 'Reset',
            content: 'Langkah reset',
            score: 0.9,
          },
        ],
        loginRequired: true,
      },
    ]);
  });

  it('surfaces the server error message and status', async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(
      Response.json(
        { error: { message: 'Terlalu banyak permintaan' } },
        { status: 429 }
      )
    );

    const error = await fetchChatSessions('visitor-1', { fetcher }).catch(
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(ChatClientError);
    expect(error).toMatchObject({ message: 'Terlalu banyak permintaan', status: 429 });
  });

  it('propagates AbortError when its request is cancelled', async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        })
    );
    const controller = new AbortController();

    const pending = fetchChatSessions('visitor-1', {
      fetcher,
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('keeps feedback persistence outside the message presentation', async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValue(Response.json({ success: true }));

    await submitChatFeedback('message/1', 'thumbs_up', 'visitor-1', { fetcher });

    expect(fetcher).toHaveBeenCalledWith(
      '/api/feedback/message%2F1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ feedback: 'thumbs_up', visitorId: 'visitor-1' }),
      })
    );
  });
});
