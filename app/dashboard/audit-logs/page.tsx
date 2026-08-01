'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';

interface AuditLog {
  id: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/audit-logs?${params}`);
      const body = await response.json();
      if (!body.success) throw new Error(body.error?.message || 'Failed to load audit logs');
      setLogs(body.data);
      setTotalPages(Math.max(1, body.meta.totalPages));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timeout = window.setTimeout(load, 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Append-only security events for administrative changes.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          maxLength={100}
          placeholder="Search actor or entity ID"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0 align-top">
                <td className="p-3 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-3">
                  <div>{log.actorUsername}</div>
                  <div className="text-xs text-muted-foreground">{log.actorRole}</div>
                </td>
                <td className="p-3 font-medium">{log.action}</td>
                <td className="p-3">
                  <div>{log.entityType}</div>
                  <div className="max-w-48 truncate text-xs text-muted-foreground">
                    {log.entityId || '—'}
                  </div>
                </td>
                <td className="p-3">
                  <code className="block max-w-sm whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(log.metadata)}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && logs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <ShieldCheck className="mx-auto mb-2 size-6" />
            {error || 'No audit events found.'}
          </div>
        )}
        {loading && <div className="p-8 text-center text-muted-foreground">Loading…</div>}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-border px-3 py-2 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
        <button
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-border px-3 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
