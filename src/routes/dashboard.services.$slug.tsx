import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Upload,
  X,
  Smartphone,
  CreditCard,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase, uploadToStorage } from "@/lib/supabase";
import { toast } from "sonner";
import { getRequiredDocs } from "@/lib/dashboard/service-requirements";
import type { Service } from "@/lib/types/database";

export const Route = createFileRoute("/dashboard/services/$slug")({
  component: RequestServicePage,
});

interface PendingUpload {
  file: File;
  requirement?: string;
}

type PayMethod = "momo" | "stripe" | "office";
type ServiceType = "interpreter" | "document-translation" | "visa" | "accounting" | "consultancy";

function getServiceType(slug: string): ServiceType {
  if (slug.includes("live-interpreter") || slug.includes("interpreter") || slug === "live") {
    return "interpreter";
  }
  if (slug.includes("document-translation") || slug.includes("translation")) {
    return "document-translation";
  }
  if (slug.includes("visa") || slug.includes("work-permit")) {
    return "visa";
  }
  if (
    slug.includes("bookkeeping") ||
    slug.includes("tax") ||
    slug.includes("financial") ||
    slug.includes("audit")
  ) {
    return "accounting";
  }
  return "consultancy";
}

const PROGRESS_STEPS: Record<ServiceType, string[]> = {
  interpreter: ["Requested", "Interpreter Assigned", "Session Scheduled", "Completed"],
  "document-translation": [
    "Submitted",
    "Under Review",
    "In Translation",
    "Quality Check",
    "Delivered",
  ],
  visa: ["Submitted", "Document Review", "Verified", "Submitted to Authority", "Completed"],
  accounting: ["Submitted", "Assigned", "Analysis", "Report Ready", "Completed"],
  consultancy: ["Submitted", "Consultant Assigned", "Meeting Scheduled", "Completed"],
};

