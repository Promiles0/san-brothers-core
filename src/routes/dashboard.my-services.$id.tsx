import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleAlert as AlertCircle,
  FileText,
  Download,
  Upload,
  Briefcase,
  Plane,
  Calculator,
  Languages,
  Clock,
  Calendar,
  Hash,
  MessageSquare,
  ExternalLink,
  User,
  ChevronRight,
  Circle as XCircle,
  Trash2,
  Paperclip,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase, uploadToStorage } from "@/lib/supabase";
import { toast } from "sonner";
import { cn, computeSLA } from "@/lib/utils";

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

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  color: string;
  dot: string;
}

const STEPS = [
  { key: "submitted", label: "Submitted", short: "Submitted" },
  { key: "under_review", label: "Under Review", short: "Review" },
  { key: "verified", label: "Verified", short: "Verified" },
  { key: "submitted_to_authority", label: "With Authority", short: "Authority" },
  { key: "completed", label: "Completed", short: "Done" },
];

const CANCELLED_STATUSES = new Set(["rejected", "cancelled"]);

const CATEGORY_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    color: string;
    bg: string;
    border: string;
    text: string;
    label: string;
  }
> = {
  visa: {
    icon: Plane,
    color: "#3B82F6",
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-600 dark:text-blue-400",
    label: "Visa & Permits",
  },
  accounting: {
    icon: Calculator,
    color: "#10B981",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Accounting",
  },
  translation: {
    icon: Languages,
    color: "#8B5CF6",
    bg: "bg-violet-500/15",
    border: "border-violet-500/40",
    text: "text-violet-600 dark:text-violet-400",
    label: "Translation",
  },
  consultancy: {
    icon: Briefcase,
    color: "#F59E0B",
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-600 dark:text-amber-400",
    label: "Consultancy",
  },
};

const STATUS_META: Record<string, { dot: string; pulse: boolean; label: string }> = {
  submitted: { dot: "bg-blue-500", pulse: false, label: "Submitted" },
  under_review: { dot: "bg-yellow-500", pulse: true, label: "Under Review" },
  awaiting_client: { dot: "bg-orange-500", pulse: true, label: "Awaiting You" },
  verified: { dot: "bg-blue-600", pulse: false, label: "Verified" },
  submitted_to_authority: { dot: "bg-purple-500", pulse: false, label: "Submitted to Authority" },
  completed: { dot: "bg-green-500", pulse: false, label: "Completed" },
  rejected: { dot: "bg-red-500", pulse: false, label: "Rejected" },
  cancelled: { dot: "bg-gray-400", pulse: false, label: "Cancelled" },
};

function fmt(date: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(
    undefined,
    opts ?? { day: "numeric", month: "short", year: "numeric" },
  );
}

