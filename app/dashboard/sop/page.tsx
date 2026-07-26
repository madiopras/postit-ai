"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, FileText, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SOP {
  id: string;
  title: string;
  category: string | null;
  status: "draft" | "published" | "error";
  createdAt: string;
  updatedAt: string;
}

export default function SOPPage() {
  const router = useRouter();
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSOPs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sop");
      if (!res.ok) throw new Error("Failed to fetch SOPs");
      const result = await res.json();
      if (result.success) {
        setSops(result.data);
      } else {
        throw new Error(result.error?.message || "Failed to fetch SOPs");
      }
    } catch (error) {
      toast.error("Failed to load SOPs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOPs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SOP?")) return;

    try {
      const res = await fetch(`/api/sop/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("SOP deleted successfully");
      fetchSOPs();
    } catch (error) {
      toast.error("Failed to delete SOP");
    }
  };

  const filteredSOPs = sops.filter(
    (sop) =>
      sop.title.toLowerCase().includes(search.toLowerCase()) ||
      (sop.category && sop.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SOP Management</h1>
          <p className="text-muted-foreground">
            Manage Standard Operating Procedures
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/sop/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New SOP
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All SOPs</CardTitle>
          <CardDescription>
            A list of all SOPs including their title, category, and status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SOPs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading SOPs...
            </div>
          ) : filteredSOPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No SOPs found" : "No SOPs yet. Create your first one!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {sop.status}
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
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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