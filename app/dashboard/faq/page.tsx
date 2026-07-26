'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Fetch FAQs
  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        category,
        status,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      const response = await fetch(`/api/faq?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setFaqs(data.data);
        setTotal(data.meta?.total || 0);
      } else {
        toast.error('Failed to fetch FAQs');
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      toast.error('Failed to fetch FAQs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/faq');
      const data = await response.json();
      
      if (data.success) {
        const uniqueCategories = Array.from(
          new Set(data.data.map((faq: FAQ) => faq.category).filter(Boolean))
        );
        setCategories(uniqueCategories as string[]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchCategories();
  }, [search, category, status, page]);

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
        fetchFaqs();
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
        fetchFaqs();
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
        fetchFaqs();
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
        return <Badge className="bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container">Published</Badge>;
      case 'draft':
        return <Badge className="bg-secondary-container text-on-secondary-container hover:bg-secondary-container">Draft</Badge>;
      case 'error':
        return <Badge className="bg-error-container text-on-error-container hover:bg-error-container">Error</Badge>;
      default:
        return <Badge className="bg-surface-container text-on-surface-variant hover:bg-surface-container">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">FAQ Management</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Update, organize, and monitor your AI's knowledge base.
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-xl">upload</span>
            Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-xl">download</span>
            Export CSV
          </button>
          <button
            onClick={() => router.push('/dashboard/faq/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            New FAQ
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-on-primary-container">description</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Total FAQs</p>
              <p className="text-headline-md text-on-surface">{total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-on-tertiary-container">check_circle</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Published</p>
              <p className="text-headline-md text-on-surface">{faqs.filter(f => f.status === 'published').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-on-secondary-container">edit_note</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Draft Items</p>
              <p className="text-headline-md text-on-surface">{faqs.filter(f => f.status === 'draft').length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-container rounded-xl p-4 border border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-on-primary-fixed">analytics</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Avg. Accuracy</p>
              <p className="text-headline-md text-on-surface">
                {faqs.length > 0 ? `${Math.round(faqs.reduce((sum, f) => sum + f.accuracy, 0) / faqs.length)}%` : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container rounded-xl p-4 border border-outline-variant">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-xl">search</span>
            <Input
              placeholder="Search questions and answers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-surface border-outline-variant"
            />
          </div>
          
          <Select value={category || ''} onValueChange={(value) => {
            setCategory(value || '');
            setPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-surface border-outline-variant">
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
            <SelectTrigger className="w-full sm:w-[180px] bg-surface border-outline-variant">
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
      <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant">
          <h2 className="text-headline-sm text-on-surface">FAQ List</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <span className="material-symbols-outlined animate-spin text-4xl text-on-surface-variant">progress_activity</span>
            </div>
          ) : (
            <>
              <div className="border border-outline-variant rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-surface-container-high border-b border-outline-variant hover:bg-surface-container-high">
                      <TableHead className="text-label-md text-on-surface-variant">Question</TableHead>
                      <TableHead className="text-label-md text-on-surface-variant">Category</TableHead>
                      <TableHead className="text-label-md text-on-surface-variant">Status</TableHead>
                      <TableHead className="text-label-md text-on-surface-variant">Usage</TableHead>
                      <TableHead className="text-label-md text-on-surface-variant">Accuracy</TableHead>
                      <TableHead className="text-label-md text-on-surface-variant">Last Updated</TableHead>
                      <TableHead className="text-label-md text-on-surface-variant text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqs.map((faq) => (
                      <TableRow key={faq.id} className="group border-b border-outline-variant hover:bg-surface-container-high">
                        <TableCell className="text-body-md text-on-surface font-medium max-w-xs truncate">
                          {faq.question.replace(/'/g, "'")}
                        </TableCell>
                        <TableCell>
                          {faq.category ? (
                            <Badge variant="secondary" className="capitalize bg-secondary-fixed text-on-secondary-fixed">
                              {faq.category}
                            </Badge>
                          ) : (
                            <span className="text-body-md text-on-surface-variant">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(faq.status)}
                        </TableCell>
                        <TableCell>
                          <span className="text-body-md text-on-surface">{faq.usageCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-body-md text-on-surface">{faq.accuracy}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-body-md text-on-surface-variant">
                            {new Date(faq.updatedAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-container-highest transition-all">
                                <span className="material-symbols-outlined text-xl text-on-surface">more_vert</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-surface-container border-outline-variant">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/faq/${faq.id}`)} className="text-body-md">
                                <span className="material-symbols-outlined text-xl mr-2">edit</span>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSync(faq.id)} className="text-body-md">
                                <span className="material-symbols-outlined text-xl mr-2">sync</span>
                                Sync
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(faq.id)} className="text-body-md text-error">
                                <span className="material-symbols-outlined text-xl mr-2">delete</span>
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
                  <div className="text-body-md text-on-surface-variant">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-outline text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            className={`w-10 h-10 rounded-lg text-label-md transition-colors ${
                              page === pageNum
                                ? 'bg-primary text-on-primary'
                                : 'border border-outline text-on-surface hover:bg-surface-container-high'
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
                      className="px-4 py-2 rounded-lg border border-outline text-label-md text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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