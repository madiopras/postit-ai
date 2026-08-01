'use client';

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { AlertCircle, ArrowLeft, Bot, Lock, LogIn, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatThemeToggle } from '@/components/chat/chat-theme-toggle';
import {
  Button,
  ButtonLink,
} from '@/components/untitled/base/buttons/button';
import { Input } from '@/components/untitled/base/input/input';
import { getStoredVisitorId } from '@/hooks/use-visitor-id';
import {
  AuthClientError,
  consumeHistoryMergeWarning,
  loginAccount,
  mergeVisitorHistory,
  safeRedirectPath,
  storeHistoryMergeWarning,
} from '@/lib/auth-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get('redirect'));
  const usernameRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => usernameRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      await loginAccount(username.trim(), password);

      const visitorId = getStoredVisitorId();
      if (visitorId) {
        try {
          await mergeVisitorHistory(visitorId);
          consumeHistoryMergeWarning();
        } catch {
          storeHistoryMergeWarning();
        }
      }

      router.replace(redirect);
      router.refresh();
    } catch (caught) {
      setError(loginErrorMessage(caught));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ui-surface relative flex min-h-screen min-h-dvh items-center justify-center bg-bg-secondary px-4 py-10 text-fg-primary">
      <ChatThemeToggle className="absolute right-4 top-4 size-10 min-h-10 p-0" />

      <div className="w-full max-w-[400px]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-ui-xl bg-brand-solid text-fg-on-brand shadow-ui-sm">
            <Bot className="size-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-fg-primary">PostIt AI</p>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg-primary">
            Masuk ke akun Anda
          </h1>
          <p className="mt-2 text-sm leading-6 text-fg-tertiary">
            Akses SOP internal dan lanjutkan riwayat percakapan akun Anda.
          </p>
        </div>

        <div className="rounded-ui-xl border border-border-secondary bg-bg-primary p-6 shadow-ui-lg sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              placeholder="Masukkan username"
              value={username}
              onChange={setUsername}
              leadingIcon={<User />}
              autoComplete="username"
              inputRef={usernameRef}
              isRequired
              isDisabled={loading}
            />

            <Input
              label="Kata sandi"
              placeholder="Masukkan kata sandi"
              type="password"
              value={password}
              onChange={setPassword}
              leadingIcon={<Lock />}
              autoComplete="current-password"
              isRequired
              isDisabled={loading}
            />

            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="flex items-start gap-2.5 rounded-ui-md border border-error-border bg-error-bg px-3.5 py-3 text-sm text-error-fg outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring"
              >
                <AlertCircle className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              iconLeading={<LogIn />}
              className="w-full"
            >
              {loading ? 'Menyiapkan akun...' : 'Masuk'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <ButtonLink
            href="/"
            variant="link"
            size="sm"
            iconLeading={<ArrowLeft />}
          >
            Kembali ke chat publik
          </ButtonLink>
          <p className="mt-4 text-xs text-fg-quaternary">
            Akses akun hanya untuk pengguna yang telah terdaftar.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginPageLoading() {
  return (
    <main
      className="ui-surface flex min-h-screen min-h-dvh items-center justify-center bg-bg-secondary"
      aria-label="Memuat halaman login"
    >
      <div className="flex flex-col items-center gap-4" role="status">
        <div className="flex size-14 animate-pulse items-center justify-center rounded-ui-xl bg-brand-solid text-fg-on-brand">
          <Bot className="size-7" aria-hidden="true" />
        </div>
        <span className="text-sm text-fg-tertiary">Memuat halaman login...</span>
      </div>
    </main>
  );
}

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof AuthClientError)) {
    return 'Jaringan bermasalah. Periksa koneksi lalu coba lagi.';
  }
  if (error.code === 'ACCOUNT_BLOCKED') {
    return 'Akun Anda diblokir. Hubungi administrator.';
  }
  if (error.code === 'ACCOUNT_INACTIVE') {
    return 'Akun Anda tidak aktif. Hubungi administrator.';
  }
  if (error.status === 401) return 'Username atau kata sandi salah.';
  return 'Login gagal. Silakan coba lagi.';
}