function RequestServicePage() {
  const { slug } = Route.useParams();
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null | undefined>(undefined);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [interpreterConfirmed, setInterpreterConfirmed] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [payRef, setPayRef] = useState<string>("");
  const [payProcessing, setPayProcessing] = useState(false);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<PendingUpload[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const serviceType = getServiceType(slug);
  const progressSteps = PROGRESS_STEPS[serviceType];
  const needsFiles = serviceType === "visa" || serviceType === "document-translation";

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        setService(null);
        return;
      }
      setService((data as Service | null) ?? null);
    })();
  }, [slug]);

  if (service === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("dashboard.services.notFound")}</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard/services">{t("dashboard.common.back")}</Link>
        </Button>
      </div>
    );
  }

  const localName =
    (locale === "zh" && service.name_zh) || (locale === "rw" && service.name_rw) || service.name_en;
  const localDesc =
    (locale === "zh" && service.description_zh) ||
    (locale === "rw" && service.description_rw) ||
    service.description_en ||
    "";

  const requiredDocs = getRequiredDocs(slug);

  const onFilePick = (req: string | undefined) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFiles((prev) => [...prev, { file: f, requirement: req }]);
    e.target.value = "";
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!user) return;
    if (needsFiles && files.length === 0) {
      toast.error(t("dashboard.services.errNoFiles"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: sr, error: srErr } = await supabase
        .from("service_requests")
        .insert({
          client_id: user.id,
          service_id: service.id,
          service_category: service.category,
          status: "submitted",
          progress_step: 1,
          progress_total: progressSteps.length,
          applicant_type: "individual",
          priority: "normal",
          notes: notes || null,
        })
        .select()
        .single();
      if (srErr) throw srErr;
      const requestId = sr.id as string;

      for (const { file } of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `clients/${user.id}/${requestId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await uploadToStorage("client-documents", path, file, {
          upsert: true,
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { error: docErr } = await supabase.from("documents").insert({
          service_request_id: requestId,
          client_id: user.id,
          uploaded_by: user.id,
          file_path: path,
          file_name: file.name,
          file_type: file.type || null,
          file_size_bytes: file.size,
          status: "uploaded",
        });
        if (docErr) throw docErr;
      }

      setCreatedRequestId(requestId);
      if (serviceType === "interpreter") {
        setInterpreterConfirmed(true);
      } else {
        toast.success(t("dashboard.services.successToast"));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const initiatePayment = async (method: PayMethod) => {
    if (!user || !service || !createdRequestId) return;
    setPayProcessing(true);
    try {
      const amount = service.price_min_rwf ?? 0;
      const reference = `SB-${Date.now()}`;
      const { error } = await supabase.from("payments").insert({
        service_request_id: createdRequestId,
        client_id: user.id,
        amount_rwf: amount,
        currency: "RWF",
        method,
        status: "pending",
        reference,
      });
      if (error) throw error;
      setPayRef(reference);
      setPayMethod(method);
      if (method === "office") {
        toast.success(t("dashboard.services.successToast"));
        setTimeout(
          () => navigate({ to: "/dashboard/my-services/$id", params: { id: createdRequestId } }),
          800,
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPayProcessing(false);
    }
  };

  const confirmPayment = async () => {
    if (!createdRequestId || !payRef) return;
    setPayProcessing(true);
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("reference", payRef);
      if (error) throw error;
      toast.success("Payment confirmed");
      navigate({ to: "/dashboard/my-services/$id", params: { id: createdRequestId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPayProcessing(false);
    }
  };

  if (interpreterConfirmed && createdRequestId) {
    return (
      <InterpreterConfirmation
        requestId={createdRequestId}
        onView={() =>
          navigate({ to: "/dashboard/my-services/$id", params: { id: createdRequestId } })
        }
      />
    );
  }

  if (createdRequestId) {
    return (
      <PaymentStep
        service={service}
        payMethod={payMethod}
        payRef={payRef}
        processing={payProcessing}
        onChoose={initiatePayment}
        onConfirm={confirmPayment}
        onSkip={() =>
          navigate({ to: "/dashboard/my-services/$id", params: { id: createdRequestId } })
        }
      />
    );
  }

  const showDocUpload = serviceType !== "interpreter" && serviceType !== "consultancy";
  const canSubmit = needsFiles ? files.length > 0 : true;

  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard/services">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("dashboard.common.back")}
        </Link>
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{localName}</h1>
          <Badge variant="secondary">{t(`dashboard.services.cat.${service.category}`)}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {service.price_min_rwf != null && (
            <span>
              {t("dashboard.services.from")} {service.price_min_rwf.toLocaleString()} RWF
            </span>
          )}
          {service.estimated_days_min != null && service.estimated_days_max != null && (
            <span>
              {service.estimated_days_min}–{service.estimated_days_max} {t("dashboard.common.days")}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm">{localDesc}</p>
      </div>

      <ProgressPreview steps={progressSteps} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.services.section.aboutYou")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t("dashboard.profile.fullName")} value={profile?.full_name ?? ""} />
          <Field label={t("dashboard.profile.email")} value={profile?.email ?? ""} />
          <Field label={t("dashboard.profile.phone")} value={profile?.phone ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.services.section.details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ServiceDetails serviceType={serviceType} value={details} onChange={setDetails} t={t} />
        </CardContent>
      </Card>

      {showDocUpload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {serviceType === "accounting"
                ? `${t("dashboard.services.section.requiredDocs")} (optional)`
                : t("dashboard.services.section.requiredDocs")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceType === "accounting" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Upload financial documents if available. You can share them later.
                </p>
                <UploadRow
                  label={t("dashboard.services.addAnother")}
                  onPick={onFilePick(undefined)}
                  extra
                />
              </>
            ) : (
              <>
                {requiredDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.services.noDocsRequired")}
                  </p>
                ) : (
                  requiredDocs.map((req) => (
                    <UploadRow key={req} label={req} onPick={onFilePick(req)} />
                  ))
                )}
                <UploadRow
                  label={t("dashboard.services.addAnother")}
                  onPick={onFilePick(undefined)}
                  extra
                />
              </>
            )}

            {files.length > 0 && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("dashboard.services.uploaded")}
                </div>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{f.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(f.file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="rounded p-1 hover:bg-accent"
                      aria-label="remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {serviceType !== "interpreter" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.services.section.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("dashboard.services.notesPlaceholder")}
            />
          </CardContent>
        </Card>
      )}

      <Button
        onClick={submit}
        disabled={submitting || !canSubmit}
        size="lg"
        className="w-full sm:w-auto"
      >
        {submitting ? t("dashboard.common.submitting") : t("dashboard.services.submit")}
      </Button>
    </div>
  );
}

function ProgressPreview({ steps }: { steps: string[] }) {
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex min-w-18 flex-col items-center gap-1 px-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-center text-[10px] leading-tight text-muted-foreground">
              {step}
            </span>
          </div>
          {i < steps.length - 1 && <div className="h-px w-5 shrink-0 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} readOnly className="bg-muted/40" />
    </div>
  );
}

function UploadRow({
  label,
  onPick,
  extra,
}: {
  label: string;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  extra?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-md border ${extra ? "border-dashed" : "border-border"} p-3 hover:bg-accent`}
    >
      <Upload className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-xs text-primary">Browse</span>
      <input type="file" className="hidden" onChange={onPick} />
    </label>
  );
}

