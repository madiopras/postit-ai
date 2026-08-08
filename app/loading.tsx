import { PostItLogo } from '@/components/brand/postit-logo';

export default function Loading() {
  return (
    <main
      className="flex min-h-screen min-h-dvh items-center justify-center bg-base-200/50 text-base-content"
      aria-label="Memuat PostIt AI"
    >
      <div className="flex flex-col items-center gap-4" role="status">
        <div className="flex size-14 animate-pulse items-center justify-center overflow-hidden rounded-2xl bg-base-100 shadow-sm ring-1 ring-base-300">
          <PostItLogo size={40} className="size-10" />
        </div>
        <p className="text-sm font-medium text-base-content/60">Memuat PostIt AI...</p>
      </div>
    </main>
  );
}

