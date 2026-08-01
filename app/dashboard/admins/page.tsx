'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Search, ShieldBan, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableError,
} from '@/components/dashboard/dashboard-ui';

interface AdminAccount {
  id: string;
  username: string;
  displayName: string | null;
  role: 'super_admin' | 'admin';
  status: 'active' | 'inactive' | 'blocked';
  blockedAt: string | null;
  blockReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminForm {
  username: string;
  displayName: string;
  password: string;
  role: AdminAccount['role'];
  status: 'active' | 'inactive';
}

const EMPTY_FORM: AdminForm = {
  username: '',
  displayName: '',
  password: '',
  role: 'admin',
  status: 'active',
};

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState<AdminForm>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadAdmins = useCallback(async () => {
    const params = new URLSearchParams({ search, pageSize: '100' });
    const response = await fetch(`/api/admins?${params}`);
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message ?? 'Gagal memuat administrator');
    }
    return body.data as AdminAccount[];
  }, [search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setAdmins(await loadAdmins());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat administrator');
      toast.error(error instanceof Error ? error.message : 'Gagal memuat administrator');
    } finally {
      setLoading(false);
    }
  }, [loadAdmins]);

  useEffect(() => {
    let cancelled = false;

    loadAdmins()
      .then((rows) => {
        if (!cancelled) {
          setAdmins(rows);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Gagal memuat administrator');
          toast.error(error instanceof Error ? error.message : 'Gagal memuat administrator');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadAdmins]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (admin: AdminAccount) => {
    setEditing(admin);
    setForm({
      username: admin.username,
      displayName: admin.displayName ?? '',
      password: '',
      role: admin.role,
      status: admin.status === 'inactive' ? 'inactive' : 'active',
    });
    setDialogOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing && form.password.length < 8) {
      toast.error('Kata sandi minimal 8 karakter');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/admins/${editing.id}` : '/api/admins', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          displayName: form.displayName || null,
          role: form.role,
          ...(!editing ? { status: form.status } : {}),
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? 'Gagal menyimpan administrator');
      }

      toast.success(editing ? 'Administrator berhasil diperbarui' : 'Administrator berhasil dibuat');
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan administrator');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    admin: AdminAccount,
    status: AdminAccount['status']
  ) => {
    const blockReason =
      status === 'blocked'
        ? window.prompt('Alasan memblokir administrator ini:')
        : undefined;
    if (status === 'blocked' && !blockReason?.trim()) return;

    try {
      const response = await fetch(`/api/admins/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(blockReason ? { blockReason: blockReason.trim() } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? 'Gagal memperbarui status akun');
      }

      toast.success(status === 'active' ? 'Administrator diaktifkan' : status === 'blocked' ? 'Administrator diblokir' : 'Administrator dinonaktifkan');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui status akun');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola akun Super Admin dan Admin operasional.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Tambah admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Akun administrator</CardTitle>
          <CardDescription>
            Kata sandi hanya dapat ditulis dan tidak pernah dikembalikan oleh API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari username atau nama tampilan"
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <TableError message={loadError} onRetry={refresh} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="font-medium">{admin.displayName || admin.username}</div>
                      <div className="text-xs text-muted-foreground">@{admin.username}</div>
                      {admin.blockReason && (
                        <div className="mt-1 text-xs text-destructive">{admin.blockReason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={admin.status === 'active' ? 'default' : 'secondary'}
                        className={admin.status === 'blocked' ? 'text-destructive' : undefined}
                      >
                        {admin.status === 'active' ? 'Aktif' : admin.status === 'blocked' ? 'Diblokir' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(admin.updatedAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(admin)}>
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit {admin.username}</span>
                        </Button>
                        {admin.status === 'active' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updateStatus(admin, 'inactive')}
                            >
                              <ShieldBan className="size-4" />
                              <span className="sr-only">Nonaktifkan {admin.username}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updateStatus(admin, 'blocked')}
                            >
                              <ShieldBan className="size-4 text-destructive" />
                              <span className="sr-only">Blokir {admin.username}</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => updateStatus(admin, 'active')}
                          >
                            <ShieldCheck className="size-4" />
                            <span className="sr-only">Aktifkan {admin.username}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Tidak ada administrator ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit administrator' : 'Tambah administrator'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Biarkan kata sandi kosong untuk mempertahankan kata sandi saat ini.'
                  : 'Buat kredensial untuk akun administrator baru.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <label htmlFor="admin-username" className="text-sm font-medium">Username</label>
                <Input
                  id="admin-username"
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  minLength={3}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label htmlFor="admin-display-name" className="text-sm font-medium">
                  Nama tampilan
                </label>
                <Input
                  id="admin-display-name"
                  value={form.displayName}
                  onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                  maxLength={200}
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="text-sm font-medium">
                  {editing ? 'Kata sandi baru' : 'Kata sandi'}
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  minLength={editing ? undefined : 8}
                  maxLength={128}
                  required={!editing}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Peran</label>
                <Select
                  aria-label="Peran"
                  value={form.role}
                  onValueChange={(value) =>
                    setForm({ ...form, role: value as AdminAccount['role'] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editing && (
                <div>
                  <label className="text-sm font-medium">Status awal</label>
                  <Select
                    aria-label="Status awal"
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as AdminForm['status'] })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
