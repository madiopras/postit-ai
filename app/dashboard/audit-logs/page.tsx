"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Search, ShieldCheck } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/dashboard/dashboard-ui";

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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/audit-logs?${params}`);
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message || "Gagal memuat log audit");
      }
      setLogs(body.data);
      setTotalPages(Math.max(1, body.meta.totalPages));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat log audit");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timeout = window.setTimeout(load, 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log audit</h1>
        <p className="mt-1 text-sm text-fg-tertiary">
          Riwayat keamanan append-only untuk perubahan administratif.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas administratif</CardTitle>
          <CardDescription>Cari berdasarkan pelaku atau ID entitas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              maxLength={100}
              placeholder="Cari pelaku atau ID entitas"
              className="pl-9"
            />
          </div>

          {error ? (
            <div role="alert" className="flex flex-col gap-3 rounded-ui-lg border border-error-border bg-error-bg p-4 text-sm text-error-fg sm:flex-row sm:items-center">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                {error}
              </span>
              <Button variant="outline" size="sm" className="sm:ml-auto" onClick={load}>
                Coba lagi
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-2" aria-label="Memuat log audit">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-13 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-fg-tertiary">
              <ShieldCheck className="mx-auto mb-2 size-6" aria-hidden="true" />
              Tidak ada aktivitas audit yang cocok.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Pelaku</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="align-top">
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div>{log.actorUsername}</div>
                      <div className="text-xs text-fg-tertiary">{log.actorRole}</div>
                    </TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      <div>{log.entityType}</div>
                      <div className="max-w-48 truncate text-xs text-fg-tertiary">
                        {log.entityId || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="block max-w-sm whitespace-pre-wrap break-all text-xs">
                        {JSON.stringify(log.metadata)}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!error && !loading && logs.length > 0 && (
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-fg-tertiary">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
