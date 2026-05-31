import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { getRequiredDocs } from "@/lib/dashboard/service-requirements";
import { createNotification, createNotificationForAdmins } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import type { ApplicantType, Service, ServiceCategory } from "@/lib/types/database";
import { StripePaymentForm } from "@/components/payments/stripe-payment-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type PayMethod = "card" | "paypal" | "momo";
type PayState = "idle" | "processing" | "success";

interface PendingFile {
  file: File;
  label?: string;
  progress: number;
}

export interface Props {
  service: Service;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_EMOJI: Record<ServiceCategory, string> = {
  visa: "🛂",
  accounting: "📊",
  translation: "📄",
  consultancy: "💼",
};

const CAT_CAPABILITY: Record<ServiceCategory, string> = {
  visa: "handle_visa",
  translation: "handle_translation",
  accounting: "handle_accounting",
  consultancy: "handle_consultancy",
};

const WHAT_YOU_GET: Record<ServiceCategory, string[]> = {
  visa: [
    "Expert guidance through the entire visa process",
    "Document checklist tailored to your visa type",
    "Application form preparation and review",
    "Real-time status updates at every step",
  ],
  accounting: [
    "Comprehensive financial record management",
    "Tax filing and compliance support",
    "Monthly / quarterly professional reports",
    "Dedicated accounting expert assigned to you",
  ],
  translation: [
    "Professional certified translation",
    "Native-speaker quality assurance review",
    "Fast turnaround with format preservation",
    "PDF, Word, and image formats supported",
  ],
  consultancy: [
    "One-on-one expert consultation session",
    "Tailored business strategy and advice",
    "Written action-plan summary delivered",
    "Follow-up support included",
  ],
};

const SERVICE_PROGRESS: Record<ServiceCategory, string[]> = {
  visa: ["Submitted", "Doc Review", "Verified", "Sent to Authority", "Completed"],
  translation: ["Submitted", "Under Review", "In Translation", "QA Check", "Delivered"],
  accounting: ["Submitted", "Assigned", "Analysis", "Report Ready", "Completed"],
  consultancy: ["Submitted", "Assigned", "Meeting Scheduled", "Completed"],
};

const LANGUAGES = ["English", "French", "Chinese (Mandarin)", "Kinyarwanda", "Arabic", "Swahili"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUSD = (n: number) => `$${Math.round(n)}`;

function isInterpreterSlug(slug: string) {
  return slug === "live-interpretation" || slug.includes("live-interp");
}

async function pickMatchingStaff(category: ServiceCategory): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("staff_capabilities")
      .select("user_id")
      .eq("capability", CAT_CAPABILITY[category]);
    if (!data?.length) return null;
    const pick = data[Math.floor(Math.random() * data.length)] as { user_id: string };
    return pick.user_id;
  } catch {
    return null;
  }
}

function formatPrice(min: number | null, max: number | null) {
  if (!min && !max) return null;
  if (min && max && min !== max) return `${fmtUSD(min)} – ${fmtUSD(max)}`;
  return fmtUSD(min ?? max ?? 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimelineDots({ steps }: { steps: string[] }) {
  return (
    <div className="flex items-start overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-start">
          <div className="flex min-w-15 flex-col items-center gap-1 px-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
              {i + 1}
            </div>
            <span className="text-center text-[10px] leading-tight text-muted-foreground">
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="mt-3 h-px w-4 shrink-0 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}

function UploadRow({
  label,
  extra,
  onPick,
}: {
  label: string;
  extra?: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent",
        extra ? "border-dashed" : "border-border",
      )}
    >
      <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-xs font-medium text-primary">Browse</span>
      <input
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={onPick}
      />
    </label>
  );
}

function PayMethodCard({
  id,
  label,
  icon,
  selected,
  disabled,
  note,
  onSelect,
}: {
  id: PayMethod;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  note?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-accent",
      )}
    >
      {icon}
      <span>{label}</span>
      {note ? <span className="text-[10px] font-normal text-muted-foreground">{note}</span> : null}
    </button>
  );
}

