import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, AlertCircle, FileText, Download, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/my-services/$id")({
  component: ServiceDetailPage,
});

interface SR {
  id: string;
  status: string;
  progress_step: number;
  progress_total: number;
  notes: string | null;
  created_at: string;
  services: { name_en: string; name_zh: string | null; name_rw: string | null } | null;
}

interface Doc {
  id: string;
  file_name: string;
  file_size_bytes: number | null;
  status: string;
  rejection_reason: string | null;
  is_final_delivery: boolean;
  file_path: string;
  uploaded_at: string;
}
const STEPS = ["submitted", "under_review", "verified", "submitted_to_authority", "completed"];

function ServiceDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [sr, setSr] = useState<SR | null | undefined>(undefined);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [srRes, docRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select(
          "id,status,progress_step,progress_total,notes,created_at,services(name_en,name_zh,name_rw)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("*")
        .eq("service_request_id", id)
        .order("uploaded_at", { ascending: false }),
    ]);
    if (srRes.error) {
      toast.error(srRes.error.message);
      setSr(null);
      return;
    }
    setSr((srRes.data as unknown as SR) ?? null);
    setDocs((docRes.data as Doc[]) ?? []);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);

  if (sr === undefined)
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  if (!sr)
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("dashboard.myServices.notFound")}</p>
      </div>
    );

  const localName =
    (locale === "zh" && sr.services?.name_zh) ||
    (locale === "rw" && sr.services?.name_rw) ||
    sr.services?.name_en ||
    "";
  const currentStep = STEPS.indexOf(sr.status);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    e.target.value = "";
    setUploading(true);
    try {
      const safe = f.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `${user.id}/clients/${id}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, f);
      if (upErr) throw upErr;
      const { error: docErr } = await supabase.from("documents").insert({
        service_request_id: id,
        client_id: user.id,
        uploaded_by: user.id,
        file_path: path,
        file_name: f.name,
        file_type: f.type || null,
        file_size_bytes: f.size,
        status: "uploaded",
      });
      if (docErr) throw docErr;
      toast.success(t("dashboard.myServices.uploadedToast"));
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const download = async (d: Doc) => {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(d.file_path, 60);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard/my-services">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("dashboard.common.back")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{localName}</h1>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.common.created")}: {new Date(sr.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={sr.status} />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.myServices.progress")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-4 md:flex-row md:items-center md:gap-2">
            {STEPS.map((s, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <li
                  key={s}
                  className="flex items-center gap-2 md:flex-col md:text-center md:flex-1"
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full text-xs font-semibold border",
                      done
                        ? "bg-green-500 text-white border-green-500"
                        : active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      active ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t(`dashboard.status.${s}`)}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block flex-1 h-px bg-border" />
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("dashboard.myServices.documents")}</CardTitle>
          <label className="cursor-pointer">
            <Button asChild size="sm" variant="outline" disabled={uploading}>
              <span>
                <Upload className="mr-1 h-3.5 w-3.5" />{" "}
                {uploading
                  ? t("dashboard.common.uploading")
                  : t("dashboard.myServices.uploadAnother")}
              </span>
            </Button>
            <Input type="file" className="hidden" onChange={upload} />
          </label>
        </CardHeader>
        <CardContent className="space-y-3">
          {sr.status === "awaiting_client" && (
            <div className="rounded-md bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {t("dashboard.myServices.awaitingBanner")}
            </div>
          )}
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.myServices.noDocs")}</p>
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{d.file_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(1)} KB · ` : ""}
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </div>
                  {d.rejection_reason && (
                    <div className="mt-1 text-xs text-destructive">{d.rejection_reason}</div>
                  )}
                </div>
                <StatusBadge status={d.status} />
                {(d.status === "verified" || d.is_final_delivery) && (
                  <Button size="sm" variant="ghost" onClick={() => download(d)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat stub */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.myServices.chat")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm max-w-xs">
              {t("dashboard.myServices.chatPlaceholder")}
            </div>
          </div>
          <div className="flex gap-2">
            <Input placeholder={t("dashboard.myServices.chatInputPlaceholder")} disabled />
            <Button disabled>{t("dashboard.myServices.send")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.myServices.chatComingSoon")}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/claims/new" search={{ service_request_id: id } as never}>
            {t("dashboard.myServices.openClaim")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
