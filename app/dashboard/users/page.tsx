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

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ search, pageSize: '100' });
    const response = await fetch(`/api/users?${params}`);
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new Error(body.error?.message ?? 'Failed to load users');
    }
    return body.data as UserAccount[];
  }, [search]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await loadUsers());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [loadUsers]);

  useEffect(() => {
    let cancelled = false;

    loadUsers()
      .then((rows) => {
        if (!cancelled) setUsers(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load users');
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
      toast.error('Password must be at least 8 characters');
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
        throw new Error(body.error?.message ?? 'Failed to save user');
      }

      toast.success(editing ? 'User updated' : 'User created');
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save user');
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
        ? window.prompt('Reason for blocking this user:')
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
        throw new Error(body.error?.message ?? 'Failed to update user status');
      }

      toast.success(`User ${status === 'active' ? 'activated' : status}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage end-user accounts. Self-registration is disabled.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Add user
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User accounts</CardTitle>
          <CardDescription>
            These accounts can sign in to Chat PostIT AI but cannot access the dashboard.
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
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {user.status}
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
                              <span className="sr-only">Deactivate {user.username}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => updateStatus(user, 'blocked')}
                            >
                              <ShieldBan className="size-4 text-destructive" />
                              <span className="sr-only">Block {user.username}</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => updateStatus(user, 'active')}
                          >
                            <ShieldCheck className="size-4" />
                            <span className="sr-only">Activate {user.username}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      No users found.
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
              <DialogTitle>{editing ? 'Edit user' : 'Add user'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Leave password empty to keep the existing password.'
                  : 'Create credentials for a new Chat PostIT AI user.'}
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
                  Display name
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
                  {editing ? 'New password' : 'Password'}
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
                  <label className="text-sm font-medium">Initial status</label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as UserForm['status'] })
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
