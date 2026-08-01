'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangleIcon, Loader2, RefreshCwIcon, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableError,
} from '@/components/dashboard/dashboard-ui';

interface DocumentRow {
  id: string;
  type: 'faq' | 'sop';
  title: string;
  chunkIndex: number | null;
  sourceId: string | null;
  status: 'draft' | 'published' | 'error';
  updatedAt: string;
  hasEmbedding: boolean;
  contentPreview: string;
}

const ALL = 'all';
const PAGE_SIZE = 20;

/**
 * Vector-store monitoring.
 *
 * Shows what is actually in `documents`: which chunks embedded, which failed,
 * and which source they belong to — the piece that was specified in the phase
 * plan but never built, leaving no way to see or recover a failed embed.
 */
function DocumentsPage() {
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(searchParams.get('status') ?? ALL);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (type !== ALL) params.set('type', type);
      if (status !== ALL) params.set('status', status);

      const res = await fetch(`/api/documents?${params}`);
      const body = await res.json();

      if (body.success) {
        setRows(body.data);
        setTotal(body.meta.total);
      } else {
        const message = body.error?.message ?? 'Gagal memuat dokumen';
        setLoadError(message);
        toast.error(message);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat dokumen');
      toast.error('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  }, [page, search, type, status]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const handleResync = async (doc: DocumentRow) => {
    setResyncing(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/resync`, { method: 'POST' });
      const body = await res.json();

      if (body.success) {
        toast.success('Dokumen berhasil di-resync');
      } else {
        toast.error(body.error?.message ?? 'Resync gagal');
      }
      // Resync replaces every chunk of the source, so ids change — always reload.
      await load();
    } catch {
      toast.error('Resync gagal');
    } finally {
      setResyncing(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const problems = rows.filter((r) => r.status === 'error' || !r.hasEmbedding).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dokumen</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Isi vector store — satu baris per chunk yang dipakai RAG untuk menjawab.
        </p>
      </div>

      {/* Filters — one row above the table */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Cari judul atau isi chunk..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select
            aria-label="Filter tipe dokumen"
            value={type}
            onValueChange={(v) => {
              // Base UI allows a null value (cleared selection); fall back to "all".
              setType(v ?? ALL);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Semua tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua tipe</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
              <SelectItem value="sop">SOP</SelectItem>
            </SelectContent>
          </Select>

          <Select
            aria-label="Filter status dokumen"
            value={status}
            onValueChange={(v) => {
              setStatus(v ?? ALL);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-45">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua status</SelectItem>
              <SelectItem value="published">Terbit</SelectItem>
              <SelectItem value="draft">Draf</SelectItem>
              <SelectItem value="error">Bermasalah</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {total} chunk
          </CardTitle>
          <CardDescription>
            {problems > 0
              ? `${problems} di halaman ini bermasalah — gunakan Resync untuk membangun ulang dari sumbernya.`
              : 'Semua chunk di halaman ini punya vektor.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : loadError ? (
            <TableError message={loadError} onRetry={load} />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Tidak ada dokumen yang cocok dengan filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead className="w-20">Tipe</TableHead>
                    <TableHead className="w-20">Chunk</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-28">Vektor</TableHead>
                    <TableHead className="w-36">Diperbarui</TableHead>
                    <TableHead className="w-28 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="max-w-sm">
                        <div className="truncate font-medium">{doc.title}</div>
                        <div className="text-muted-foreground truncate text-xs">
                          {doc.contentPreview}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase">
                          {doc.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{(doc.chunkIndex ?? 0) + 1}</TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell>
                        {doc.hasEmbedding ? (
                          <span className="text-muted-foreground text-xs">Ada</span>
                        ) : (
                          <span className="text-destructive flex items-center gap-1 text-xs">
                            <AlertTriangleIcon className="size-3" />
                            Kosong
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(doc.updatedAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={resyncing !== null}
                          onClick={() => handleResync(doc)}
                        >
                          {resyncing === doc.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCwIcon className="size-4" />
                          )}
                          <span className="sr-only">Resync {doc.title}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Sebelumnya
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentRow['status'] }) {
  if (status === 'published') return <Badge variant="secondary">Terbit</Badge>;
  if (status === 'draft') return <Badge variant="outline">Draf</Badge>;
  return (
    <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
      <AlertTriangleIcon className="size-3" />
      Bermasalah
    </Badge>
  );
}

export default function Page() {
  // useSearchParams needs a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DocumentsPage />
    </Suspense>
  );
}
