import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CircleAlert as AlertCircle, FileText, Download, Upload, Briefcase, Plane, Calculator, Languages, Clock, Calendar, Hash, MessageSquare, ExternalLink, User, Circle, ChevronRight, Circle as XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase, uploadToStorage } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/my-services/$id")({
  component: ServiceDetailPage,
});

interface SR {
  id: string;
  status: string;
  service_category: string;
  progress_step: number;
  progress_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assigned_staff_id: string | null;
  priority: string | null;
  authority_ref: string | null;
  visa_expiry_date: string | null;
  services: {
    name_en: string;
    name_zh: string | null;
    name_rw: string | null;
    price_usd_min: number | null;
    price_usd_max: number | null;
    estimated_days_min: number | null;
    estimated_days_max: number | null;
    description_en: string | null;
  } | null;
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

interface Staff {
  id: string;
  full_name: string;
  role: string;
}

const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "verified", label: "Verified" },
  { key: "submitted_to_authority", label: "Submitted to Authority" },
  { key: "completed", label: "Completed" },
];

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; text: string; label: string }> = {
  visa:        { icon: Plane,      color: "#3B82F6", bg: "bg-blue-500/10",    border: "border-blue-500",    text: "text-blue-600 dark:text-blue-400",       label: "Visa & Permits" },
  accounting:  { icon: Calculator, color: "#10B981", bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Accounting" },
  translation: { icon: Languages,  color: "#8B5CF6", bg: "bg-violet-500/10",  border: "border-violet-500",  text: "text-violet-600 dark:text-violet-400",   label: "Translation" },
  consultancy: { icon: Briefcase,  color: "#F59E0B", bg: "bg-amber-500/10",   border: "border-amber-500",   text: "text-amber-600 dark:text-amber-400",     label: "Consultancy" },
};

const STATUS_DOT: Record<string, { dot: string; pulse: boolean; label: string }> = {
  submitted:              { dot: "bg-blue-500",   pulse: false, label: "Submitted" },
  under_review:           { dot: "bg-yellow-500", pulse: true,  label: "Under Review" },
  awaiting_client:        { dot: "bg-orange-500", pulse: true,  label: "Awaiting You" },
  verified:               { dot: "bg-blue-600",   pulse: false, label: "Verified" },
  submitted_to_authority: { dot: "bg-purple-500", pulse: false, label: "Submitted to Authority" },
  completed:              { dot: "bg-green-500",  pulse: false, label: "Completed" },
  rejected:               { dot: "bg-red-500",    pulse: false, label: "Rejected" },
  cancelled:              { dot: "bg-gray-400",   pulse: false, label: "Cancelled" },
};

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ServiceDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [sr, setSr] = useState<SR | null | undefined>(undefined);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [srRes, docRes] = await Promise.all([
      supabase
        .from("service_requests")
        .select(
          "id,status,service_category,progress_step,progress_total,notes,created_at,updated_at,completed_at,assigned_staff_id,priority,authority_ref,visa_expiry_date,services(name_en,name_zh,name_rw,price_usd_min,price_usd_max,estimated_days_min,estimated_days_max,description_en)",
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
    const data = (srRes.data as unknown as SR) ?? null;
    setSr(data);
    setDocs((docRes.data as Doc[]) ?? []);

    if (data?.assigned_staff_id) {
      const { data: staffData } = await supabase
        .from("profiles")
        .select("id,full_name,role")
        .eq("id", data.assigned_staff_id)
        .maybeSingle();
      setStaff((staffData as Staff) ?? null);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);

  useEffect(() => {
    if (sr?.services?.name_en) {
      document.title = `${sr.services.name_en} — San Brothers`;
    }
    return () => { document.title = "San Brothers"; };
  }, [sr?.services?.name_en]);

  if (sr === undefined)
    return (
      <div className="space-y-4 max-w-6xl">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );

  if (!sr)
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">{t("dashboard.myServices.notFound")}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/dashboard/my-services">Back to My Services</Link>
        </Button>
      </div>
    );

  const localName =
    (locale === "zh" && sr.services?.name_zh) ||
    (locale === "rw" && sr.services?.name_rw) ||
    sr.services?.name_en ||
    "Service";

  const cat = CATEGORY_CONFIG[sr.service_category] ?? CATEGORY_CONFIG.consultancy;
  const CatIcon = cat.icon;
  const statusMeta = STATUS_DOT[sr.status] ?? STATUS_DOT.submitted;
  const currentStepIdx = STEPS.findIndex((s) => s.key === sr.status);
  const completedStepIdx = sr.status === "completed" ? STEPS.length - 1 : currentStepIdx - 1;

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    e.target.value = "";
    setUploading(true);
    try {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `clients/${user.id}/${id}/${Date.now()}_${safe}`;
      const { error: upErr } = await uploadToStorage("client-documents", path, f, {
        upsert: true,
        contentType: f.type || undefined,
      });
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

  const cancelRequest = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Request cancelled.");
      setShowCancelDialog(false);
      await load();
    }
    setCancelling(false);
  };

  const priceLabel = (() => {
    const min = sr.services?.price_usd_min;
    const max = sr.services?.price_usd_max;
    if (!min && !max) return null;
    if (min && max && min !== max) return `$${min}–$${max} USD`;
    return `$${min ?? max} USD`;
  })();

  const durationLabel = (() => {
    const min = sr.services?.estimated_days_min;
    const max = sr.services?.estimated_days_max;
    if (!min && !max) return null;
    if (min && max && min !== max) return `${min}–${max} days`;
    return `${min ?? max} days`;
  })();

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/dashboard/my-services" className="hover:text-foreground transition-colors">
          My Services
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{localName}</span>
      </nav>

      {/* Back link */}
      <Link
        to="/dashboard/my-services"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Services
      </Link>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-2">
        <div className="flex items-center gap-3">
          <div className={cn("grid h-12 w-12 place-items-center rounded-xl border", cat.bg, `border-${cat.border.replace("border-", "")}`)}>
            <CatIcon className="h-5 w-5" style={{ color: cat.color }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{localName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-xs font-medium", cat.text)}>{cat.label}</span>
              <span className="text-muted-foreground">·</span>
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", statusMeta.dot, statusMeta.pulse && "animate-pulse")} />
                <span className="text-xs text-muted-foreground">{statusMeta.label}</span>
              </div>
            </div>
          </div>
        </div>
        <StatusBadge status={sr.status} />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Awaiting banner */}
          {sr.status === "awaiting_client" && (
            <div className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Action Required</p>
                <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
                  {t("dashboard.myServices.awaitingBanner")}
                </p>
              </div>
            </div>
          )}

          {/* Progress tracker */}
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-5">Progress</h2>
            <div className="relative">
              {/* connector line */}
              <div className="absolute left-4 top-4 bottom-4 w-px bg-border" aria-hidden="true" />
              <ol className="space-y-0">
                {STEPS.map((step, i) => {
                  const isDone = i <= completedStepIdx;
                  const isActive = i === currentStepIdx && sr.status !== "completed";
                  const isFuture = !isDone && !isActive;
                  return (
                    <li key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      {/* circle */}
                      <div className="relative z-10 shrink-0">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full border-2 grid place-items-center transition-all",
                            isDone
                              ? "bg-green-500 border-green-500 text-white"
                              : isActive
                                ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/20"
                                : "bg-card border-border text-muted-foreground",
                          )}
                        >
                          {isDone ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-semibold">{i + 1}</span>
                          )}
                        </div>
                      </div>
                      {/* content */}
                      <div className="pt-1 flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium leading-none",
                            isDone
                              ? "text-green-600 dark:text-green-400"
                              : isActive
                                ? "text-foreground"
                                : isFuture
                                  ? "text-muted-foreground"
                                  : "text-foreground",
                          )}
                        >
                          {step.label}
                        </p>
                        {isDone && (
                          <p className="mt-1 text-xs text-muted-foreground">Completed</p>
                        )}
                        {isActive && (
                          <p className="mt-1 text-xs text-blue-500 font-medium">In progress</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{t("dashboard.myServices.documents")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{docs.length} file{docs.length !== 1 ? "s" : ""} attached</p>
              </div>
              <label className="cursor-pointer">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  className="text-xs h-8"
                >
                  <span>
                    <Upload className="h-3 w-3 mr-1.5" />
                    {uploading ? t("dashboard.common.uploading") : "Upload File"}
                  </span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={upload}
                />
              </label>
            </div>

            {docs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">{t("dashboard.myServices.noDocs")}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs text-blue-500 hover:underline"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      d.is_final_delivery ? "bg-green-500/10" : "bg-muted",
                    )}>
                      <FileText className={cn("h-4 w-4", d.is_final_delivery ? "text-green-500" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtSize(d.file_size_bytes)}{d.file_size_bytes ? " · " : ""}{fmt(d.uploaded_at)}
                        {d.is_final_delivery && <span className="ml-1.5 text-green-500 font-medium">Final delivery</span>}
                      </p>
                      {d.rejection_reason && (
                        <p className="mt-0.5 text-xs text-destructive">{d.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={d.status} />
                      {(d.status === "verified" || d.is_final_delivery) && (
                        <button
                          onClick={() => download(d)}
                          className="grid h-7 w-7 place-items-center rounded-md border hover:bg-muted transition-colors"
                          aria-label="Download"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Staff */}
          <div className="rounded-xl border bg-card px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Messages</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Communicate with your case handler</p>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs h-8">
                <Link to="/dashboard/messages">
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Open Messages
                  <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* Service info card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className={cn("px-5 py-3 border-b", cat.bg)}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Service Details</h3>
            </div>
            <div className="divide-y divide-border">
              <InfoRow icon={Hash} label="Case ID" value={id.slice(0, 8).toUpperCase()} />
              <InfoRow icon={Circle} label="Status" value={statusMeta.label} />
              {priceLabel && <InfoRow icon={Calculator} label="Price" value={priceLabel} />}
              {durationLabel && <InfoRow icon={Clock} label="Est. Duration" value={durationLabel} />}
              <InfoRow icon={Calendar} label="Submitted" value={fmt(sr.created_at)} />
              {sr.completed_at && <InfoRow icon={Check} label="Completed" value={fmt(sr.completed_at)} />}
              {sr.visa_expiry_date && <InfoRow icon={Calendar} label="Visa Expiry" value={fmt(sr.visa_expiry_date)} />}
              {sr.authority_ref && <InfoRow icon={Hash} label="Authority Ref" value={sr.authority_ref} />}
            </div>
          </div>

          {/* Assigned staff */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Your Handler</h3>
            </div>
            {staff ? (
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shrink-0">
                    {staff.full_name.charAt(0).toUpperCase()}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{staff.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{staff.role?.replace("_", " ")}</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full mt-3 text-xs h-8">
                  <Link to="/dashboard/messages">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Send Message
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-muted shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Pending Assignment</p>
                    <p className="text-xs text-muted-foreground">A handler will be assigned soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Quick Actions</h3>
            </div>
            <div className="p-3 space-y-1.5">
              <label className="cursor-pointer w-full">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10">
                    <Upload className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Upload Document</p>
                    <p className="text-xs text-muted-foreground">Add files to your request</p>
                  </div>
                </div>
                <input type="file" className="hidden" onChange={upload} />
              </label>

              <Link
                to="/dashboard/messages"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-green-500/10">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Message Staff</p>
                  <p className="text-xs text-muted-foreground">Chat with your handler</p>
                </div>
              </Link>

              <Link
                to="/dashboard/claims/new"
                search={{ service_request_id: id } as never}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/10">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Open Claim</p>
                  <p className="text-xs text-muted-foreground">Report an issue</p>
                </div>
              </Link>

              {docs.some((d) => d.is_final_delivery) && (
                <button
                  onClick={() => {
                    const final = docs.find((d) => d.is_final_delivery);
                    if (final) download(final);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/10">
                    <Download className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground">Download Result</p>
                    <p className="text-xs text-muted-foreground">Final delivery document</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          {sr.status === "submitted" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-destructive/20">
                <h3 className="text-xs font-bold uppercase tracking-widest text-destructive">Danger Zone</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Cancel this request. This action cannot be undone.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full h-8 text-xs"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Cancel Request
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCancelDialog(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border bg-card shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 shrink-0">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Cancel Request?</h3>
                <p className="text-xs text-muted-foreground">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel your <strong className="text-foreground">{localName}</strong> request? All uploaded documents will be retained.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelling}
              >
                Keep Request
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={cancelRequest}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <span className="text-xs font-medium text-foreground text-right shrink-0 max-w-[120px] truncate">{value}</span>
    </div>
  );
}
