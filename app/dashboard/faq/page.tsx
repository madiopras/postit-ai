'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Download, FileText, Loader2, MoreVertical, Pencil, Plus, RefreshCw, Search, SquarePen, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
    if (!data.success) throw new Error(data.error?.message ?? 'Failed to fetch FAQs');
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
    try {
      const { rows, total: count } = await loadFaqs();
      setFaqs(rows);
      setTotal(count);
    } catch {
      toast.error('Failed to fetch FAQs');
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
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching FAQs:', error);
        toast.error('Failed to fetch FAQs');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadFaqs, loadCategories]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/faq/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('FAQ deleted successfully');
        refresh();
      } else {
        toast.error(data.error?.message || 'Failed to delete FAQ');
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Failed to delete FAQ');
    }
  };

  const handleSync = async (id: string) => {
    try {
      const response = await fetch(`/api/faq/${id}/sync`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('FAQ synced successfully');
        refresh();
      } else {
        toast.error(data.error?.message || 'Failed to sync FAQ');
      }
    } catch (error) {
      console.error('Error syncing FAQ:', error);
      toast.error('Failed to sync FAQ');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/faq/import-export');
      if (!response.ok) {
        toast.error('Failed to export FAQs');
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
      
      toast.success('FAQs exported successfully');
    } catch (error) {
      console.error('Error exporting FAQs:', error);
      toast.error('Failed to export FAQs');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have headers and at least one row');
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
        toast.error('No valid FAQs found in CSV');
        return;
      }

      const response = await fetch('/api/faq/import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Imported ${result.data.created} FAQs successfully`);
        if (result.data.failed > 0) {
          toast.error(`Failed to import ${result.data.failed} FAQs`);
        }
        refresh();
      } else {
        toast.error(result.error?.message || 'Failed to import FAQs');
      }
    } catch (error) {
      console.error('Error importing FAQs:', error);
      toast.error('Failed to import FAQs');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Published</Badge>;
      case 'draft':
        return <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">Draft</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">Error</Badge>;
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">FAQ Management</h1>
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
            Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Download className="size-5" />
            Export CSV
          </button>
          <button
            onClick={() => router.push('/dashboard/faq/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary transition-colors"
          >
            <Plus className="size-5" />
            New FAQ
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
              <p className="text-xs font-medium text-muted-foreground">Total FAQs</p>
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
              <p className="text-xs font-medium text-muted-foreground">Published</p>
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
              <p className="text-xs font-medium text-muted-foreground">Draft Items</p>
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
              <p className="text-xs font-medium text-muted-foreground">Avg. Accuracy</p>
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
              placeholder="Search questions and answers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-card border-border"
            />
          </div>
          
          <Select value={category || ''} onValueChange={(value) => {
            setCategory(value || '');
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={status || ''} onValueChange={(value) => {
            setStatus(value || '');
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* FAQ Table */}
      <div className="bg-muted rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">FAQ List</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="size-10 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent border-b border-border hover:bg-accent">
                      <TableHead className="text-sm font-medium text-muted-foreground">Question</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Category</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Usage</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Accuracy</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground">Last Updated</TableHead>
                      <TableHead className="text-sm font-medium text-muted-foreground text-right">Actions</TableHead>
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
                              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100 hover:bg-accent transition-all"
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
                                Sync
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(faq.id)} className="text-sm text-destructive">
                                <Trash2 className="size-5 mr-2" />
                                Delete
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
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
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
                      Next
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