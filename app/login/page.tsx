'use client';

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { AlertCircle, ArrowLeft, Lock, LogIn, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostItLogo } from '@/components/brand/postit-logo';
import { ChatThemeToggle } from '@/components/chat/chat-theme-toggle';
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
    <main className="relative flex min-h-screen min-h-dvh items-center justify-center bg-base-200/50 px-4 py-10 text-base-content">
      <ChatThemeToggle className="absolute right-4 top-4 size-10 min-h-10 p-0" />

      <div className="w-full max-w-[400px]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-base-100 shadow-sm ring-1 ring-base-300">
            <PostItLogo size={40} className="size-10" />
          </div>
          <p className="text-base font-bold text-base-content">PostIt AI</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-base-content">
            Masuk ke akun Anda
          </h1>
          <p className="mt-2 text-sm leading-6 text-base-content/70">
            Akses SOP internal dan lanjutkan riwayat percakapan akun Anda.
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-base-100 p-6 shadow-lg sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label text-xs font-semibold text-base-content/80">
                <span>Username</span>
              </label>
              <div className="input input-bordered flex items-center gap-2">
                <User className="size-4 text-base-content/40" />
                <input
                  ref={usernameRef}
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="grow text-sm"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label text-xs font-semibold text-base-content/80">
                <span>Kata sandi</span>
              </label>
              <div className="input input-bordered flex items-center gap-2">
                <Lock className="size-4 text-base-content/40" />
                <input
                  type="password"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="grow text-sm"
                />
              </div>
            </div>

            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="alert alert-error text-xs p-3 shadow-xs"
              >
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2 gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <LogIn className="size-4" />
              )}
              <span>{loading ? 'Menyiapkan akun...' : 'Masuk'}</span>
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="btn btn-link btn-sm text-base-content/70 hover:text-primary gap-1 font-normal no-underline hover:underline"
          >
            <ArrowLeft className="size-4" />
            <span>Kembali ke chat publik</span>
          </Link>
          <p className="mt-3 text-xs text-base-content/50">
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
      className="flex min-h-screen min-h-dvh items-center justify-center bg-base-200/50"
      aria-label="Memuat halaman login"
    >
      <div className="flex flex-col items-center gap-4" role="status">
        <div className="flex size-14 animate-pulse items-center justify-center overflow-hidden rounded-2xl bg-base-100 ring-1 ring-base-300">
          <PostItLogo size={40} className="size-10" />
        </div>
        <span className="text-sm text-base-content/70">Memuat halaman login...</span>
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
