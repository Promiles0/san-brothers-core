import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  FolderOpen,
  FileText,
  Search,
  Download,
  Folder,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  Eye,
  UploadCloud,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function fileMeta(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext))
    return { Icon: FileText, color: "text-red-500 bg-red-500/10", kind: "pdf" as const };
  if (["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext))
    return { Icon: FileImage, color: "text-blue-500 bg-blue-500/10", kind: "image" as const };
  if (["xls", "xlsx", "csv"].includes(ext))
    return { Icon: FileSpreadsheet, color: "text-emerald-500 bg-emerald-500/10", kind: "sheet" as const };
  if (["doc", "docx"].includes(ext))
    return { Icon: FileText, color: "text-blue-600 bg-blue-600/10", kind: "doc" as const };
  return { Icon: FileIcon, color: "text-muted-foreground bg-muted", kind: "other" as const };
}

function formatSize(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function DocumentsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string; kind: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("documents")
          .select(
            "id,file_name,file_size_bytes,file_path,status,uploaded_at,service_request_id,service_requests(id,created_at,services(name_en,name_zh,name_rw))",
          )
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
      const name =
        (locale === "zh" && sr.services?.name_zh) ||
        (locale === "rw" && sr.services?.name_rw) ||
        sr.services?.name_en ||
        t("dashboard.documents.untitled");
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
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(d.file_path, 60);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const openPreview = async (d: DocRow) => {
    const meta = fileMeta(d.file_name);
    if (meta.kind !== "image" && meta.kind !== "pdf") {
      download(d);
      return;
    }
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(d.file_path, 120);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPreview({ url: data.signedUrl, name: d.file_name, kind: meta.kind });
  };

  const onDrop = (files: File[]) => {
    if (files.length > 0) {
      toast.info(
        `Selected ${files.length} file${files.length === 1 ? "" : "s"}. Open a service request to upload.`,
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.documents.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.documents.subtitle")}</p>
        </div>
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onDrop(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:bg-muted/50",
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm font-medium">Drop files here to upload</div>
        <div className="text-xs text-muted-foreground">
          or click to browse · PDF, JPG, PNG, DOCX · Max 10MB
        </div>
        <Input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={(e) => onDrop(Array.from(e.target.files ?? []))}
        />
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dashboard.documents.searchPlaceholder")}
          className="pl-9 max-w-md"
        />
      </div>

      {docs === null ? (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <Skeleton className="h-60" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-md">
              {t("dashboard.documents.empty")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <aside className="space-y-1">
            <button
              onClick={() => setActiveFolder(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                !activeFolder && "bg-accent",
              )}
            >
              <Folder className="h-4 w-4 text-primary" />{" "}
              <span className="flex-1 text-left">{t("dashboard.documents.allFiles")}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                {docs.length}
              </span>
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                  activeFolder === f.id && "bg-accent",
                )}
              >
                <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="flex-1 text-left truncate">{f.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                  {f.count}
                </span>
              </button>
            ))}
          </aside>
          <div className="space-y-2">
            {filteredDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("dashboard.documents.noMatch")}
              </p>
            ) : (
              filteredDocs.map((d) => {
                const meta = fileMeta(d.file_name);
                const previewable = meta.kind === "image" || meta.kind === "pdf";
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className={cn("grid h-10 w-10 place-items-center rounded-lg", meta.color)}>
                      <meta.Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{d.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.file_size_bytes ? `${formatSize(d.file_size_bytes)} · ` : ""}
                        {new Date(d.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                    {previewable && (
                      <Button size="icon" variant="ghost" onClick={() => openPreview(d)} title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => download(d)} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview?.kind === "image" ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : preview?.kind === "pdf" ? (
            <iframe
              src={preview.url}
              title={preview.name}
              className="h-[70vh] w-full rounded-lg border border-border"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