function fmtDateTime(date: string) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function fmtSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ServiceDetailPage() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();
  const [sr, setSr] = useState<SR | null | undefined>(undefined);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Review state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
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
        .order("uploaded_at", { ascending: true }),
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
    } else {
      setStaff(null);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Check whether the client has already reviewed this service request
  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id")
        .eq("client_id", user.id)
        .eq("service_request_id", id)
        .maybeSingle();
      if (!cancelled) setExistingReviewId((data?.id as string) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  const submitReview = async () => {
    if (!user || !sr) return;
    if (reviewRating < 1) {
      toast.error(t("reviews.client.ratingRequired"));
      return;
    }
    if (reviewText.trim().length < 10) {
      toast.error(t("reviews.client.reviewTooShort"));
      return;
    }
    setReviewSubmitting(true);
    const displayName =
      profile?.full_name?.trim() ||
      user.email?.split("@")[0] ||
      "Anonymous client";
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        client_id: user.id,
        service_request_id: sr.id,
        rating: reviewRating,
        review_text: reviewText.trim(),
        client_display_name: displayName,
      })
      .select("id")
      .single();
    setReviewSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error(t("reviews.client.alreadyToast"));
      } else {
        toast.error(error.message);
      }
      return;
    }
    setExistingReviewId((data?.id as string) ?? null);
    setReviewOpen(false);
    setReviewRating(0);
    setReviewText("");
    toast.success(t("reviews.client.successToast"));
  };


  useEffect(() => {
    if (sr?.services?.name_en) {
      document.title = `${sr.services.name_en} — San Brothers`;
    }
    return () => {
      document.title = "San Brothers";
    };
  }, [sr?.services?.name_en]);

  const doUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `clients/${user.id}/${id}/${Date.now()}_${safe}`;
      setUploadProgress(40);
      const { error: upErr } = await uploadToStorage("client-documents", path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      setUploadProgress(70);
      const { error: docErr } = await supabase.from("documents").insert({
        service_request_id: id,
        client_id: user.id,
        uploaded_by: user.id,
        file_path: path,
        file_name: file.name,
        file_type: file.type || null,
        file_size_bytes: file.size,
        status: "uploaded",
      });
      if (docErr) throw docErr;
      setUploadProgress(100);
      toast.success(t("dashboard.myServices.uploadedToast"));
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    await doUpload(f);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) await doUpload(f);
  };

  const handleDownload = async (d: Doc) => {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(d.file_path, 3600);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (docId: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDeleteConfirm(null);
    toast.success("Document deleted.");
    await load();
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

  if (sr === undefined)
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-52" />
            <Skeleton className="h-36" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );

  if (!sr)
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
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
  const statusMeta = STATUS_META[sr.status] ?? STATUS_META.submitted;

  // Progress calculation — build the visible step list, hiding the
  // "Submitted to Authority" step when the case doesn't go to an authority
  // (no authority_ref AND case never reached that status).
  const hasAuthorityStep =
    !!sr.authority_ref || sr.status === "submitted_to_authority";
  const VISIBLE_STEPS = STEPS.filter(
    (s) => s.key !== "submitted_to_authority" || hasAuthorityStep,
  );
  const isCompleted = sr.status === "completed";
  const isRejected = sr.status === "rejected";
  const isCancelled = sr.status === "cancelled";
  const isAwaiting = sr.status === "awaiting_client";
  const isStopped = isRejected || isCancelled;

  // For awaiting_client we freeze the timeline at the prior step
  // (progress_step gives us the underlying position); otherwise map status → idx.
  const statusForIdx = isAwaiting ? null : sr.status;
  let currentStepIdx = VISIBLE_STEPS.findIndex((s) => s.key === statusForIdx);
  if (currentStepIdx < 0 && isAwaiting) {
    // Best-effort: stay at "under_review" while awaiting client
    currentStepIdx = VISIBLE_STEPS.findIndex((s) => s.key === "under_review");
  }
  if (currentStepIdx < 0) currentStepIdx = 0;
  const activeIdx = isCompleted ? VISIBLE_STEPS.length - 1 : currentStepIdx;
  const progressPct = isCompleted
    ? 100
    : Math.round((currentStepIdx / (VISIBLE_STEPS.length - 1)) * 100);

  // Price / duration labels
  const priceLabel = (() => {
    const min = sr.services?.price_usd_min;
    const max = sr.services?.price_usd_max;
    if (!min && !max) return null;
    if (min && max && min !== max) return `$${min}–$${max} USD`;
    return `$${min ?? max} USD`;
  })();

  const rwfLabel = (() => {
    const min = sr.services?.price_usd_min;
    const max = sr.services?.price_usd_max;
    if (!min && !max) return null;
    const toRWF = (n: number) => `RWF ${(n * 1285).toLocaleString()}`;
    if (min && max && min !== max) return `≈ ${toRWF(min)} – ${toRWF(max)}`;
    return `≈ ${toRWF(min ?? max ?? 0)}`;
  })();

  const durationLabel = (() => {
    const min = sr.services?.estimated_days_min;
    const max = sr.services?.estimated_days_max;
    if (!min && !max) return null;
    if (min && max && min !== max) return `${min}–${max} days`;
    return `${min ?? max} days`;
  })();

  // Build timeline events
  const timeline: TimelineEvent[] = [];
  timeline.push({
    id: "created",
    date: sr.created_at,
    title: "Application Submitted",
    description: "Your request has been received and is being processed.",
    color: "text-blue-500",
    dot: "bg-blue-500",
  });
  docs.forEach((d) => {
    timeline.push({
      id: `doc-${d.id}`,
      date: d.uploaded_at,
      title: "Document Uploaded",
      description: `${d.file_name} was attached to your request.`,
      color: "text-violet-500",
      dot: "bg-violet-500",
    });
  });
  if (sr.updated_at && sr.updated_at !== sr.created_at && !isCompleted) {
    timeline.push({
      id: "updated",
      date: sr.updated_at,
      title: "Status Updated",
      description: `Your request status changed to ${statusMeta.label}.`,
      color: "text-yellow-500",
      dot: "bg-yellow-500",
    });
  }
  if (isCompleted && sr.completed_at) {
    timeline.push({
      id: "completed",
      date: sr.completed_at,
      title: "Service Completed",
      description: "Your service request has been completed successfully.",
      color: "text-green-500",
      dot: "bg-green-500",
    });
  }
  if (sr.status === "awaiting_client") {
    timeline.push({
      id: "awaiting",
      date: sr.updated_at,
      title: "Action Required",
      description: "Please upload the requested documents to proceed.",
      color: "text-orange-500",
      dot: "bg-orange-500",
    });
  }
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const shortId = id.slice(0, 8).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
        <Link to="/dashboard/my-services" className="hover:text-foreground transition-colors">
          My Services
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{localName}</span>
      </nav>

      {/* Back link */}
      <Link
        to="/dashboard/my-services"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Services
      </Link>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
              cat.bg,
              cat.border,
            )}
          >
            <CatIcon className="h-5 w-5" style={{ color: cat.color }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
              {localName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span className={cn("text-sm font-medium", cat.text)}>{cat.label}</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs text-muted-foreground">Case: {shortId}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="text-xs text-muted-foreground">Created {fmt(sr.created_at)}</span>
              {sr.updated_at !== sr.created_at && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground">
                    Updated {fmtRelative(sr.updated_at)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border",
              sr.status === "completed"
                ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                : sr.status === "awaiting_client"
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400"
                  : sr.status === "under_review"
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                statusMeta.dot,
                statusMeta.pulse && "animate-pulse",
              )}
            />
            {statusMeta.label}
          </div>
        </div>
      </div>

      {/* Awaiting banner */}
      {sr.status === "awaiting_client" && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 mb-6">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              Action Required
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">
              {t("dashboard.myServices.awaitingBanner")}
            </p>
          </div>
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT (3/5) ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Progress tracker */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Progress
              </h2>
              {(() => {
                const sla = computeSLA({
                  createdAt: sr.created_at,
                  completedAt: sr.completed_at,
                  estimatedDaysMin: sr.services?.estimated_days_min,
                  estimatedDaysMax: sr.services?.estimated_days_max,
                  status: sr.status,
                });
                if (!sla) return null;
                const toneClass =
                  sla.tone === "success"
                    ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                    : sla.tone === "amber"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400";
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      toneClass,
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {sla.text}
                  </span>
                );
              })()}
            </div>


            {isRejected ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Request Rejected
                    </p>
                    {sr.notes && (
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 leading-relaxed">
                        {sr.notes}
                      </p>
                    )}
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline mt-2"
                    >
                      Contact us <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : isCancelled ? (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Request Cancelled</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This request was cancelled on {fmt(sr.updated_at)}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isAwaiting && (
                  <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        Action needed — we&apos;re waiting on you
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        {sr.notes ||
                          "Please upload the requested documents or reply via messages to continue."}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          Upload documents
                        </button>
                        <Link
                          to="/dashboard/messages"
                          className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          Open messages
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop horizontal stepper */}
                <div className="hidden sm:block">
                  <div className="relative flex items-start">
                    {VISIBLE_STEPS.map((step, i) => {
                      const isDone = isCompleted ? true : i < activeIdx;
                      const isActive = !isCompleted && i === activeIdx && !isAwaiting;
                      const isFrozenActive = isAwaiting && i === activeIdx;
                      return (
                        <div key={step.key} className="flex-1 flex flex-col items-center relative">
                          {i > 0 && (
                            <div
                              className={cn(
                                "absolute top-4 h-0.5 -translate-y-1/2",
                                isDone || isActive || isFrozenActive
                                  ? "bg-blue-500"
                                  : "bg-border",
                              )}
                              style={{ left: 0, width: "50%" }}
                            />
                          )}
                          {i < VISIBLE_STEPS.length - 1 && (
                            <div
                              className={cn(
                                "absolute top-4 h-0.5 -translate-y-1/2",
                                isDone ? "bg-blue-500" : "bg-border",
                              )}
                              style={{ left: "50%", width: "50%" }}
                            />
                          )}
                          {/* Circle */}
                          <div
                            className={cn(
                              "relative z-10 h-8 w-8 rounded-full grid place-items-center text-xs font-semibold border-2 transition-all",
                              isDone
                                ? "bg-green-500 border-green-500 text-white"
                                : isActive
                                  ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse"
                                  : isFrozenActive
                                    ? "bg-amber-500 border-amber-500 text-white"
                                    : "bg-card border-border text-muted-foreground",
                            )}
                          >
                            {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                          </div>
                          <p
                            className={cn(
                              "mt-2 text-xs text-center leading-tight px-1",
                              isDone
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : isActive || isFrozenActive
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground",
                            )}
                          >
                            {step.short}
                          </p>
                          {isActive && (
                            <p className="text-[10px] text-blue-500 font-medium mt-0.5">
                              Started {fmtRelative(sr.updated_at || sr.created_at)}
                            </p>
                          )}
                          {isFrozenActive && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                              Paused
                            </p>
                          )}
                          {isDone && i === VISIBLE_STEPS.length - 1 && sr.completed_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {fmt(sr.completed_at)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Step {Math.max(1, activeIdx + 1)} of {VISIBLE_STEPS.length} · {progressPct}% complete
                    </p>
                  </div>
                </div>

                {/* Mobile vertical stepper */}
                <div className="sm:hidden">
                  <ol className="space-y-0 relative">
                    <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-border" />
                    {VISIBLE_STEPS.map((step, i) => {
                      const isDone = isCompleted ? true : i < activeIdx;
                      const isActive = !isCompleted && i === activeIdx && !isAwaiting;
                      const isFrozenActive = isAwaiting && i === activeIdx;
                      return (
                        <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
                          <div
                            className={cn(
                              "relative z-10 h-7 w-7 shrink-0 rounded-full grid place-items-center text-xs font-semibold border-2",
                              isDone
                                ? "bg-green-500 border-green-500 text-white"
                                : isActive
                                  ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse"
                                  : isFrozenActive
                                    ? "bg-amber-500 border-amber-500 text-white"
                                    : "bg-card border-border text-muted-foreground",
                            )}
                          >
                            {isDone ? <Check className="h-3 w-3" /> : i + 1}
                          </div>
                          <div className="pt-0.5">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isDone
                                  ? "text-green-600 dark:text-green-400"
                                  : isActive || isFrozenActive
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                              )}
                            >
                              {step.label}
                            </p>
                            {isActive && (
                              <p className="text-xs text-blue-500 font-medium">
                                Started {fmtRelative(sr.updated_at || sr.created_at)}
                              </p>
                            )}
                            {isFrozenActive && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                Paused — waiting on you
                              </p>
                            )}
                            {isDone && i === VISIBLE_STEPS.length - 1 && sr.completed_at && (
                              <p className="text-xs text-muted-foreground">
                                Completed on {fmt(sr.completed_at)}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </>
            )}
          </div>


          {/* Activity timeline */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </h2>
            <ol className="relative space-y-0">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
              {timeline.map((ev, i) => (
                <li
                  key={ev.id}
                  className="relative flex gap-4 pb-5 last:pb-0"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div
                    className={cn(
                      "relative z-10 h-4 w-4 shrink-0 mt-0.5 rounded-full border-2 border-card",
                      ev.dot,
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">{fmtDateTime(ev.date)}</p>
                    <p className={cn("text-sm font-semibold", ev.color)}>{ev.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Documents */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Documents ({docs.length})
                </h2>
              </div>
              <label className="cursor-pointer">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  className="h-8 text-xs"
                >
                  <span>
                    <Upload className="h-3 w-3 mr-1.5" />
                    {uploading ? "Uploading…" : "+ Upload Document"}
                  </span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </div>

            {/* Upload progress */}
            {uploading && uploadProgress > 0 && (
              <div className="px-6 pt-3">
                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Uploading… {uploadProgress}%</p>
              </div>
            )}

            {/* Drag-and-drop zone */}
            <div
              className={cn(
                "mx-6 my-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer",
                dragOver
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-border hover:border-blue-400 hover:bg-muted/30",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1.5 py-5 text-center">
                <Paperclip
                  className={cn("h-5 w-5", dragOver ? "text-blue-500" : "text-muted-foreground")}
                />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Drag files here</span> or click to
                  upload
                </p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX · Max 10MB</p>
              </div>
            </div>

            {docs.length > 0 && (
              <div className="divide-y divide-border border-t border-border">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        d.is_final_delivery ? "bg-green-500/10" : "bg-muted",
                      )}
                    >
                      <FileText
                        className={cn(
                          "h-4 w-4",
                          d.is_final_delivery ? "text-green-500" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{d.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtSize(d.file_size_bytes)}
                        {d.file_size_bytes ? " · " : ""}Uploaded {fmt(d.uploaded_at)}
                        {d.is_final_delivery && (
                          <span className="ml-1.5 text-green-500 font-medium">Final delivery</span>
                        )}
                      </p>
                      {d.rejection_reason && (
                        <p className="mt-0.5 text-xs text-destructive">{d.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={d.status} />
                      <button
                        onClick={() => handleDownload(d)}
                        className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-muted transition-colors"
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(d.id)}
                        className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="rounded-xl border border-border bg-card px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Messages
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Chat with your case handler about this service request.
                </p>
              </div>
              <Button asChild size="sm" className="h-8 text-xs shrink-0">
                <Link to="/dashboard/messages">
                  Open Messages
                  <ExternalLink className="h-3 w-3 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Service details */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className={cn("px-5 py-3 border-b border-border", cat.bg)}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" />
                Service Details
              </h3>
            </div>
            <div className="divide-y divide-border">
              <InfoRow label="Case ID" value={shortId} mono />
              <InfoRow label="Category" value={cat.label} />
              {priceLabel && (
                <div className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{priceLabel}</p>
                      {rwfLabel && <p className="text-[10px] text-muted-foreground">{rwfLabel}</p>}
                    </div>
                  </div>
                </div>
              )}
              {durationLabel && <InfoRow label="Est. Duration" value={durationLabel} />}
              <InfoRow label="Submitted" value={fmt(sr.created_at)} />
              {sr.completed_at && <InfoRow label="Completed" value={fmt(sr.completed_at)} />}
              {sr.visa_expiry_date && (
                <InfoRow label="Visa Expiry" value={fmt(sr.visa_expiry_date)} />
              )}
              {sr.authority_ref && <InfoRow label="Authority Ref" value={sr.authority_ref} mono />}
            </div>
          </div>

          {/* Handler card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Your Handler
              </h3>
            </div>
            {staff ? (
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shrink-0">
                    {staff.full_name.charAt(0).toUpperCase()}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {staff.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {staff.role?.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs">
                  <Link to="/dashboard/messages">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Send Message
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-muted shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Pending Assignment</p>
                  <p className="text-xs text-muted-foreground">
                    A handler will be assigned shortly
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                Quick Actions
              </h3>
            </div>
            <div className="p-3 space-y-1">
              <label className="cursor-pointer block">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 shrink-0">
                    <Upload className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Upload Document</p>
                    <p className="text-xs text-muted-foreground">Add files to your request</p>
                  </div>
                </div>
                <input type="file" className="hidden" onChange={handleFileInput} />
              </label>

              <Link
                to="/dashboard/messages"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-green-500/10 shrink-0">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Message Handler</p>
                  <p className="text-xs text-muted-foreground">Chat with your case team</p>
                </div>
              </Link>

              <Link
                to="/dashboard/claims/new"
                search={{ service_request_id: id } as never}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/10 shrink-0">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Open a Claim</p>
                  <p className="text-xs text-muted-foreground">Report an issue</p>
                </div>
              </Link>

              {sr.status === "completed" && (
                <button
                  type="button"
                  onClick={() => {
                    if (existingReviewId) {
                      toast.info(t("reviews.client.alreadyToast"));
                      return;
                    }
                    setReviewOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 shrink-0">
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {existingReviewId
                        ? t("reviews.client.alreadySubmitted")
                        : t("reviews.client.leaveAction")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {existingReviewId
                        ? t("reviews.client.alreadyDesc")
                        : t("reviews.client.leaveActionDesc")}
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          {sr.status === "submitted" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-destructive/20">
                <h3 className="text-xs font-bold uppercase tracking-widest text-destructive">
                  Danger Zone
                </h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Cancel this service request. This action cannot be undone.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
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

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border bg-card shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Delete document?</h3>
            <p className="text-sm text-muted-foreground">
              This document will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirm */}
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
              Cancel your <strong className="text-foreground">{localName}</strong> request? Uploaded
              documents will be retained.
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

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("reviews.client.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("reviews.client.dialogIntro")}
            </p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reviews.client.ratingLabel")}
              </p>
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setReviewHover(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= (reviewHover || reviewRating);
                  return (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setReviewHover(n)}
                      onClick={() => setReviewRating(n)}
                      className="rounded p-1 transition-transform hover:scale-110"
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors",
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("reviews.client.reviewLabel")}
              </p>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder={t("reviews.client.reviewPlaceholder")}
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {reviewText.length}/1000
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={reviewSubmitting}
            >
              {t("reviews.client.cancel")}
            </Button>
            <Button onClick={submitReview} disabled={reviewSubmitting}>
              {reviewSubmitting
                ? t("reviews.client.submitting")
                : t("reviews.client.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs font-medium text-foreground text-right truncate max-w-[140px]",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}
