"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableError,
} from "@/components/dashboard/dashboard-ui";
import { Plus, Search, FileText, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SOP {
  id: string;
  title: string;
  category: string | null;
  status: "draft" | "published" | "error";
  requiresLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SOPPage() {
  const router = useRouter();
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");

  /** Plain fetch with no state writes, so the effect below can call it. */
  const loadSOPs = useCallback(async (): Promise<SOP[]> => {
    const res = await fetch("/api/sop");
    if (!res.ok) throw new Error("Gagal memuat SOP");
    const result = await res.json();
    if (!result.success) throw new Error(result.error?.message || "Gagal memuat SOP");
    return result.data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setSops(await loadSOPs());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Gagal memuat SOP");
      toast.error("Gagal memuat SOP");
    } finally {
      setLoading(false);
    }
  }, [loadSOPs]);

  // `cancelled` guards against a response landing after unmount.
  useEffect(() => {
    let cancelled = false;

    loadSOPs()
      .then((data) => {
        if (cancelled) return;
        setSops(data);
        setLoadError("");
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error("Gagal memuat SOP");
        setLoadError(error instanceof Error ? error.message : "Gagal memuat SOP");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadSOPs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus SOP ini? Tindakan ini tidak dapat dibatalkan.")) return;

    try {
      const res = await fetch(`/api/sop/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus SOP");

      toast.success("SOP berhasil dihapus");
      refresh();
    } catch {
      toast.error("Gagal menghapus SOP");
    }
  };

  const filteredSOPs = sops.filter(
    (sop) =>
      sop.title.toLowerCase().includes(search.toLowerCase()) ||
      (sop.category && sop.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola SOP</h1>
          <p className="text-muted-foreground">
            Kelola prosedur operasional yang menjadi rujukan jawaban AI.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/sop/new")}>
          <Plus className="mr-2 h-4 w-4" />
          SOP baru
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar SOP</CardTitle>
          <CardDescription>
            Tinjau judul, kategori, status publikasi, dan akses setiap SOP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari judul atau kategori SOP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat SOP…
            </div>
          ) : loadError ? (
            <TableError message={loadError} onRetry={refresh} />
          ) : filteredSOPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Tidak ada SOP yang cocok." : "Belum ada SOP. Buat SOP pertama Anda."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Akses</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSOPs.map((sop) => (
                  <TableRow key={sop.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {sop.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sop.category ? (
                        <Badge variant="secondary">{sop.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sop.status === "published" ? "default" : "secondary"
                        }
                      >
                        {sop.status === "published" ? "Terbit" : sop.status === "draft" ? "Draf" : "Error"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sop.requiresLogin ? "secondary" : "outline"}>
                        {sop.requiresLogin ? "Wajib login" : "Publik"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(sop.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/sop/${sop.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit {sop.title}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Hapus {sop.title}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
