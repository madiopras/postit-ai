'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/dashboard/dashboard-ui';

/**
 * Mirrors createFaqSchema / updateFaqSchema in app/api/faq — keeping the limits
 * identical means the server never rejects something the form accepted.
 */
const faqFormSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Pertanyaan wajib diisi')
    .max(500, 'Pertanyaan maksimal 500 karakter'),
  answer: z
    .string()
    .trim()
    .min(1, 'Jawaban wajib diisi')
    .max(5000, 'Jawaban maksimal 5000 karakter'),
  category: z.string().trim().max(100, 'Kategori maksimal 100 karakter'),
  status: z.enum(['draft', 'published']),
});

type FaqFormValues = z.infer<typeof faqFormSchema>;

/**
 * The stored record. `status` is wider than the form's: 'error' is an outcome
 * of syncing that the server sets, never something the editor can choose.
 */
interface Faq {
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

export default function FaqFormPage() {
  const router = useRouter();
  const params = useParams();
  const faqId = params?.id as string;
  const isNew = faqId === 'new';

  const [faq, setFaq] = useState<Faq | null>(null);
  const [loading, setLoading] = useState(!isNew);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: { question: '', answer: '', category: '', status: 'published' },
  });

  // `useWatch` rather than the `watch()` returned by useForm: the latter is an
  // unmemoizable function, which makes React Compiler skip this component.
  const question = useWatch({ control, name: 'question' });
  const answer = useWatch({ control, name: 'answer' });
  const status = useWatch({ control, name: 'status' });

  useEffect(() => {
    if (isNew) return;

    let cancelled = false;

    fetch(`/api/faq/${faqId}`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;

        if (!body.success) {
          toast.error(body.error?.message ?? 'FAQ tidak ditemukan');
          router.push('/dashboard/faq');
          return;
        }

        setFaq(body.data);
        reset({
          question: body.data.question,
          answer: body.data.answer,
          category: body.data.category ?? '',
          // An 'error' status is an outcome of syncing, not something the
          // editor should be able to pick — fall back to draft.
          status: body.data.status === 'published' ? 'published' : 'draft',
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Gagal memuat FAQ');
        router.push('/dashboard/faq');
      });

    return () => {
      cancelled = true;
    };
  }, [faqId, isNew, reset, router]);

  const onSubmit = async (values: FaqFormValues) => {
    try {
      const res = await fetch(isNew ? '/api/faq' : `/api/faq/${faqId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: values.question,
          answer: values.answer,
          category: values.category || undefined,
          ...(isNew ? {} : { status: values.status }),
        }),
      });

      const body = await res.json();

      if (!body.success) {
        toast.error(body.error?.message ?? 'Gagal menyimpan FAQ');
        return;
      }

      // Saving embeds the text; surface it when that step failed so the row is
      // not silently left out of the knowledge base.
      if (body.data?.status === 'error') {
        toast.warning('FAQ tersimpan, tetapi embedding gagal. Coba Sync dari daftar FAQ.');
      } else {
        toast.success(isNew ? 'FAQ berhasil dibuat' : 'FAQ berhasil diperbarui');
      }

      router.push('/dashboard/faq');
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast.error('Gagal menyimpan FAQ');
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/faq')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isNew ? 'Buat FAQ' : 'Edit FAQ'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isNew
              ? 'Tambahkan pertanyaan baru ke knowledge base'
              : `Dibuat ${faq ? new Date(faq.createdAt).toLocaleDateString('id-ID') : ''}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Detail FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question */}
                <div>
                  <label htmlFor="question" className="text-sm font-medium text-foreground">
                    Pertanyaan
                  </label>
                  <Input
                    id="question"
                    placeholder="mis. Bagaimana cara reset password?"
                    aria-invalid={Boolean(errors.question)}
                    {...register('question')}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs font-medium text-destructive">{errors.question?.message}</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {question?.length ?? 0}/500
                    </p>
                  </div>
                </div>

                {/* Answer */}
                <div>
                  <label htmlFor="answer" className="text-sm font-medium text-foreground">
                    Jawaban
                  </label>
                  <Textarea
                    id="answer"
                    placeholder="Jawaban lengkap yang akan dipakai AI sebagai rujukan"
                    rows={10}
                    aria-invalid={Boolean(errors.answer)}
                    {...register('answer')}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs font-medium text-destructive">{errors.answer?.message}</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {answer?.length ?? 0}/5000
                    </p>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="text-sm font-medium text-foreground">
                    Kategori
                  </label>
                  <Input
                    id="category"
                    placeholder="mis. Akun, Pembayaran, Pengiriman"
                    aria-invalid={Boolean(errors.category)}
                    {...register('category')}
                  />
                  <p className="text-xs font-medium text-destructive mt-1">{errors.category?.message}</p>
                </div>

                {/* Status — only meaningful when editing */}
                {!isNew && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <Select
                      aria-label="Status FAQ"
                      value={status}
                      onValueChange={(value) =>
                        setValue('status', value as 'draft' | 'published', {
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Terbit</SelectItem>
                        <SelectItem value="draft">Draf</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs font-medium text-muted-foreground mt-1">
                      Hanya FAQ berstatus terbit yang dipakai menjawab di chat.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isSubmitting || (!isNew && !isDirty)}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Simpan FAQ
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/faq')}
                  >
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {!isNew && faq && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Saat Ini</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    {faq.status === 'published' && (
                      <Badge className="bg-primary/10 text-primary">
                        Terbit
                      </Badge>
                    )}
                    {faq.status === 'draft' && (
                      <Badge className="bg-secondary text-secondary-foreground">
                        Draf
                      </Badge>
                    )}
                    {faq.status === 'error' && (
                      <Badge className="bg-destructive/10 text-destructive">
                        Bermasalah
                      </Badge>
                    )}
                  </div>
                  {faq.status === 'error' && (
                    <p className="text-xs font-medium text-destructive">
                      Embedding terakhir gagal. Menyimpan ulang akan mencobanya lagi.
                    </p>
                  )}
                  <div>
                    <p className="text-muted-foreground">Terakhir diubah</p>
                    <p className="font-medium text-foreground">
                      {new Date(faq.updatedAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dipakai menjawab</p>
                    <p className="font-medium text-foreground">{faq.usageCount}x</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cara Kerja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Menyimpan FAQ langsung membuat embedding dan memasukkannya ke vector store,
                  jadi jawabannya bisa langsung dipakai di chat.
                </p>
                <p>
                  Pertanyaan dan jawaban digabung menjadi satu chunk — tidak dipecah seperti SOP.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
