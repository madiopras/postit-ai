import type { UserRole, UserStatus } from '@/lib/schema';

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
}

interface ClientOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
}

type JsonRecord = Record<string, unknown>;

export const HISTORY_MERGE_WARNING_KEY = 'postit_history_merge_warning';

export class AuthClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AuthClientError';
    this.status = status;
    this.code = code;
  }
}

export async function fetchCurrentUser(
  options: ClientOptions = {}
): Promise<CurrentUser | null> {
  const response = await getFetcher(options)('/api/auth/me', {
    signal: options.signal,
  });
  const body = asRecord(await readJson(response));

  if (response.status === 401) return null;
  if (!response.ok) throw responseError(response, body, 'Profil tidak dapat dimuat.');

  const user = parseCurrentUser(asRecord(body?.data));
  if (!user) {
    throw new AuthClientError('Respons profil tidak valid.', response.status);
  }
  return user;
}

export async function loginAccount(
  username: string,
  password: string,
  options: ClientOptions = {}
): Promise<void> {
  const response = await getFetcher(options)('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal: options.signal,
  });
  const body = asRecord(await readJson(response));

  if (!response.ok) {
    throw responseError(response, body, 'Login gagal. Silakan coba lagi.');
  }
}

export async function mergeVisitorHistory(
  visitorId: string,
  options: ClientOptions = {}
): Promise<number> {
  const response = await getFetcher(options)('/api/chat/history/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId }),
    signal: options.signal,
  });
  const body = asRecord(await readJson(response));

  if (!response.ok) {
    throw responseError(
      response,
      body,
      'Riwayat visitor belum dapat digabungkan.'
    );
  }

  const data = asRecord(body?.data);
  return typeof data?.migratedCount === 'number' ? data.migratedCount : 0;
}

export async function logoutCurrentUser(
  options: ClientOptions = {}
): Promise<void> {
  const response = await getFetcher(options)('/api/auth/logout', {
    method: 'POST',
    signal: options.signal,
  });
  const body = asRecord(await readJson(response));

  if (!response.ok) {
    throw responseError(response, body, 'Logout gagal. Silakan coba lagi.');
  }
}

export function safeRedirectPath(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function storeHistoryMergeWarning(): void {
  try {
    window.sessionStorage.setItem(HISTORY_MERGE_WARNING_KEY, '1');
  } catch {
    // The warning is advisory; blocked storage must not block a valid login.
  }
}

export function consumeHistoryMergeWarning(): boolean {
  try {
    const hasWarning = window.sessionStorage.getItem(HISTORY_MERGE_WARNING_KEY) === '1';
    window.sessionStorage.removeItem(HISTORY_MERGE_WARNING_KEY);
    return hasWarning;
  } catch {
    return false;
  }
}

function parseCurrentUser(value: JsonRecord | null): CurrentUser | null {
  if (!value) return null;
  const { id, username, displayName, role, status } = value;
  if (
    typeof id !== 'string' ||
    typeof username !== 'string' ||
    (displayName !== null && typeof displayName !== 'string') ||
    (role !== 'super_admin' && role !== 'admin' && role !== 'user') ||
    (status !== 'active' && status !== 'inactive' && status !== 'blocked')
  ) {
    return null;
  }
  return { id, username, displayName, role, status };
}

function responseError(
  response: Response,
  body: JsonRecord | null,
  fallback: string
): AuthClientError {
  const nestedError = asRecord(body?.error);
  const message =
    readString(nestedError?.message) ?? readString(body?.error) ?? fallback;
  const code = readString(nestedError?.code) ?? readString(body?.code) ?? undefined;
  return new AuthClientError(message, response.status, code);
}

function getFetcher(options: ClientOptions): typeof fetch {
  return options.fetcher ?? fetch;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
