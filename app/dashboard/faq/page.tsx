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
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Terbit</Badge>;
      case 'draft':
        return <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">Draf</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">Bermasalah</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Kelola FAQ</h1>
          <p className="text-sm text-muted-foreground mt-1">
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Upload className="size-5" />
            Impor CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Download className="size-5" />
            Ekspor CSV
          </button>
          <button
            onClick={() => router.push('/dashboard/faq/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary transition-colors"
          >
            <Plus className="size-5" />
            FAQ baru
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-muted rounded-xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="size-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total FAQ</p>
              <p className="text-xl font-semibold tracking-tight text-foreground">{total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-muted rounded-xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Terbit</p>
              <p className="text-xl font-semibold tracking-tight text-foreground">{faqs.filter(f => f.status === 'published').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-muted rounded-xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
              <SquarePen className="size-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Draf</p>
              <p className="text-xl font-semibold tracking-tight text-foreground">{faqs.filter(f => f.status === 'draft').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-muted rounded-xl p-4 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
              <BarChart3 className="size-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rata-rata akurasi</p>
              <p className="text-xl font-semibold tracking-tight text-foreground">
                {faqs.length > 0 ? `${Math.round(faqs.reduce((sum, f) => sum + f.accuracy, 0) / faqs.length)}%` : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-muted rounded-xl p-4 border border-border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pertanyaan dan jawaban..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-card border-border"
            />
          </div>
          
          <Select aria-label="Filter kategori" value={category || ''} onValueChange={(value) => {
            setCategory(value || '');
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
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
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
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
      <div className="bg-muted rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Daftar FAQ</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="size-10 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <TableError message={loadError} onRetry={refresh} />
          ) : faqs.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-tertiary">
              Tidak ada FAQ yang cocok. Ubah filter atau buat FAQ baru.
            </div>
          ) : (
            <>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent border-b border-border hover:bg-accent">
                      <TableHead className="text-sm font-medium text-muted-foreground">Pertanyaan</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Kategori</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Pemakaian</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Akurasi</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Diperbarui</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqs.map((faq) => (
                      <TableRow key={faq.id} className="group border-b border-border hover:bg-accent">
                        <TableCell className="text-sm text-foreground font-medium max-w-xs truncate">
                          {faq.question.replace(/'/g, "'")}
                        </TableCell>
                        <TableCell>
                          {faq.category ? (
                            <Badge variant="secondary" className="capitalize bg-secondary text-secondary-foreground">
                              {faq.category}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(faq.status)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{faq.usageCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{faq.accuracy}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(faq.updatedAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            {/* The trigger already renders a <button>; wrapping
                                one inside it nested two buttons, which is
                                invalid HTML and broke hydration. Style the
                                trigger directly instead. */}
                            <DropdownMenuTrigger
                              className="p-2 rounded-lg hover:bg-accent transition-all"
                              aria-label={`Aksi untuk ${faq.question}`}
                            >
                              <MoreVertical className="size-5 text-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-muted border-border">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/faq/${faq.id}`)} className="text-sm">
                                <Pencil className="size-5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSync(faq.id)} className="text-sm">
                                <RefreshCw className="size-5 mr-2" />
                                Sinkronkan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(faq.id)} className="text-sm text-destructive">
                                <Trash2 className="size-5 mr-2" />
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
                  <div className="text-sm text-muted-foreground">
                    Menampilkan {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} dari {total} entri
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sebelumnya
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-input text-foreground hover:bg-accent'
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
                      className="px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
