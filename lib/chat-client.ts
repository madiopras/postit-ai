import { parseSseStream } from '@/lib/sse';

export type ChatRole = 'user' | 'assistant';
export type ChatFeedback = 'thumbs_up' | 'thumbs_down';
export type ChatMessageDeliveryState = 'streaming' | 'complete' | 'error';

export interface SourceCitation {
  id: string;
  type: 'faq' | 'sop';
  title: string;
  content: string;
  score: number;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatMessageData {
  id?: string;
  role: ChatRole;
  content: string;
  sources?: SourceCitation[];
  feedback?: ChatFeedback | null;
  loginRequired?: boolean;
  createdAt?: string;
  /** Client-only rendering state; never sent to or persisted by the API. */
  deliveryState?: ChatMessageDeliveryState;
}

export interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendChatRequest {
  messages: Array<Pick<ChatMessageData, 'role' | 'content'>>;
  visitorId: string;
  chatId?: string;
}

export type ChatStreamEvent =
  | { type: 'content'; content: string }
  | { type: 'status'; status: string }
  | { type: 'login_required'; message: string }
  | {
      type: 'done';
      chatId?: string;
      messageId?: string;
      sources: SourceCitation[];
      loginRequired: boolean;
    };

interface ChatClientOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

interface StreamChatOptions extends ChatClientOptions {
  onEvent: (event: ChatStreamEvent) => void;
}

type JsonRecord = Record<string, unknown>;

export class ChatClientError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ChatClientError';
    this.status = status;
  }
}

export async function fetchChatSessions(
  visitorId: string,
  options: ChatClientOptions = {}
): Promise<ChatSession[]> {
  const response = await getFetcher(options)(
    `/api/chat/sessions?visitorId=${encodeURIComponent(visitorId)}`,
    { signal: options.signal }
  );

  if (!response.ok) {
    throw await responseError(response, 'Gagal memuat riwayat percakapan');
  }

  const body = asRecord(await readJson(response));
  const data = Array.isArray(body?.data) ? body.data : [];
  return data.flatMap((value) => {
    const session = parseSession(value);
    return session ? [session] : [];
  });
}

export async function fetchChatSession(
  chatId: string,
  visitorId: string,
  options: ChatClientOptions = {}
): Promise<ChatMessageData[]> {
  const response = await getFetcher(options)(
    `/api/chat/sessions/${encodeURIComponent(chatId)}?visitorId=${encodeURIComponent(visitorId)}`,
    { signal: options.signal }
  );

  if (!response.ok) {
    throw await responseError(response, 'Percakapan tidak ditemukan');
  }

  const body = asRecord(await readJson(response));
  const data = asRecord(body?.data);
  const messages = Array.isArray(data?.messages) ? data.messages : [];

  return messages.flatMap((value) => {
    const message = parseMessage(value);
    return message ? [message] : [];
  });
}

export async function deleteChatSession(
  chatId: string,
  visitorId: string,
  options: ChatClientOptions = {}
): Promise<void> {
  const response = await getFetcher(options)(
    `/api/chat/sessions/${encodeURIComponent(chatId)}?visitorId=${encodeURIComponent(visitorId)}`,
    { method: 'DELETE', signal: options.signal }
  );

  if (!response.ok) {
    throw await responseError(response, 'Gagal menghapus percakapan');
  }
}

export async function submitChatFeedback(
  messageId: string,
  feedback: ChatFeedback | null,
  visitorId: string,
  options: ChatClientOptions = {}
): Promise<void> {
  const response = await getFetcher(options)(`/api/feedback/${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback, visitorId }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw await responseError(response, 'Gagal menyimpan feedback');
  }
}

export async function streamChat(
  request: SendChatRequest,
  options: StreamChatOptions
): Promise<void> {
  const response = await getFetcher(options)('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    throw await responseError(response, 'Gagal menghubungi server');
  }

  for await (const frame of parseSseStream(response.body)) {
    const payload = parseFramePayload(frame.data);
    if (!payload) continue;

    if (frame.event === 'error') {
      throw new ChatClientError(readString(payload.message) ?? 'Terjadi kesalahan');
    }

    if (frame.event === 'done') {
      options.onEvent({
        type: 'done',
        chatId: readString(payload.chatId) ?? undefined,
        messageId: readString(payload.messageId) ?? undefined,
        sources: parseSources(payload.sources),
        loginRequired: payload.loginRequired === true,
      });
      continue;
    }

    if (frame.event === 'login_required') {
      options.onEvent({
        type: 'login_required',
        message:
          readString(payload.message) ?? 'Silakan login untuk mengakses SOP ini.',
      });
      continue;
    }

    if (frame.event === 'status') {
      const status = readString(payload.type);
      if (status) options.onEvent({ type: 'status', status });
      continue;
    }

    const content = readString(payload.content);
    if (frame.event === 'message' && content !== null) {
      options.onEvent({ type: 'content', content });
    }
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function getFetcher(options: ChatClientOptions): typeof fetch {
  return options.fetcher ?? fetch;
}

async function responseError(response: Response, fallback: string): Promise<ChatClientError> {
  const body = asRecord(await readJson(response));
  const error = asRecord(body?.error);
  return new ChatClientError(readString(error?.message) ?? fallback, response.status);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseFramePayload(data: string): JsonRecord | null {
  try {
    return asRecord(JSON.parse(data));
  } catch {
    return null;
  }
}

function parseSession(value: unknown): ChatSession | null {
  const session = asRecord(value);
  const id = readString(session?.id);
  const createdAt = readString(session?.createdAt);
  const updatedAt = readString(session?.updatedAt);
  if (!id || !createdAt || !updatedAt) return null;

  return {
    id,
    title: readString(session?.title),
    createdAt,
    updatedAt,
  };
}

function parseMessage(value: unknown): ChatMessageData | null {
  const message = asRecord(value);
  if (!message) return null;

  const role = message?.role;
  const content = readString(message?.content);
  if ((role !== 'user' && role !== 'assistant') || content === null) return null;

  const feedback = message?.feedback;
  return {
    id: readString(message.id) ?? undefined,
    role,
    content,
    sources: parseSources(message.sources),
    feedback:
      feedback === 'thumbs_up' || feedback === 'thumbs_down' ? feedback : null,
    loginRequired: message.loginRequired === true,
    createdAt: readString(message.createdAt) ?? undefined,
    deliveryState: 'complete',
  };
}

function parseSources(value: unknown): SourceCitation[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const source = asRecord(item);
    if (!source) return [];

    const id = readString(source?.id);
    const type = source?.type;
    const title = readString(source?.title);
    const content = readString(source?.content);
    const score = typeof source?.score === 'number' ? source.score : null;

    if (
      !id ||
      (type !== 'faq' && type !== 'sop') ||
      title === null ||
      content === null ||
      score === null
    ) {
      return [];
    }

    const citation: SourceCitation = { id, type, title, content, score };
    if (typeof source.chunkIndex === 'number') citation.chunkIndex = source.chunkIndex;
    const metadata = asRecord(source.metadata);
    if (metadata) citation.metadata = metadata;
    return [citation];
  });
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
