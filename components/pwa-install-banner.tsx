'use client';

import { Download, Sparkles, X } from 'lucide-react';
import { usePWAInstallPrompt } from '@/hooks/use-pwa-install';

export function PWAInstallBanner() {
  const { isInstallable, isStandalone, triggerInstall, dismissPrompt } = usePWAInstallPrompt();

  if (!isInstallable || isStandalone) {
    return null;
  }

  return (
    <div className="bg-base-200/90 border-base-300 relative z-30 flex shrink-0 items-center justify-between border-b px-4 py-2.5 backdrop-blur-md transition-all">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-base-content text-xs font-semibold sm:text-sm">
            Pasang Aplikasi PostIt AI
          </p>
          <p className="text-base-content/70 hidden text-xs sm:block">
            Akses instan 1-tap di layar utama HP atau Desktop tanpa membuka browser.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => void triggerInstall()}
          className="btn btn-primary btn-xs sm:btn-sm gap-1.5 font-medium shadow-xs"
        >
          <Download className="size-3.5" />
          <span>Pasang</span>
        </button>
        <button
          onClick={dismissPrompt}
          className="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-base-content"
          aria-label="Tutup saran instalasi"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