const LANGUAGES = [
  "English",
  "Chinese (Mandarin)",
  "Kinyarwanda",
  "French",
  "Arabic",
  "Swahili",
  "Portuguese",
];

function ServiceDetails({
  serviceType,
  value,
  onChange,
  t,
}: {
  serviceType: ServiceType;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  t: (k: string) => string;
}) {
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });

  if (serviceType === "interpreter") {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("dashboard.services.translate.source")}</Label>
            <Select value={value.fromLang ?? ""} onValueChange={(v) => set("fromLang", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.common.select")} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.services.translate.target")}</Label>
            <Select value={value.toLang ?? ""} onValueChange={(v) => set("toLang", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.common.select")} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Preferred time slot</Label>
          <Input
            value={value.timeSlot ?? ""}
            onChange={(e) => set("timeSlot", e.target.value)}
            placeholder="e.g. Monday 10am–12pm, or ASAP"
          />
        </div>
        <div className="space-y-2">
          <Label>What do you need help with?</Label>
          <Textarea
            rows={3}
            value={value.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Briefly describe the context — medical appointment, business meeting, legal matter…"
          />
        </div>
      </>
    );
  }

  if (serviceType === "visa") {
    return (
      <>
        <div className="space-y-2">
          <Label>{t("dashboard.services.visa.type")}</Label>
          <Select value={value.visaType ?? ""} onValueChange={(v) => set("visaType", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("dashboard.common.select")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tourist">Tourist</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="work">Work</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("dashboard.services.visa.dates")}</Label>
            <Input
              value={value.travelDates ?? ""}
              onChange={(e) => set("travelDates", e.target.value)}
              placeholder="e.g. Jun 1 – Jul 15"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.services.visa.destination")}</Label>
            <Input
              value={value.destination ?? ""}
              onChange={(e) => set("destination", e.target.value)}
            />
          </div>
        </div>
      </>
    );
  }

  if (serviceType === "accounting") {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("dashboard.services.acct.period")}</Label>
            <Select value={value.period ?? ""} onValueChange={(v) => set("period", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.common.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.services.acct.businessType")}</Label>
            <Select value={value.businessType ?? ""} onValueChange={(v) => set("businessType", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.common.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("dashboard.services.acct.tin")}</Label>
          <Input value={value.tin ?? ""} onChange={(e) => set("tin", e.target.value)} />
        </div>
      </>
    );
  }

  if (serviceType === "consultancy") {
    return (
      <>
        <div className="space-y-2">
          <Label>{t("dashboard.services.acct.businessType")}</Label>
          <Input
            value={value.businessType ?? ""}
            onChange={(e) => set("businessType", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Preferred meeting type</Label>
          <Select value={value.meetingType ?? ""} onValueChange={(v) => set("meetingType", v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("dashboard.common.select")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in-person">In-person</SelectItem>
              <SelectItem value="video">Video call</SelectItem>
              <SelectItem value="phone">Phone call</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("dashboard.services.consult.brief")}</Label>
          <Textarea
            rows={3}
            value={value.brief ?? ""}
            onChange={(e) => set("brief", e.target.value)}
          />
        </div>
      </>
    );
  }

  // document-translation (and fallback)
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("dashboard.services.translate.source")}</Label>
          <Input
            value={value.sourceLang ?? ""}
            onChange={(e) => set("sourceLang", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("dashboard.services.translate.target")}</Label>
          <Input
            value={value.targetLang ?? ""}
            onChange={(e) => set("targetLang", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("dashboard.services.translate.docType")}</Label>
        <Input value={value.docType ?? ""} onChange={(e) => set("docType", e.target.value)} />
      </div>
    </>
  );
}

function InterpreterConfirmation({ requestId, onView }: { requestId: string; onView: () => void }) {
  const steps = PROGRESS_STEPS.interpreter;
  return (
    <div className="mx-auto max-w-xl space-y-6 py-12 text-center">
      <div className="flex justify-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold">Session being arranged</h2>
        <p className="mt-2 text-muted-foreground">
          Your interpreter session is being arranged. You'll receive a call link shortly.
        </p>
      </div>
      <div className="rounded-md border border-border bg-muted/40 p-4 text-left">
        <p className="text-xs text-muted-foreground">Reference</p>
        <p className="font-mono text-sm">{requestId}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-1.5">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className="text-xs text-muted-foreground">{step}</span>
            {i < steps.length - 1 && <span className="text-border">›</span>}
          </div>
        ))}
      </div>
      <Button onClick={onView} className="w-full sm:w-auto">
        View My Request
      </Button>
    </div>
  );
}

function PaymentStep({
  service,
  payMethod,
  payRef,
  processing,
  onChoose,
  onConfirm,
  onSkip,
}: {
  service: Service;
  payMethod: "momo" | "stripe" | "office" | null;
  payRef: string;
  processing: boolean;
  onChoose: (m: "momo" | "stripe" | "office") => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const min = service.price_min_rwf ?? 0;
  const max = service.price_max_rwf ?? min;
  const priceText =
    min && max && min !== max
      ? `${min.toLocaleString()} – ${max.toLocaleString()} RWF`
      : `${(min || max).toLocaleString()} RWF`;

  if (payMethod && payMethod !== "office") {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Payment initiated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-mono text-sm">{payRef}</p>
            </div>
            <p className="text-sm">
              {payMethod === "momo"
                ? "Complete the payment on your phone — check for the MoMo prompt."
                : "Complete the payment on your card terminal."}
            </p>
            <p className="text-sm text-muted-foreground">
              Method:{" "}
              <span className="font-medium">
                {payMethod === "momo" ? "MoMo (Flutterwave)" : "Card (Stripe)"}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">Amount: {priceText}</p>
            <div className="flex gap-2">
              <Button onClick={onConfirm} disabled={processing} className="flex-1">
                {processing ? "Confirming…" : "I've completed payment"}
              </Button>
              <Button variant="ghost" onClick={onSkip}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Request submitted — choose payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{priceText}</p>
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => onChoose("momo")}
              disabled={processing}
              className="w-full justify-start bg-orange-500 text-white hover:bg-orange-600"
            >
              <Smartphone className="mr-2 h-4 w-4" /> Pay with MoMo (Flutterwave)
            </Button>
            <Button
              onClick={() => onChoose("stripe")}
              disabled={processing}
              className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700"
            >
              <CreditCard className="mr-2 h-4 w-4" /> Pay with Card (Stripe)
            </Button>
            <Button
              onClick={() => onChoose("office")}
              disabled={processing}
              variant="secondary"
              className="w-full justify-start"
            >
              <Building2 className="mr-2 h-4 w-4" /> Pay Later / At Office
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
