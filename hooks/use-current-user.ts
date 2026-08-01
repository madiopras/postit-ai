'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  consumeHistoryMergeWarning,
  fetchCurrentUser,
  logoutCurrentUser,
  type CurrentUser,
} from '@/lib/auth-client';

export type CurrentUserStatus =
  | 'loading'
  | 'anonymous'
  | 'authenticated'
  | 'error';

export interface CurrentUserController {
  user: CurrentUser | null;
  status: CurrentUserStatus;
  isReady: boolean;
  error: string | null;
  notice: string | null;
  logoutPending: boolean;
  logoutError: string | null;
  retry: () => void;
  dismissNotice: () => void;
  dismissLogoutError: () => void;
  logout: () => Promise<boolean>;
}

export function useCurrentUser(): CurrentUserController {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<CurrentUserStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (consumeHistoryMergeWarning()) {
        setNotice(
          'Riwayat visitor belum dapat digabungkan. Riwayat lama tetap tersimpan di browser ini.'
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    fetchCurrentUser({ signal: abortController.signal })
      .then((nextUser) => {
        if (abortController.signal.aborted) return;
        setUser(nextUser);
        setStatus(nextUser ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (abortController.signal.aborted) return;
        setUser(null);
        setStatus('error');
        setError('Status akun tidak dapat diverifikasi. Silakan coba lagi.');
      });

    return () => abortController.abort();
  }, [reloadVersion]);

  const logout = useCallback(async () => {
    if (logoutPending) return false;
    setLogoutPending(true);
    setLogoutError(null);
    try {
      await logoutCurrentUser();
      window.location.assign('/');
      return true;
    } catch {
      setLogoutError('Logout gagal. Sesi Anda masih aktif. Silakan coba lagi.');
      return false;
    } finally {
      setLogoutPending(false);
    }
  }, [logoutPending]);

  return {
    user,
    status,
    isReady: status === 'anonymous' || status === 'authenticated',
    error,
    notice,
    logoutPending,
    logoutError,
    retry: () => {
      setStatus('loading');
      setError(null);
      setReloadVersion((current) => current + 1);
    },
    dismissNotice: () => setNotice(null),
    dismissLogoutError: () => setLogoutError(null),
    logout,
  };
}
