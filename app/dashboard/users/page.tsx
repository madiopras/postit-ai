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

interface UserAccount {
  id: string;
  username: string;
  displayName: string | null;
  status: 'active' | 'inactive' | 'blocked';
  blockedAt: string | null;
  blockReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserForm {
  username: string;
  displayName: string;
  password: string;
  status: 'active' | 'inactive';
}

const EMPTY_FORM: UserForm = {
  username: '',
  displayName: '',
  password: '',
  status: 'active',
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ search, pageSize: '100' });
    const response = await fetch(`/api/users?${params}`);
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message ?? 'Gagal memuat pengguna');
    }
    return body.data as UserAccount[];
  }, [search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setUsers(await loadUsers());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat pengguna');
      toast.error(error instanceof Error ? error.message : 'Gagal memuat pengguna');
    } finally {
      setLoading(false);
    }
  }, [loadUsers]);

  useEffect(() => {
    let cancelled = false;

    loadUsers()
      .then((rows) => {
        if (!cancelled) {
          setUsers(rows);
          setLoadError('');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Gagal memuat pengguna');
          toast.error(error instanceof Error ? error.message : 'Gagal memuat pengguna');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (user: UserAccount) => {
    setEditing(user);
    setForm({
      username: user.username,
      displayName: user.displayName ?? '',
      password: '',
      status: user.status === 'inactive' ? 'inactive' : 'active',
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
      const response = await fetch(editing ? `/api/users/${editing.id}` : '/api/users', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          displayName: form.displayName || null,
          ...(!editing ? { status: form.status } : {}),
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? 'Gagal menyimpan pengguna');
      }

      toast.success(editing ? 'Pengguna berhasil diperbarui' : 'Pengguna berhasil dibuat');
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pengguna');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    user: UserAccount,
    status: UserAccount['status']
  ) => {
    const blockReason =
      status === 'blocked'
        ? window.prompt('Alasan memblokir pengguna ini:')
        : undefined;
    if (status === 'blocked' && !blockReason?.trim()) return;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(blockReason ? { blockReason: blockReason.trim() } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? 'Gagal memperbarui status pengguna');
      }

      toast.success(status === 'active' ? 'Pengguna diaktifkan' : status === 'blocked' ? 'Pengguna diblokir' : 'Pengguna dinonaktifkan');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui status pengguna');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola pengguna</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat dan kelola akun pengguna. Pendaftaran mandiri dinonaktifkan.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Tambah pengguna
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Akun pengguna</CardTitle>
          <CardDescription>
            Akun ini dapat masuk ke chat PostIt AI, tetapi tidak dapat membuka dashboard.
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
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.displayName || user.username}</div>
                      <div className="text-xs text-muted-foreground">@{user.username}</div>
                      {user.blockReason && (
                        <div className="mt-1 text-xs text-destructive">{user.blockReason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                        className={user.status === 'blocked' ? 'text-destructive' : undefined}
                      >
                        {user.status === 'active' ? 'Aktif' : user.status === 'blocked' ? 'Diblokir' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.updatedAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(user)}>
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit {user.username}</span>
                        </Button>
                        {user.status === 'active' ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updateStatus(user, 'inactive')}
                            >
                              <ShieldBan className="size-4" />
                              <span className="sr-only">Nonaktifkan {user.username}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updateStatus(user, 'blocked')}
                            >
                              <ShieldBan className="size-4 text-destructive" />
                              <span className="sr-only">Blokir {user.username}</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => updateStatus(user, 'active')}
                          >
                            <ShieldCheck className="size-4" />
                            <span className="sr-only">Aktifkan {user.username}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      Tidak ada pengguna ditemukan.
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
              <DialogTitle>{editing ? 'Edit pengguna' : 'Tambah pengguna'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Biarkan kata sandi kosong untuk mempertahankan kata sandi saat ini.'
                  : 'Buat kredensial untuk pengguna baru PostIt AI.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <label htmlFor="user-username" className="text-sm font-medium">Username</label>
                <Input
                  id="user-username"
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  minLength={3}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label htmlFor="user-display-name" className="text-sm font-medium">
                  Nama tampilan
                </label>
                <Input
                  id="user-display-name"
                  value={form.displayName}
                  onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                  maxLength={200}
                />
              </div>
              <div>
                <label htmlFor="user-password" className="text-sm font-medium">
                  {editing ? 'Kata sandi baru' : 'Kata sandi'}
                </label>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  minLength={editing ? undefined : 8}
                  maxLength={128}
                  required={!editing}
                  autoComplete="new-password"
                />
              </div>
              {!editing && (
                <div>
                  <label className="text-sm font-medium">Status awal</label>
                  <Select
                    aria-label="Status awal"
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as UserForm['status'] })
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
