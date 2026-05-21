import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, FileText, Search, Download, Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/documents")({
  component: DocumentsPage,
});

interface DocRow {
  id: string;
  file_name: string;
  file_size_bytes: number | null;
  file_path: string;
  status: string;
  uploaded_at: string;
  service_request_id: string;
  service_requests: {
    id: string;
    created_at: string;
    services: { name_en: string; name_zh: string | null; name_rw: string | null } | null;
  } | null;
}

function DocumentsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("id,file_name,file_size_bytes,file_path,status,uploaded_at,service_request_id,service_requests(id,created_at,services(name_en,name_zh,name_rw))")
          .eq("client_id", user.id)
          .order("uploaded_at", { ascending: false });
        if (error) throw error;
        setDocs((data as unknown as DocRow[]) ?? []);
      } catch (e) {
        toast.error((e as Error).message);
        setDocs([]);
      }
    })();
  }, [user]);

  const folders = useMemo(() => {
    if (!docs) return [];
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const d of docs) {
      const sr = d.service_requests;
      if (!sr) continue;
      const name = (locale === "zh" && sr.services?.name_zh) || (locale === "rw" && sr.services?.name_rw) || sr.services?.name_en || t("dashboard.documents.untitled");
      const label = `${name} (${new Date(sr.created_at).toLocaleDateString()})`;
      const existing = map.get(sr.id);
      if (existing) existing.count++;
      else map.set(sr.id, { id: sr.id, label, count: 1 });
    }
    return Array.from(map.values());
  }, [docs, locale, t]);

  const filteredDocs = useMemo(() => {
    if (!docs) return [];
    return docs.filter((d) => {
      if (activeFolder && d.service_request_id !== activeFolder) return false;
      if (query && !d.file_name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [docs, activeFolder, query]);

  const download = async (d: DocRow) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(d.file_path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.documents.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.documents.subtitle")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("dashboard.documents.searchPlaceholder")} className="pl-9 max-w-md" />
      </div>

      {docs === null ? (
        <Skeleton className="h-60" />
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-md">{t("dashboard.documents.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <aside className="space-y-1">
            <button
              onClick={() => setActiveFolder(null)}
              className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                !activeFolder && "bg-accent")}
            >
              <Folder className="h-4 w-4" /> <span className="flex-1 text-left">{t("dashboard.documents.allFiles")}</span>
              <span className="text-xs text-muted-foreground">{docs.length}</span>
            </button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => setActiveFolder(f.id)}
                className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                  activeFolder === f.id && "bg-accent")}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{f.label}</span>
                <span className="text-xs text-muted-foreground">{f.count}</span>
              </button>
            ))}
          </aside>
          <div className="space-y-2">
            {filteredDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.documents.noMatch")}</p>
            ) : filteredDocs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(1)} KB · ` : ""}
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <StatusBadge status={d.status} />
                <Button size="sm" variant="ghost" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
