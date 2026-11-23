'use client';

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  User,
} from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-base-100 px-4 py-10 text-base-content">
      {/* Signature Utarasu top accent & ambient backdrop */}
      <div
        className="utarasu-ulos-bar pointer-events-none fixed inset-x-0 top-0 z-30 h-[2.5px]"
        aria-hidden="true"
      />
      <div
        className="utarasu-ambient-glow pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="utarasu-ulos-weave pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_68%)]"
        aria-hidden="true"
      />

      <ChatThemeToggle className="absolute right-4 top-4 z-20 size-10 min-h-10 rounded-xl border border-base-300/80 bg-base-100/80 p-0 shadow-2xs backdrop-blur-md" />

      <div className="relative z-10 w-full max-w-[408px]">
        <div className="mb-7 text-center">
          <div className="relative mx-auto mb-4 flex size-16 items-center justify-center overflow-hidden rounded-[20px] border border-base-300 bg-base-100 shadow-md ring-4 ring-primary/5">
            <PostItLogo size={44} className="size-11" priority />
            <span
              className="utarasu-ulos-bar absolute inset-x-0 bottom-0 h-[2.5px]"
              aria-hidden="true"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-base-300/80 bg-base-200/75 px-3 py-0.5 text-xs font-semibold">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-base-content">PostIt AI</span>
            <span className="text-base-content/30">·</span>
            <span className="text-primary">utaraSU</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-base-content">
            Masuk ke akun Anda
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-base-content/65">
            Akses SOP internal dan lanjutkan riwayat percakapan akun Anda.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100/95 shadow-xl shadow-primary/5 backdrop-blur-xl">
          <div className="utarasu-ulos-bar h-[2px] w-full" aria-hidden="true" />
          <div className="p-6 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-base-content/80"
                >
                  Username
                </label>
                <div className="flex h-11 items-center gap-2.5 rounded-xl border border-base-300 bg-base-200/50 px-3 transition-all focus-within:border-primary/65 focus-within:bg-base-100 focus-within:ring-4 focus-within:ring-primary/10">
                  <User className="size-4 shrink-0 text-base-content/45" aria-hidden="true" />
                  <input
                    id="login-username"
                    ref={usernameRef}
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    disabled={loading}
                    className="w-full min-w-0 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-base-content/80"
                >
                  Kata sandi
                </label>
                <div className="flex h-11 items-center gap-2.5 rounded-xl border border-base-300 bg-base-200/50 px-3 transition-all focus-within:border-primary/65 focus-within:bg-base-100 focus-within:ring-4 focus-within:ring-primary/10">
                  <Lock className="size-4 shrink-0 text-base-content/45" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="w-full min-w-0 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-error/25 bg-error/10 p-3 text-xs text-error outline-none"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary mt-2 h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <LogIn className="size-4" aria-hidden="true" />
                )}
                <span>{loading ? 'Menyiapkan akun...' : 'Masuk'}</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-base-content/70 transition-colors hover:bg-base-200 hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
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
      className="flex min-h-screen min-h-dvh items-center justify-center bg-base-100"
      aria-label="Memuat halaman login"
    >
      <div className="flex flex-col items-center gap-4" role="status">
        <div className="flex size-14 animate-pulse items-center justify-center overflow-hidden rounded-2xl border border-base-300 bg-base-100">
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
