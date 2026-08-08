'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Download, FileText, Loader2, MoreVertical, Pencil, Plus, RefreshCw, Search, SquarePen, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { 
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableError,
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/dashboard/dashboard-ui';
import { toast } from 'sonner';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  status: 'draft' | 'published' | 'error';
  usageCount: number;
  accuracy: number;
  createdAt: string;
  updatedAt: string;
}

export default function FAQManagementPage() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');

  /** Pure fetches — no state writes, so effects can await them safely. */
  const loadFaqs = useCallback(async () => {
    const params = new URLSearchParams({
      search,
      category,
      status,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    const response = await fetch(`/api/faq?${params}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message ?? 'Gagal memuat FAQ');
    return { rows: data.data as FAQ[], total: (data.meta?.total as number) || 0 };
  }, [search, category, status, page, pageSize]);

  const loadCategories = useCallback(async () => {
    const response = await fetch('/api/faq');
    const data = await response.json();
    if (!data.success) return [] as string[];
    return Array.from(
      new Set((data.data as FAQ[]).map((faq) => faq.category).filter(Boolean))
    ) as string[];
  }, []);

  /** Imperative refresh after a mutation. */
  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { rows, total: count } = await loadFaqs();
      setFaqs(rows);
      setTotal(count);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat FAQ');
      toast.error('Gagal memuat FAQ');
    } finally {
      setLoading(false);
    }
  }, [loadFaqs]);

  // Re-runs whenever a filter changes; `cancelled` keeps a slow earlier
  // response from overwriting a newer one.
  useEffect(() => {
    let cancelled = false;

    Promise.all([loadFaqs(), loadCategories()])
      .then(([faqResult, cats]) => {
        if (cancelled) return;
        setFaqs(faqResult.rows);
        setTotal(faqResult.total);
        setCategories(cats);
        setLoadError('');
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching FAQs:', error);
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat FAQ');
        toast.error('Gagal memuat FAQ');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadFaqs, loadCategories]);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus FAQ ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      const response = await fetch(`/api/faq/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('FAQ berhasil dihapus');
        refresh();
      } else {
        toast.error(data.error?.message || 'Gagal menghapus FAQ');
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Gagal menghapus FAQ');
    }
  };

  const handleSync = async (id: string) => {
    try {
      const response = await fetch(`/api/faq/${id}/sync`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('FAQ berhasil disinkronkan');
        refresh();
      } else {
        toast.error(data.error?.message || 'Gagal menyinkronkan FAQ');
      }
    } catch (error) {
      console.error('Error syncing FAQ:', error);
      toast.error('Gagal menyinkronkan FAQ');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/faq/import-export');
      if (!response.ok) {
        toast.error('Gagal mengekspor FAQ');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faqs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('FAQ berhasil diekspor');
    } catch (error) {
      console.error('Error exporting FAQs:', error);
      toast.error('Gagal mengekspor FAQ');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV harus memiliki header dan minimal satu baris data');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;

        data.push({
          question: values[headers.indexOf('question')] || '',
          answer: values[headers.indexOf('answer')] || '',
          category: values[headers.indexOf('category')] || '',
        });
      }

      if (data.length === 0) {
        toast.error('Tidak ada FAQ valid di dalam CSV');
        return;
      }

      const response = await fetch('/api/faq/import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${result.data.created} FAQ berhasil diimpor`);
        if (result.data.failed > 0) {
          toast.error(`${result.data.failed} FAQ gagal diimpor`);
        }
        refresh();
      } else {
        toast.error(result.error?.message || 'Gagal mengimpor FAQ');
      }
    } catch (error) {
      console.error('Error importing FAQs:', error);
      toast.error('Gagal mengimpor FAQ');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="badge-primary">Terbit</Badge>;
      case 'draft':
        return <Badge className="badge-neutral">Draf</Badge>;
      case 'error':
        return <Badge className="badge-error">Bermasalah</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-base-content">Kelola FAQ</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Kelola, atur, dan pantau knowledge base AI Anda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleImport(e.target.files[0]);
              }
            }}
            className="hidden"
            id="csv-import"
          />
          <button
            onClick={() => document.getElementById('csv-import')?.click()}
            className="btn btn-outline btn-sm gap-2"
          >
            <Upload className="size-4" />
            Impor CSV
          </button>
          <button
            onClick={handleExport}
            className="btn btn-outline btn-sm gap-2"
          >
            <Download className="size-4" />
            Ekspor CSV
          </button>
          <button
            onClick={() => router.push('/dashboard/faq/new')}
            className="btn btn-primary btn-sm gap-2"
          >
            <Plus className="size-4" />
            FAQ baru
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card card-border bg-base-100 p-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-primary text-primary-content flex items-center justify-center">
              <FileText className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-base-content/60">Total FAQ</p>
              <p className="text-xl font-semibold tracking-tight text-base-content">{total}</p>
            </div>
          </div>
        </div>
        
        <div className="card card-border bg-base-100 p-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-base-content/60">Terbit</p>
              <p className="text-xl font-semibold tracking-tight text-base-content">{faqs.filter(f => f.status === 'published').length}</p>
            </div>
          </div>
        </div>
        
        <div className="card card-border bg-base-100 p-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-neutral text-neutral-content flex items-center justify-center">
              <SquarePen className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-base-content/60">Draf</p>
              <p className="text-xl font-semibold tracking-tight text-base-content">{faqs.filter(f => f.status === 'draft').length}</p>
            </div>
          </div>
        </div>
        
        <div className="card card-border bg-base-100 p-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-secondary text-secondary-content flex items-center justify-center">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-base-content/60">Rata-rata akurasi</p>
              <p className="text-xl font-semibold tracking-tight text-base-content">
                {faqs.length > 0 ? `${Math.round(faqs.reduce((sum, f) => sum + f.accuracy, 0) / faqs.length)}%` : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-border bg-base-100 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" />
            <Input
              placeholder="Cari pertanyaan dan jawaban..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          
          <Select aria-label="Filter kategori" value={category || ''} onValueChange={(value) => {
            setCategory(value || '');
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Semua kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua kategori</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select aria-label="Filter status" value={status || ''} onValueChange={(value) => {
            setStatus(value || '');
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua status</SelectItem>
              <SelectItem value="published">Terbit</SelectItem>
              <SelectItem value="draft">Draf</SelectItem>
              <SelectItem value="error">Bermasalah</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* FAQ Table */}
      <div className="card card-border bg-base-100 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-base-200">
          <h2 className="text-lg font-semibold text-base-content">Daftar FAQ</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="size-10 animate-spin text-primary" />
            </div>
          ) : loadError ? (
            <TableError message={loadError} onRetry={refresh} />
          ) : faqs.length === 0 ? (
            <div className="py-12 text-center text-sm text-base-content/60">
              Tidak ada FAQ yang cocok. Ubah filter atau buat FAQ baru.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pertanyaan</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pemakaian</TableHead>
                      <TableHead>Akurasi</TableHead>
                      <TableHead>Diperbarui</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqs.map((faq) => (
                      <TableRow key={faq.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {faq.question.replace(/'/g, "'")}
                        </TableCell>
                        <TableCell>
                          {faq.category ? (
                            <Badge variant="secondary" className="capitalize">
                              {faq.category}
                            </Badge>
                          ) : (
                            <span className="text-sm text-base-content/40">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(faq.status)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-base-content">{faq.usageCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-base-content">{faq.accuracy}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-base-content/60">
                            {new Date(faq.updatedAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="btn btn-ghost btn-square btn-sm"
                              aria-label={`Aksi untuk ${faq.question}`}
                            >
                              <MoreVertical className="size-4 text-base-content/70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/faq/${faq.id}`)}>
                                <Pencil className="size-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSync(faq.id)}>
                                <RefreshCw className="size-4 mr-2" />
                                Sinkronkan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(faq.id)} className="text-error hover:bg-error/10 hover:text-error">
                                <Trash2 className="size-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-base-content/60">
                    Menampilkan {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} dari {total} entri
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="btn btn-outline btn-sm"
                    >
                      Sebelumnya
                    </button>
                    <div className="join">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`btn btn-sm join-item ${
                              page === pageNum
                                ? 'btn-primary'
                                : 'btn-outline'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="btn btn-outline btn-sm"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
