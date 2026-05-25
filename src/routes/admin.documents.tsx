import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/documents")({ component: AdminDocuments });

interface DocRow {
  id: string;
  file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  service_request_id: string | null;
  uploaded_by: string | null;
  uploaderName: string | null;
  uploaderEmail: string | null;
}

function AdminDocuments() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: docs }, { data: users }] = await Promise.all([
        supabase
          .from("documents")
          .select("id, file_name, file_type, file_size_bytes, uploaded_at, service_request_id, uploaded_by")
          .order("uploaded_at", { ascending: false })
          .limit(300),
        supabase.from("users").select("id, full_name, email"),
      ]);

      const userMap = new Map<string, { full_name: string | null; email: string }>();
      for (const u of users ?? []) {
        userMap.set(u.id, { full_name: u.full_name, email: u.email });
      }

      const joined: DocRow[] = (docs ?? []).map((d: any) => {
        const u = d.uploaded_by ? userMap.get(d.uploaded_by) : undefined;
        return {
          ...d,
          uploaderName: u?.full_name ?? null,
          uploaderEmail: u?.email ?? null,
        };
      });

      setRows(joined);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.file_name?.toLowerCase().includes(q) ||
      r.uploaderName?.toLowerCase().includes(q) ||
      r.uploaderEmail?.toLowerCase().includes(q) ||
      r.file_type?.toLowerCase().includes(q)
    );
  });

  function fmtSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">All uploaded client documents — read-only.</p>
        </div>
        <Input
          placeholder="Search by name, uploader, or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${filtered.length} documents`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No documents found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.file_name ?? "Untitled"}</TableCell>
                    <TableCell>
                      {d.file_type ? (
                        <Badge variant="outline" className="uppercase text-xs">
                          {d.file_type.replace("application/", "").replace("image/", "")}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtSize(d.file_size_bytes)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.uploaderName ?? d.uploaderEmail ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.uploaded_at).toLocaleDateString()}
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
