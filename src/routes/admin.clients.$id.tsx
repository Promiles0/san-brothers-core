import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { downloadDocsAsZip, downloadSingle } from "@/lib/admin/download-zip";

export const Route = createFileRoute("/admin/clients/$id")({ component: AdminClientDetail });

interface ClientRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  last_login_at: string | null;
  preferred_language: string | null;
  profile_picture_url: string | null;
}

interface RequestRow {
  id: string;
  status: string;
  service_category: string;
  created_at: string;
  updated_at: string;
  assigned_staff_id: string | null;
  service: { name_en: string } | null;
}

interface PaymentRow {
  id: string;
  amount_rwf: number | null;
  method: string | null;
  status: string;
  created_at: string;
}

interface DocRow {
  id: string;
  file_name: string | null;
  file_path: string;
  file_size_bytes: number | null;
  uploaded_at: string;
  service_request_id: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function AdminClientDetail() {
  const { id } = Route.useParams();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: r }, { data: p }, { data: d }, { data: a }, { data: u }] = await Promise.all([
        supabase.from("users").select("id,email,full_name,phone,status,created_at,last_login_at,preferred_language,profile_picture_url").eq("id", id).maybeSingle(),
        supabase.from("service_requests").select("id,status,service_category,created_at,updated_at,assigned_staff_id,service:services(name_en)").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("payments").select("id,amount_rwf,method,status,created_at").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("documents").select("id,file_name,file_path,file_size_bytes,uploaded_at,service_request_id").eq("client_id", id).order("uploaded_at", { ascending: false }),
        supabase.from("audit_log").select("id,action,created_at,metadata").eq("target_id", id).order("created_at", { ascending: false }).limit(50),
        supabase.from("users").select("id,full_name,email").neq("role", "client"),
      ]);
      setClient((c as ClientRow | null) ?? null);
      setRequests(((r as unknown) as RequestRow[]) ?? []);
      setPayments(((p as unknown) as PaymentRow[]) ?? []);
      setDocuments(((d as unknown) as DocRow[]) ?? []);
      setAudit(((a as unknown) as AuditRow[]) ?? []);
      const m = new Map<string, string>();
      for (const su of ((u as unknown) as { id: string; full_name: string | null; email: string }[]) ?? []) {
        m.set(su.id, su.full_name ?? su.email);
      }
      setStaffMap(m);
      setLoading(false);
    })();
  }, [id]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => !["completed", "cancelled", "rejected"].includes(r.status)).length;
    const completed = requests.filter((r) => r.status === "completed").length;
    const paid = payments.filter((p) => p.status === "completed").reduce((a, p) => a + (p.amount_rwf ?? 0), 0);
    return { total, pending, completed, paid };
  }, [requests, payments]);

  const docsByCase = useMemo(() => {
    const m = new Map<string, DocRow[]>();
    for (const d of documents) {
      const key = d.service_request_id ?? "_unlinked";
      const arr = m.get(key) ?? [];
      arr.push(d);
      m.set(key, arr);
    }
    return m;
  }, [documents]);

  const downloadAll = async () => {
    if (documents.length === 0) return toast.error("No documents");
    setZipping(true);
    try {
      const reqMap = new Map(requests.map((r) => [r.id, r.service_category]));
      await downloadDocsAsZip(
        documents.map((d) => ({
          file_path: d.file_path,
          file_name: d.file_name,
          folder: d.service_request_id ? (reqMap.get(d.service_request_id) ?? "case") : "unlinked",
        })),
        `${(client?.full_name ?? client?.email ?? "client").replace(/\s+/g, "_")}_documents`,
      );
      toast.success("Downloaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setZipping(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Link to="/admin/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to clients
        </Link>
        <p className="text-sm text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to clients
      </Link>

      <div className="flex items-start gap-4">
        {client.profile_picture_url ? (
          <img src={client.profile_picture_url} alt="" className="h-16 w-16 rounded-full border border-border object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
            {(client.full_name ?? client.email).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.full_name ?? client.email}</h1>
          <p className="text-sm text-muted-foreground">{client.email} {client.phone && `· ${client.phone}`}</p>
          <p className="text-xs text-muted-foreground">Language: {client.preferred_language ?? "—"} · Joined {new Date(client.created_at).toLocaleDateString()}</p>
        </div>
        <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">{client.status}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cases">Cases ({requests.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total cases", value: stats.total },
              { label: "Pending", value: stats.pending },
              { label: "Completed", value: stats.completed },
              { label: "Total paid", value: `${stats.paid.toLocaleString()} RWF` },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {audit.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p>{a.action}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          <Card>
            <CardContent className="p-0">
              {requests.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No service requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned staff</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.service?.name_en ?? "—"}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{r.service_category}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.assigned_staff_id ? (staffMap.get(r.assigned_staff_id) ?? "—") : <span className="italic">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={downloadAll} disabled={zipping || documents.length === 0}>
              {zipping ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Package className="mr-1.5 h-3.5 w-3.5" />}
              Download all documents
            </Button>
          </div>
          {Array.from(docsByCase.entries()).map(([caseId, docs]) => {
            const req = requests.find((r) => r.id === caseId);
            return (
              <Card key={caseId}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {req ? `${req.service?.name_en ?? req.service_category} · ${caseId.slice(0, 8)}` : "Unlinked documents"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded border border-border px-3 py-1.5 text-sm">
                      <span className="flex-1 truncate">{d.file_name ?? "Untitled"}</span>
                      <span className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleDateString()}</span>
                      <Button size="sm" variant="ghost" onClick={() => downloadSingle(d.file_path, d.file_name).catch((e) => toast.error((e as Error).message))}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
          {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-0">
              {audit.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No audit entries.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audit.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.action}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {a.metadata ? JSON.stringify(a.metadata).slice(0, 80) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
