import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { downloadDocsAsZip, downloadSingle, getSignedUrl } from "@/lib/admin/download-zip";

export const Route = createFileRoute("/admin/documents")({ component: AdminDocuments });

interface DocRow {
  id: string;
  file_name: string | null;
  file_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  service_request_id: string | null;
  client_id: string | null;
}

interface CaseRow {
  id: string;
  service_category: string;
  created_at: string;
  client_id: string | null;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface ClientGroup {
  client: UserRow;
  cases: { case: CaseRow; docs: DocRow[] }[];
  unlinkedDocs: DocRow[];
  totalDocs: number;
}

function fmtSize(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function AdminDocuments() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: c }, { data: u }] = await Promise.all([
      supabase
        .from("documents")
        .select("id,file_name,file_path,file_type,file_size_bytes,uploaded_at,service_request_id,client_id")
        .order("uploaded_at", { ascending: false }),
      supabase.from("service_requests").select("id,service_category,created_at,client_id"),
      supabase.from("users").select("id,full_name,email"),
    ]);
    setDocs((d as DocRow[]) ?? []);
    setCases((c as CaseRow[]) ?? []);
    setUsers((u as UserRow[]) ?? []);
    setLoading(false);
  }

  const groups: ClientGroup[] = useMemo(() => {
    const caseMap = new Map(cases.map((cs) => [cs.id, cs]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const byClient = new Map<string, DocRow[]>();
    for (const d of docs) {
      const cid = d.client_id ?? "_unknown";
      const arr = byClient.get(cid) ?? [];
      arr.push(d);
      byClient.set(cid, arr);
    }
    const result: ClientGroup[] = [];
    for (const [cid, list] of byClient) {
      const client = userMap.get(cid) ?? { id: cid, full_name: null, email: "Unknown client" };
      const byCase = new Map<string, DocRow[]>();
      const unlinked: DocRow[] = [];
      for (const dd of list) {
        if (dd.service_request_id) {
          const arr = byCase.get(dd.service_request_id) ?? [];
          arr.push(dd);
          byCase.set(dd.service_request_id, arr);
        } else {
          unlinked.push(dd);
        }
      }
      const caseList = Array.from(byCase).map(([cid2, dlist]) => ({
        case:
          caseMap.get(cid2) ?? { id: cid2, service_category: "unknown", created_at: "", client_id: cid },
        docs: dlist,
      }));
      result.push({ client, cases: caseList, unlinkedDocs: unlinked, totalDocs: list.length });
    }
    return result.sort((a, b) =>
      (a.client.full_name ?? a.client.email).localeCompare(b.client.full_name ?? b.client.email),
    );
  }, [docs, cases, users]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        cases: g.cases
          .map((cs) => ({
            ...cs,
            docs: cs.docs.filter((d) => d.file_name?.toLowerCase().includes(q)),
          }))
          .filter((cs) => cs.docs.length > 0 || cs.case.service_category.toLowerCase().includes(q)),
        unlinkedDocs: g.unlinkedDocs.filter((d) => d.file_name?.toLowerCase().includes(q)),
      }))
      .filter(
        (g) =>
          g.cases.length > 0 ||
          g.unlinkedDocs.length > 0 ||
          (g.client.full_name ?? g.client.email).toLowerCase().includes(q),
      );
  }, [groups, search]);

  const currentGroup = selectedClient ? groups.find((g) => g.client.id === selectedClient) : null;
  const currentCase = currentGroup && selectedCase
    ? currentGroup.cases.find((c) => c.case.id === selectedCase)
    : null;

  const visibleDocs: DocRow[] = currentCase
    ? currentCase.docs
    : currentGroup
      ? [...currentGroup.cases.flatMap((c) => c.docs), ...currentGroup.unlinkedDocs]
      : [];

  const toggleExpand = (cid: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(cid) ? n.delete(cid) : n.add(cid);
      return n;
    });

  const toggleCheck = (id: string) =>
    setChecked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handlePreview = async (d: DocRow) => {
    const url = await getSignedUrl(d.file_path);
    if (url) window.open(url, "_blank");
    else toast.error("Could not generate preview link");
  };

  const handleDownload = async (d: DocRow) => {
    try {
      await downloadSingle(d.file_path, d.file_name);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const zipSelected = async () => {
    const items = visibleDocs.filter((d) => checked.has(d.id));
    if (items.length === 0) return toast.error("Select documents first");
    setZipping(true);
    try {
      const name = currentGroup
        ? (currentGroup.client.full_name ?? currentGroup.client.email).replace(/\s+/g, "_")
        : "documents";
      await downloadDocsAsZip(items, `${name}_selected`);
      toast.success(`Zipped ${items.length} documents`);
      setChecked(new Set());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setZipping(false);
    }
  };

  const zipAllForClient = async (group: ClientGroup) => {
    const items = [...group.cases.flatMap((c) => c.docs.map((d) => ({ ...d, folder: c.case.service_category }))), ...group.unlinkedDocs];
    if (items.length === 0) return toast.error("No documents");
    setZipping(true);
    try {
      const name = (group.client.full_name ?? group.client.email).replace(/\s+/g, "_");
      await downloadDocsAsZip(
        items.map((d) => ({ file_path: d.file_path, file_name: d.file_name, folder: (d as { folder?: string }).folder })),
        `${name}_all_documents`,
      );
      toast.success(`Zipped ${items.length} documents`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Browse client documents by folder. Download individually or as a ZIP.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents or clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="lg:max-h-[calc(100vh-200px)]">
          <CardContent className="p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No documents found.</p>
            ) : (
              <ScrollArea className="h-[calc(100vh-240px)]">
                <div className="space-y-0.5 p-1">
                  {filteredGroups.map((g) => {
                    const open = expanded.has(g.client.id);
                    const active = selectedClient === g.client.id && !selectedCase;
                    return (
                      <div key={g.client.id}>
                        <div
                          className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm hover:bg-muted/50 ${active ? "bg-muted" : ""}`}
                        >
                          <button onClick={() => toggleExpand(g.client.id)} className="p-0.5">
                            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            className="flex flex-1 items-center gap-1.5 truncate text-left"
                            onClick={() => {
                              setSelectedClient(g.client.id);
                              setSelectedCase(null);
                              setChecked(new Set());
                            }}
                          >
                            {open ? <FolderOpen className="h-3.5 w-3.5 text-primary" /> : <Folder className="h-3.5 w-3.5 text-primary" />}
                            <span className="truncate">{g.client.full_name ?? g.client.email}</span>
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              {g.totalDocs}
                            </Badge>
                          </button>
                        </div>
                        {open && (
                          <div className="ml-5 space-y-0.5 border-l border-border pl-2">
                            {g.cases.map((cs) => {
                              const a2 = selectedCase === cs.case.id;
                              return (
                                <button
                                  key={cs.case.id}
                                  className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-muted/50 ${a2 ? "bg-muted" : ""}`}
                                  onClick={() => {
                                    setSelectedClient(g.client.id);
                                    setSelectedCase(cs.case.id);
                                    setChecked(new Set());
                                  }}
                                >
                                  <Folder className="h-3 w-3" />
                                  <span className="capitalize">{cs.case.service_category}</span>
                                  <span className="text-muted-foreground">· {cs.case.id.slice(0, 6)}</span>
                                  <Badge variant="outline" className="ml-auto text-[10px]">
                                    {cs.docs.length}
                                  </Badge>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Documents
                {currentGroup && (
                  <>
                    {" › "}
                    <span className="text-foreground">{currentGroup.client.full_name ?? currentGroup.client.email}</span>
                  </>
                )}
                {currentCase && (
                  <>
                    {" › "}
                    <span className="text-foreground capitalize">{currentCase.case.service_category}</span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {currentGroup && (
                  <Button size="sm" variant="outline" onClick={() => zipAllForClient(currentGroup)} disabled={zipping}>
                    <Package className="mr-1.5 h-3.5 w-3.5" />
                    Download all for client
                  </Button>
                )}
                <Button size="sm" onClick={zipSelected} disabled={zipping || checked.size === 0}>
                  {zipping ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                  Download selected ({checked.size})
                </Button>
              </div>
            </div>

            {!currentGroup ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-muted-foreground">
                <FolderOpen className="h-10 w-10 opacity-50" />
                Select a client or case from the folder tree to view documents.
              </div>
            ) : visibleDocs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No documents in this folder.</p>
            ) : (
              <div className="divide-y divide-border rounded border border-border">
                {visibleDocs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30">
                    <Checkbox checked={checked.has(d.id)} onCheckedChange={() => toggleCheck(d.id)} />
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.file_name ?? "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtSize(d.file_size_bytes)} · {new Date(d.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    {d.file_type && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {d.file_type.split("/").pop()}
                      </Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handlePreview(d)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(d)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
