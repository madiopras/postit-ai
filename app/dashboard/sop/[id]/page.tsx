'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import { ArrowLeft, Save, Loader2, Upload, RotateCcw, Download, Paperclip, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SOP {
  id: string;
  title: string;
  content: string;
  category: string | null;
  status: 'draft' | 'published' | 'error';
  publishedVersionId: string | null;
  requiresLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SOPVersion {
  id: string;
  versionNumber: number;
  indexingStatus: 'draft' | 'ready' | 'error';
  createdAt: string;
  publishedAt: string | null;
}

interface SOPAttachment {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
  checksum: string;
  extractionStatus: 'pending' | 'ready' | 'error';
  extractionError: string | null;
  extractedCharacterCount: number | null;
  extractedAt: string | null;
  createdAt: string;
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
    requiresLogin: false,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [chunks, setChunks] = useState<string[]>([]);
  const [showChunkPreview, setShowChunkPreview] = useState(false);
  const [versions, setVersions] = useState<SOPVersion[]>([]);
  const [publishingVersionId, setPublishingVersionId] = useState<string | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<SOPAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch SOP if editing. `loading` already starts false for a new SOP, so
  // there is nothing to set synchronously here — every write happens in a
  // promise callback, guarded against landing after unmount.
  useEffect(() => {
    if (isNew) return;

    let cancelled = false;

    Promise.all([
      fetch(`/api/sop/${sopId}`).then((response) => response.json()),
      fetch(`/api/sop/${sopId}/versions`).then((response) => response.json()),
    ])
      .then(([data, versionData]) => {
        if (cancelled) return;

        if (!data.success) {
          toast.error('Failed to load SOP');
          router.push('/dashboard/sop');
          return;
        }

        setSop(data.data);
        if (versionData.success) {
          setVersions(versionData.data);
          setActiveVersionId(versionData.data[0]?.id ?? null);
        }
        setFormData({
          title: data.data.title,
          content: data.data.content,
          category: data.data.category || '',
          requiresLogin: data.data.requiresLogin,
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

  useEffect(() => {
    if (isNew || !activeVersionId) return;
    let cancelled = false;
    fetch(`/api/sop/${sopId}/versions/${activeVersionId}/attachments`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.success) setAttachments(data.data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load attachments');
      });
    return () => {
      cancelled = true;
    };
  }, [activeVersionId, isNew, sopId]);

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
        toast.success(
          isNew
            ? 'SOP created successfully'
            : data.data.draftCreated
              ? 'Draft version created successfully'
              : 'SOP settings updated successfully'
        );
        if (isNew) router.push('/dashboard/sop');
        else window.location.reload();
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

  const handlePublish = async (version: SOPVersion) => {
    if (!sop) return;
    const isRollback = version.publishedAt !== null;
    setPublishingVersionId(version.id);
    try {
      const action = isRollback ? 'rollback' : 'publish';
      const response = await fetch(
        `/api/sop/${sop.id}/versions/${version.id}/${action}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to publish version');
      toast.success(isRollback ? 'SOP rolled back successfully' : 'SOP version published successfully');
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish version');
    } finally {
      setPublishingVersionId(null);
    }
  };

  const createAttachmentDraft = async () => {
    const response = await fetch(`/api/sop/${sopId}/versions`, { method: 'POST' });
    const data = await response.json();
    if (!data.success) {
      toast.error(data.error?.message || 'Failed to create attachment draft');
      return;
    }
    toast.success('Draft version created with the current attachments');
    window.location.reload();
  };

  const handleAttachmentUpload = async (file: File | undefined) => {
    if (!file || !activeVersionId) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(
        `/api/sop/${sopId}/versions/${activeVersionId}/attachments`,
        { method: 'POST', body }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to upload attachment');
      setAttachments((current) => [...current, data.data]);
      if (data.data.extractionStatus === 'ready') {
        toast.success('Attachment uploaded and extracted successfully');
      } else {
        toast.warning(data.data.extractionError || 'Attachment uploaded but extraction failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentExtraction = async (attachment: SOPAttachment) => {
    if (!activeVersionId) return;
    setUploading(true);
    try {
      const response = await fetch(
        `/api/sop/${sopId}/versions/${activeVersionId}/attachments/${attachment.id}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || 'Extraction failed');
      setAttachments((current) =>
        current.map((item) => item.id === attachment.id ? data.data : item)
      );
      toast.success('Attachment extracted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Extraction failed');
      window.location.reload();
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentDelete = async (attachment: SOPAttachment) => {
    if (!activeVersionId || !confirm(`Delete ${attachment.filename}?`)) return;
    const response = await fetch(
      `/api/sop/${sopId}/versions/${activeVersionId}/attachments/${attachment.id}`,
      { method: 'DELETE' }
    );
    const data = await response.json();
    if (!data.success) {
      toast.error(data.error?.message || 'Failed to delete attachment');
      return;
    }
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    toast.success('Attachment deleted successfully');
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

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <label htmlFor="requires-login" className="text-sm font-medium">
                      Login required
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Anonymous chat users cannot retrieve this SOP.
                    </p>
                  </div>
                  <Switch
                    id="requires-login"
                    checked={formData.requiresLogin}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requiresLogin: checked })
                    }
                  />
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

          {!isNew && sop && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Version History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {versions.map((version) => {
                  const isPublished = version.id === sop.publishedVersionId;
                  const isRollback = version.publishedAt !== null;
                  return (
                    <div key={version.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Version {version.versionNumber}</span>
                        <Badge variant={isPublished ? 'default' : 'outline'}>
                          {isPublished ? 'Published' : version.indexingStatus}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant={activeVersionId === version.id ? 'secondary' : 'ghost'}
                        className="w-full"
                        onClick={() => setActiveVersionId(version.id)}
                      >
                        <Paperclip className="mr-2 h-3 w-3" />
                        View attachments
                      </Button>
                      {!isPublished && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={publishingVersionId !== null}
                          onClick={() => handlePublish(version)}
                        >
                          {publishingVersionId === version.id ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : isRollback ? (
                            <RotateCcw className="mr-2 h-3 w-3" />
                          ) : (
                            <Upload className="mr-2 h-3 w-3" />
                          )}
                          {isRollback ? 'Rollback to this version' : 'Publish'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {!isNew && sop && activeVersionId && (() => {
            const activeVersion = versions.find((version) => version.id === activeVersionId);
            const isMutable = activeVersion
              && !activeVersion.publishedAt
              && activeVersion.id !== sop.publishedVersionId;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Attachments · Version {activeVersion?.versionNumber}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No attachments in this version.</p>
                  )}
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-lg border p-3">
                      <p className="truncate text-sm font-medium" title={attachment.filename}>
                        {attachment.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant={attachment.extractionStatus === 'ready' ? 'default' : 'outline'}
                        >
                          {attachment.extractionStatus === 'ready'
                            ? 'Ready'
                            : attachment.extractionStatus}
                        </Badge>
                        {attachment.extractedCharacterCount !== null && (
                          <span className="text-xs text-muted-foreground">
                            {attachment.extractedCharacterCount.toLocaleString()} characters
                          </span>
                        )}
                      </div>
                      {attachment.extractionError && (
                        <p className="mt-1 text-xs text-destructive">
                          {attachment.extractionError}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <a
                          className="inline-flex h-7 items-center rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                          href={`/api/sop/${sopId}/versions/${activeVersionId}/attachments/${attachment.id}`}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </a>
                        {isMutable && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={uploading}
                            onClick={() => handleAttachmentExtraction(attachment)}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Re-extract
                          </Button>
                        )}
                        {isMutable && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAttachmentDelete(attachment)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isMutable ? (
                    <label className="block">
                      <span className="sr-only">Upload attachment</span>
                      <Input
                        type="file"
                        disabled={uploading}
                        accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv"
                        onChange={(event) => {
                          void handleAttachmentUpload(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Text PDF, DOCX, XLSX, PPTX, TXT, or CSV · maximum 10 MB
                      </span>
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Published versions are immutable. Create a draft before changing attachments.
                      </p>
                      {activeVersionId === versions[0]?.id && (
                        <Button type="button" size="sm" variant="outline" onClick={createAttachmentDraft}>
                          Create attachment draft
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

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