// ─── Payment overlay (shared) ─────────────────────────────────────────────────

function PayOverlay({ state }: { state: PayState }) {
  if (state === "idle") return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm">
      {state === "processing" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-semibold">Processing…</p>
            <p className="mt-1 text-sm text-muted-foreground">Please do not close this window.</p>
          </div>
        </>
      )}
      {state === "success" && (
        <>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              Success!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Submitting your request…</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function ServiceApplyModal({ service, open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();

  const isInterpreter = isInterpreterSlug(service.slug);

  // Standard form state
  const [tab, setTab] = useState<"overview" | "requirements" | "apply">("overview");
  const [applicantType, setApplicantType] = useState<ApplicantType>("individual");
  const [nationality, setNationality] = useState("");
  const [passportId, setPassportId] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("card");

  // Files
  const [files, setFiles] = useState<PendingFile[]>([]);
  const timerRefs = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());

  // Payment flow
  const [payState, setPayState] = useState<PayState>("idle");
  const [showingPayment, setShowingPayment] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [payIntent, setPayIntent] = useState<
    | {
        amount: number;
        title: string;
        description?: string;
        metadata: Record<string, string>;
        finalize: (intentId: string) => Promise<void>;
      }
    | null
  >(null);

  // Interpreter-specific state
  const [interpreterView, setInterpreterView] = useState<"options" | "booking">("options");
  const [bookFromLang, setBookFromLang] = useState("");
  const [bookToLang, setBookToLang] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  // Reset on open
  useEffect(() => {
    if (open) {
      setTab("overview");
      setApplicantType("individual");
      setNationality("");
      setPassportId("");
      setDetails({});
      setNotes("");
      setFiles([]);
      setPayMethod("card");
      setPayState("idle");
      setShowingPayment(false);
      setStripeError(null);
      setPayIntent(null);

      setInterpreterView("options");
      setBookFromLang("");
      setBookToLang("");
      setBookDate("");
      setBookTime("");
      setBookNotes("");
    }
  }, [open, service.id]);

  useEffect(() => {
    return () => {
      timerRefs.current.forEach(clearInterval);
    };
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const localName =
    (locale === "zh" && service.name_zh) ||
    (locale === "rw" && service.name_rw) ||
    service.name_en;

  const localDesc =
    (locale === "zh" && service.description_zh) ||
    (locale === "rw" && service.description_rw) ||
    service.description_en ||
    "";

  const priceText = formatPrice(service.price_usd_min, service.price_usd_max);
  const basePrice = service.price_usd_min ?? 0;

  const timeText =
    service.estimated_days_min != null && service.estimated_days_max != null
      ? `${service.estimated_days_min}–${service.estimated_days_max} business days`
      : null;

  const requiredDocs = getRequiredDocs(service.slug);
  const progressSteps = SERVICE_PROGRESS[service.category] ?? SERVICE_PROGRESS.consultancy;
  const whatYouGet = WHAT_YOU_GET[service.category];

  // ── File helpers ───────────────────────────────────────────────────────────

  function addFile(label?: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) {
        toast.error("File too large — maximum 10 MB per file.");
        return;
      }
      const idx = Date.now();
      setFiles((prev) => [...prev, { file: f, label, progress: 0 }]);
      e.target.value = "";
      let pct = 0;
      const timer = setInterval(() => {
        pct += Math.random() * 30 + 15;
        if (pct >= 100) {
          pct = 100;
          clearInterval(timer);
          timerRefs.current.delete(idx);
        }
        setFiles((prev) =>
          prev.map((x) =>
            x.file === f ? { ...x, progress: Math.min(pct, 100) } : x,
          ),
        );
      }, 150);
      timerRefs.current.set(idx, timer);
    };
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!user) return "Please sign in to apply.";
    if (service.category === "visa") {
      if (!details.visaType) return "Please select a visa type.";
    }
    if (service.category === "translation") {
      if (!details.sourceLang || !details.targetLang) return "Please select both languages.";
    }
    return null;
  }

  // ── Submit (standard services) ─────────────────────────────────────────────

  async function handleSubmit(isFree = false, stripeIntentId?: string) {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    // Gate paid card payments through Stripe.
    if (!isFree && basePrice > 0 && payMethod === "card" && !stripeIntentId) {
      setStripeError(null);
      setPayIntent({
        amount: basePrice,
        title: localName,
        description: localDesc,
        metadata: { client_id: user!.id, service_id: service.id, service_slug: service.slug },
        finalize: async (intentId) => {
          console.info("Stripe payment succeeded for service request", { paymentIntentId: intentId });
          setShowingPayment(false);
          await handleSubmit(false, intentId);
        },
      });
      setShowingPayment(true);
      return;
    }

    setPayState("processing");



    try {
      const staffId = await pickMatchingStaff(service.category);

      const notesSummary = JSON.stringify({
        applicantType,
        nationality: nationality || undefined,
        passportId: passportId || undefined,
        ...details,
        notes: notes || undefined,
        paymentMethod: isFree ? "free" : payMethod,
        isFreeConsultation: isFree,
      });

      const { data: sr, error: srErr } = await supabase
        .from("service_requests")
        .insert({
          client_id: user!.id,
          service_id: service.id,
          service_category: service.category,
          status: "submitted",
          progress_step: 1,
          progress_total: progressSteps.length,
          assigned_staff_id: staffId,
          applicant_type: applicantType,
          priority: "normal",
          notes: notesSummary,
        })
        .select()
        .single();
      if (srErr) throw srErr;
      const requestId = sr.id as string;

      for (const { file } of files) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `documents/${user!.id}/${requestId}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage
          .from("client-documents")
          .upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("documents").insert({
          service_request_id: requestId,
          client_id: user!.id,
          uploaded_by: user!.id,
          file_path: path,
          file_name: file.name,
          file_type: file.type || null,
          file_size_bytes: file.size,
          status: "uploaded",
        });
      }

      if (!isFree && basePrice > 0) {
        await supabase.from("payments").insert({
          service_request_id: requestId,
          client_id: user!.id,
          amount_rwf: basePrice,
          currency: "USD",
          method: stripeIntentId ? "stripe" : payMethod === "momo" ? "momo" : "stripe",
          status: "completed",
          reference: stripeIntentId ?? `SB-${Date.now()}`,
        });
      }

      await createNotification({
        user_id: user!.id,
        type: "case_submitted",
        title: "Your request has been submitted",
        body: `We received your ${localName} request. Our team will review it shortly.`,
        link: "/dashboard/my-services",
      });

      if (staffId) {
        await createNotification({
          user_id: staffId,
          type: "new_case",
          title: `New case: ${localName}`,
          body: `New request from ${profile?.full_name ?? "a client"}.`,
          link: "/staff/cases",
        });
      }

      await createNotificationForAdmins({
        type: "new_case",
        title: `New ${service.category} request`,
        body: `${profile?.full_name ?? "A client"} submitted a ${localName} request.`,
        link: "/admin/clients",
      });

      onOpenChange(false);
      navigate({
        to: "/dashboard/confirmation/$requestId",
        params: { requestId },
        search: {
          serviceName: localName,
          priceText: isFree ? "Free" : (priceText ?? "$0"),
          payMethod: isFree ? "free" : payMethod,
        } as never,
      });
    } catch (e) {
      console.error("Service request submission failed", e);
      setPayState("idle");
      const message = (e as Error).message || "We could not submit your request.";
      setStripeError(message);
      toast.error(message);
    }
  }

  // ── Submit: interpreter free call ──────────────────────────────────────────

  async function handleFreeCall() {
    if (!user) { toast.error("Please sign in."); return; }
    setPayState("processing");
    try {
      const staffId = await pickMatchingStaff(service.category);
      const { data: sr, error: srErr } = await supabase
        .from("service_requests")
        .insert({
          client_id: user.id,
          service_id: service.id,
          service_category: service.category,
          status: "free_consultation",
          progress_step: 1,
          progress_total: 3,
          assigned_staff_id: staffId,
          applicant_type: "individual",
          priority: "normal",
          notes: JSON.stringify({ type: "free_call" }),
        })
        .select()
        .single();
      if (srErr) throw srErr;

      await createNotification({
        user_id: user.id,
        type: "case_submitted",
        title: "Free consultation started",
        body: "Your interpreter is ready. Head to Messages to begin.",
        link: "/dashboard/messages",
      });

      if (staffId) {
        await createNotification({
          user_id: staffId,
          type: "new_case",
          title: "Free interpreter call",
          body: `${profile?.full_name ?? "A client"} wants to connect now.`,
          link: "/staff/cases",
        });
      }

      onOpenChange(false);
      navigate({ to: "/dashboard/messages" });
    } catch (e) {
      setPayState("idle");
      toast.error((e as Error).message);
    }
  }

  // ── Submit: interpreter booked session ─────────────────────────────────────

  async function handleBookSession(stripeIntentId?: string) {
    if (!user) { toast.error("Please sign in."); return; }
    if (!bookFromLang || !bookToLang) { toast.error("Please select both languages."); return; }
    if (!bookDate || !bookTime) { toast.error("Please select a date and time."); return; }

    if (basePrice > 0 && !stripeIntentId) {
      setStripeError(null);
      setPayIntent({
        amount: basePrice,
        title: "Live Interpreter Session",
        description: `${bookFromLang} to ${bookToLang} · ${bookDate} ${bookTime}`,
        metadata: { client_id: user.id, service_id: service.id, service_slug: service.slug },
        finalize: async (intentId) => {
          console.info("Stripe payment succeeded for interpreter booking", { paymentIntentId: intentId });
          setShowingPayment(false);
          await handleBookSession(intentId);
        },
      });
      setShowingPayment(true);
      return;
    }

    setPayState("processing");


    try {
      const staffId = await pickMatchingStaff(service.category);
      const { data: sr, error: srErr } = await supabase
        .from("service_requests")
        .insert({
          client_id: user.id,
          service_id: service.id,
          service_category: service.category,
          status: "submitted",
          progress_step: 1,
          progress_total: 3,
          assigned_staff_id: staffId,
          applicant_type: "individual",
          priority: "normal",
          notes: JSON.stringify({
            type: "booked_session",
            fromLang: bookFromLang,
            toLang: bookToLang,
            date: bookDate,
            time: bookTime,
            notes: bookNotes || undefined,
          }),
        })
        .select()
        .single();
      if (srErr) throw srErr;
      const requestId = sr.id as string;

      await supabase.from("payments").insert({
        service_request_id: requestId,
        client_id: user.id,
        amount_rwf: basePrice,
        currency: "USD",
        method: "stripe",
        status: "completed",
        reference: `SB-${Date.now()}`,
      });

      await createNotification({
        user_id: user.id,
        type: "case_submitted",
        title: "Interpreter session booked",
        body: `Your session is scheduled for ${bookDate} at ${bookTime}.`,
        link: "/dashboard/my-services",
      });

      if (staffId) {
        await createNotification({
          user_id: staffId,
          type: "new_case",
          title: "New interpreter booking",
          body: `${profile?.full_name ?? "A client"} booked a session on ${bookDate}.`,
          link: "/staff/cases",
        });
      }

      onOpenChange(false);
      navigate({
        to: "/dashboard/confirmation/$requestId",
        params: { requestId },
        search: {
          serviceName: "Live Interpreter Session",
          priceText: priceText ?? "$2 – $17",
          payMethod: "card",
        } as never,
      });
    } catch (e) {
      console.error("Interpreter booking submission failed", e);
      setPayState("idle");
      const message = (e as Error).message || "We could not book your interpreter session.";
      setStripeError(message);
      toast.error(message);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "h-dvh w-full rounded-none",
          "sm:h-[90dvh] sm:max-w-2xl sm:rounded-xl",
        )}
      >
        <PayOverlay state={payState} />

        {showingPayment && payIntent ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-gradient-to-br from-muted/40 via-background to-primary/5 p-4 sm:p-6">
            <div className="w-full max-w-lg space-y-4">
              {stripeError ? (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{stripeError}</span>
                </div>
              ) : null}
              <StripePaymentForm
                amount={payIntent.amount}
                serviceTitle={payIntent.title}
                description={payIntent.description}
                metadata={payIntent.metadata}
                onSuccess={async (intentId: string) => {
                  setStripeError(null);
                  await payIntent.finalize(intentId);
                }}
                onCancel={() => {
                  setShowingPayment(false);
                  setPayIntent(null);
                }}
                onError={(message, error) => {
                  console.error("Stripe checkout failed", error ?? message);
                  setStripeError(message);
                }}
              />
            </div>
          </div>
        ) : isInterpreter ? (
          // ── Interpreter layout ───────────────────────────────────────────
          <>

            <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
              <DialogTitle asChild>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                    <Phone className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold leading-tight">Live Interpreter Call</p>
                    <p className="mt-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                      First 5 minutes FREE
                    </p>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              {interpreterView === "options" ? (
                <div className="space-y-5">
                  <p className="text-center text-sm text-muted-foreground">
                    Choose how you'd like to connect with an interpreter
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Call Now */}
                    <div className="flex flex-col gap-4 rounded-xl border border-border p-5 transition-colors hover:border-primary/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/15">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Call Now</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Connect instantly with an available interpreter
                        </p>
                      </div>
                      <Button
                        className="mt-auto w-full bg-green-600 text-white hover:bg-green-700"
                        onClick={handleFreeCall}
                        disabled={payState !== "idle"}
                      >
                        {payState === "processing" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Start Free Call"
                        )}
                      </Button>
                    </div>

                    {/* Book a Session */}
                    <div className="flex flex-col gap-4 rounded-xl border border-border p-5 transition-colors hover:border-primary/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Book a Session</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Schedule for a specific date and time
                        </p>
                      </div>
                      <Button
                        className="mt-auto w-full"
                        onClick={() => setInterpreterView("booking")}
                      >
                        Book Session
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Booking form
                <div className="space-y-5">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setInterpreterView("options")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>

                  <p className="font-semibold">Book an Interpreter Session</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        From Language <span className="text-destructive">*</span>
                      </Label>
                      <Select value={bookFromLang} onValueChange={setBookFromLang}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        To Language <span className="text-destructive">*</span>
                      </Label>
                      <Select value={bookToLang} onValueChange={setBookToLang}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={bookDate}
                        onChange={(e) => setBookDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Time <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="time"
                        value={bookTime}
                        onChange={(e) => setBookTime(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Notes (optional)</Label>
                    <Textarea
                      rows={2}
                      value={bookNotes}
                      onChange={(e) => setBookNotes(e.target.value)}
                      placeholder="Medical appointment, business meeting, legal matter…"
                      className="resize-none text-sm"
                    />
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Live Interpreter Session</span>
                      <span className="font-semibold">$2 – $17 / session</span>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleBookSession()}
                      disabled={payState !== "idle"}
                    >
                      {payState === "processing" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                        </>
                      ) : (
                        "Confirm & Pay"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // ── Standard service layout ──────────────────────────────────────
          <>
            {/* Header */}
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
              <DialogTitle asChild>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CAT_EMOJI[service.category]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold leading-tight">{localName}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{localDesc}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {priceText && (
                      <Badge variant="secondary" className="font-semibold">
                        {priceText}
                      </Badge>
                    )}
                    {timeText && (
                      <span className="text-[11px] text-muted-foreground">{timeText}</span>
                    )}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Tabs */}
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as typeof tab)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="h-10 w-full shrink-0 rounded-none border-b border-border bg-transparent px-5">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="requirements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Requirements
                </TabsTrigger>
                <TabsTrigger value="apply" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                  Apply
                </TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden">
                <div className="space-y-5">
                  <div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{localDesc}</p>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What you get
                    </p>
                    <ul className="space-y-2">
                      {whatYouGet.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      How it works
                    </p>
                    <TimelineDots steps={progressSteps} />
                  </div>

                  <Button className="w-full" onClick={() => setTab("apply")}>
                    Start Application <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Requirements */}
              <TabsContent value="requirements" className="flex-1 overflow-y-auto px-5 py-4 data-[state=inactive]:hidden">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please have the following documents and information ready before applying.
                  </p>

                  {requiredDocs.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">
                      No documents required for this service.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {requiredDocs.map((doc) => (
                        <li
                          key={doc}
                          className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40">
                            <Check className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <span className="text-sm">{doc}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="rounded-md bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                    You can still submit your application and upload documents later from "My
                    Services" if you don't have everything ready.
                  </p>

                  <Button className="w-full" onClick={() => setTab("apply")}>
                    Continue to Apply <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Apply */}
              <TabsContent value="apply" className="flex-1 overflow-y-auto data-[state=inactive]:hidden">
                <div className="space-y-6 px-5 py-4">

                  {/* Personal info */}
                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Personal information
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Full Name</Label>
                        <Input value={profile?.full_name ?? ""} readOnly className="bg-muted/40 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input value={profile?.email ?? ""} readOnly className="bg-muted/40 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input value={profile?.phone ?? ""} readOnly className="bg-muted/40 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Applicant type</Label>
                        <Select
                          value={applicantType}
                          onValueChange={(v) => setApplicantType(v as ApplicantType)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="family">Family</SelectItem>
                            <SelectItem value="company">Company / Organization</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nationality</Label>
                        <Input
                          value={nationality}
                          onChange={(e) => setNationality(e.target.value)}
                          placeholder="e.g. Rwandan, Chinese…"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Passport / ID (optional)</Label>
                        <Input
                          value={passportId}
                          onChange={(e) => setPassportId(e.target.value)}
                          placeholder="AB1234567"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Service-specific fields */}
                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Service details
                    </p>
                    <ServiceFields
                      category={service.category}
                      slug={service.slug}
                      value={details}
                      onChange={setDetails}
                    />
                  </section>

                  {/* Document uploads */}
                  {requiredDocs.length > 0 && (
                    <section className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Documents
                      </p>
                      <div className="space-y-2">
                        {requiredDocs.map((doc) => (
                          <UploadRow key={doc} label={doc} onPick={addFile(doc)} />
                        ))}
                        <UploadRow label="Add another file" extra onPick={addFile()} />
                      </div>
                      {files.length > 0 && (
                        <div className="space-y-2 rounded-md border border-border p-3">
                          {files.map((f, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">{f.file.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {(f.file.size / 1024).toFixed(0)} KB
                                </span>
                                <button
                                  type="button"
                                  aria-label="Remove file"
                                  onClick={() => removeFile(i)}
                                  className="rounded p-0.5 hover:bg-accent"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              {f.progress < 100 && (
                                <Progress value={f.progress} className="h-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Notes */}
                  <section className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Additional notes (optional)
                    </Label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special instructions or context…"
                      className="resize-none text-sm"
                    />
                  </section>

                  {/* Payment */}
                  <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment
                    </p>

                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{localName}</span>
                        <span className="font-semibold">{priceText ?? "Free"}</span>
                      </div>
                      {priceText && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Final price confirmed after review · charged on approval
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">Payment method</p>
                    <div className="flex gap-2">
                      <PayMethodCard
                        id="card"
                        label="Card"
                        icon={<CreditCard className="h-5 w-5" />}
                        selected={payMethod === "card"}
                        onSelect={() => setPayMethod("card")}
                      />
                      <PayMethodCard
                        id="paypal"
                        label="PayPal"
                        icon={<span className="text-base font-bold text-blue-600">P</span>}
                        selected={payMethod === "paypal"}
                        onSelect={() => setPayMethod("paypal")}
                      />
                      <PayMethodCard
                        id="momo"
                        label="MTN MoMo"
                        icon={<Smartphone className="h-5 w-5" />}
                        selected={payMethod === "momo"}
                        onSelect={() => setPayMethod("momo")}
                      />
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleSubmit(false)}
                      disabled={payState !== "idle"}
                    >
                      {payState === "processing" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                        </>
                      ) : (
                        <>
                          Submit &amp; Pay{" "}
                          {basePrice > 0 ? fmtUSD(basePrice) : ""}
                        </>
                      )}
                    </Button>
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


// ─── Service-specific form fields ─────────────────────────────────────────────

function ServiceFields({
  category,
  slug,
  value,
  onChange,
}: {
  category: ServiceCategory;
  slug: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });

  if (category === "visa" && !slug.includes("consultation")) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Passport Number</Label>
            <Input
              value={value.passport ?? ""}
              onChange={(e) => set("passport", e.target.value)}
              placeholder="AB1234567"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nationality</Label>
            <Input
              value={value.nationality ?? ""}
              onChange={(e) => set("nationality", e.target.value)}
              placeholder="e.g. Rwandan"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Visa Type <span className="text-destructive">*</span>
            </Label>
            <Select value={value.visaType ?? ""} onValueChange={(v) => set("visaType", v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tourist">Tourist</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="work">Work / Employment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Destination Country</Label>
            <Input
              value={value.destination ?? ""}
              onChange={(e) => set("destination", e.target.value)}
              placeholder="e.g. Rwanda, China…"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Travel Date</Label>
            <Input
              type="date"
              value={value.travelDate ?? ""}
              onChange={(e) => set("travelDate", e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Return Date</Label>
            <Input
              type="date"
              value={value.returnDate ?? ""}
              onChange={(e) => set("returnDate", e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      </div>
    );
  }

  if (category === "translation") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Source Language <span className="text-destructive">*</span>
            </Label>
            <Select value={value.sourceLang ?? ""} onValueChange={(v) => set("sourceLang", v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Target Language <span className="text-destructive">*</span>
            </Label>
            <Select value={value.targetLang ?? ""} onValueChange={(v) => set("targetLang", v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Document Type</Label>
          <Input
            value={value.docType ?? ""}
            onChange={(e) => set("docType", e.target.value)}
            placeholder="e.g. Contract, certificate, ID…"
            className="text-sm"
          />
        </div>
      </div>
    );
  }

  if (category === "accounting") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Company Name</Label>
            <Input
              value={value.companyName ?? ""}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Your company name"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Business Registration No.</Label>
            <Input
              value={value.regNumber ?? ""}
              onChange={(e) => set("regNumber", e.target.value)}
              placeholder="RDB / registration number"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fiscal Year</Label>
            <Input
              value={value.fiscalYear ?? ""}
              onChange={(e) => set("fiscalYear", e.target.value)}
              placeholder="e.g. 2024 / 2025"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reporting Period</Label>
            <Select value={value.period ?? ""} onValueChange={(v) => set("period", v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // consultancy (default)
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Company / Project Name</Label>
          <Input
            value={value.companyName ?? ""}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Your company or project"
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Business Stage</Label>
          <Select value={value.businessStage ?? ""} onValueChange={(v) => set("businessStage", v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="startup">Startup</SelectItem>
              <SelectItem value="growing">Growing</SelectItem>
              <SelectItem value="established">Established</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Preferred meeting format</Label>
        <Select value={value.meetingType ?? ""} onValueChange={(v) => set("meetingType", v)}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in-person">In-person</SelectItem>
            <SelectItem value="video">Video call</SelectItem>
            <SelectItem value="phone">Phone call</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Brief description of your needs</Label>
        <Textarea
          rows={3}
          value={value.brief ?? ""}
          onChange={(e) => set("brief", e.target.value)}
          placeholder="Describe what you need help with…"
          className="resize-none text-sm"
        />
      </div>
    </div>
  );
}
