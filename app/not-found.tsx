import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-muted-foreground font-mono text-sm">404</p>
        <h1 className="text-xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="text-muted-foreground text-sm">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/">
            <Button variant="outline">Ke chat</Button>
          </Link>
          <Link href="/dashboard">
            <Button>Ke dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
