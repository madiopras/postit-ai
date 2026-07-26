'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SOP {
  id: string;
  title: string;
  content: string;
  category: string | null;
  status: 'draft' | 'published' | 'error';
  createdAt: string;
  updatedAt: string;
}

export default function SOPFormPage() {
  const router = useRouter();
  const params = useParams();
  const sopId = params?.id as string;
  const isNew = sopId === 'new';

  const [sop, setSop] = useState<SOP | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [chunks, setChunks] = useState<string[]>([]);
  const [showChunkPreview, setShowChunkPreview] = useState(false);

  // Fetch SOP if editing. `loading` already starts false for a new SOP, so
  // there is nothing to set synchronously here — every write happens in a
  // promise callback, guarded against landing after unmount.
  useEffect(() => {
    if (isNew) return;

    let cancelled = false;

    fetch(`/api/sop/${sopId}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;

        if (!data.success) {
          toast.error('Failed to load SOP');
          router.push('/dashboard/sop');
          return;
        }

        setSop(data.data);
        setFormData({
          title: data.data.title,
          content: data.data.content,
          category: data.data.category || '',
        });
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching SOP:', error);
        toast.error('Failed to load SOP');
        router.push('/dashboard/sop');
      });

    return () => {
      cancelled = true;
    };
  }, [sopId, isNew, router]);

  const generateChunkPreview = (content: string) => {
    const chunkSize = 3200; // ~800 tokens in chars
    const overlap = 400;
    const chunks: string[] = [];

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      chunks.push(content.substring(i, i + chunkSize));
    }

    setChunks(chunks);
    setShowChunkPreview(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }

    setSaving(true);

    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/sop' : `/api/sop/${sopId}`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isNew ? 'SOP created successfully' : 'SOP updated successfully');
        router.push('/dashboard/sop');
      } else {
        toast.error(data.error?.message || 'Failed to save SOP');
      }
    } catch (error) {
      console.error('Error saving SOP:', error);
      toast.error('Failed to save SOP');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/sop')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? 'Create SOP' : 'Edit SOP'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isNew 
              ? 'Add a new Standard Operating Procedure'
              : `Editing SOP • Created ${sop ? new Date(sop.createdAt).toLocaleDateString() : ''}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>SOP Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Enter SOP title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.title.length}/200
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    placeholder="e.g., Sales, Support, Operations"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    maxLength={100}
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    placeholder="Enter SOP content (markdown supported)"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    maxLength={50000}
                    rows={12}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.content.length}/50000 characters
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateChunkPreview(formData.content)}
                  >
                    Preview Chunks
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save SOP
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          {!isNew && sop && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  {sop.status === 'published' && (
                    <Badge className="bg-success/10 text-success hover:bg-success/10">
                      Published
                    </Badge>
                  )}
                  {sop.status === 'draft' && (
                    <Badge className="bg-warning/10 text-warning hover:bg-warning/10">
                      Draft
                    </Badge>
                  )}
                  {sop.status === 'error' && (
                    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
                      Error
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Content Size</p>
                <p className="font-medium">
                  {Math.round(formData.content.length / 1024)}KB
                </p>
              </div>
              {!isNew && sop && (
                <>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(sop.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(sop.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Chunking Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chunking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Chunk Size</p>
                <p className="font-medium">~800 tokens (3.2KB)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Overlap</p>
                <p className="font-medium">400 chars between chunks</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estimated Chunks</p>
                <p className="font-medium">
                  {Math.ceil(formData.content.length / 2800)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chunk Preview Modal */}
      {showChunkPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-96 overflow-auto">
            <CardHeader className="sticky top-0 bg-background">
              <div className="flex items-center justify-between">
                <CardTitle>Chunk Preview ({chunks.length} chunks)</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChunkPreview(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {chunks.map((chunk, i) => (
                <div key={i} className="pb-4 border-b last:border-0">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Chunk {i + 1} ({chunk.length} chars)
                  </p>
                  <p className="text-sm bg-muted p-3 rounded line-clamp-4">
                    {chunk}...
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}