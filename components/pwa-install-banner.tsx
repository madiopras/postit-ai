'use client';

import { Download, Sparkles, X } from 'lucide-react';
import { usePWAInstallPrompt } from '@/hooks/use-pwa-install';

export function PWAInstallBanner() {
  const { isInstallable, isStandalone, triggerInstall, dismissPrompt } = usePWAInstallPrompt();

  if (!isInstallable || isStandalone) {
    return null;
  }

  return (
    <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-base-300/80 bg-base-200/80 px-4 py-2.5 backdrop-blur-md transition-all">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-base-content sm:text-sm">
            Pasang Aplikasi PostIt AI
          </p>
          <p className="hidden text-xs text-base-content/65 sm:block">
            Akses instan 1-tap di layar utama HP atau Desktop tanpa membuka browser.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void triggerInstall()}
          className="btn btn-primary btn-xs sm:btn-sm gap-1.5 rounded-xl font-semibold shadow-2xs"
        >
          <Download className="size-3.5" aria-hidden="true" />
          <span>Pasang</span>
        </button>
        <button
          type="button"
          onClick={dismissPrompt}
          className="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:bg-base-300/60 hover:text-base-content"
          aria-label="Tutup saran instalasi"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
