'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Search, ShieldBan, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  const loadAdmins = useCallback(async () => {
    const params = new URLSearchParams({ search, pageSize: '100' });
    const response = await fetch(`/api/admins?${params}`);
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message ?? 'Failed to load administrators');
    }
    return body.data as AdminAccount[];
  }, [search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAdmins(await loadAdmins());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load administrators');
    } finally {
      setLoading(false);
    }
  }, [loadAdmins]);

  useEffect(() => {
    let cancelled = false;

    loadAdmins()
      .then((rows) => {
        if (!cancelled) setAdmins(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load administrators');
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
      toast.error('Password must be at least 8 characters');
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
        throw new Error(body.error?.message ?? 'Failed to save administrator');
      }

      toast.success(editing ? 'Administrator updated' : 'Administrator created');
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save administrator');
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
        ? window.prompt('Reason for blocking this administrator:')
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
        throw new Error(body.error?.message ?? 'Failed to update account status');
      }

      toast.success(`Administrator ${status === 'active' ? 'activated' : status}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update account status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage Super Admin and operational Admin accounts.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Add administrator
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administrative accounts</CardTitle>
          <CardDescription>
            Passwords are write-only and are never returned by the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search username or display name"
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {admin.status}
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
                              <span className="sr-only">Deactivate {admin.username}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updateStatus(admin, 'blocked')}
                            >
                              <ShieldBan className="size-4 text-destructive" />
                              <span className="sr-only">Block {admin.username}</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => updateStatus(admin, 'active')}
                          >
                            <ShieldCheck className="size-4" />
                            <span className="sr-only">Activate {admin.username}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No administrators found.
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
              <DialogTitle>{editing ? 'Edit administrator' : 'Add administrator'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Leave password empty to keep the existing password.'
                  : 'Create credentials for a new administrative account.'}
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
                  Display name
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
                  {editing ? 'New password' : 'Password'}
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
                <label className="text-sm font-medium">Role</label>
                <Select
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
                  <label className="text-sm font-medium">Initial status</label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as AdminForm['status'] })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
