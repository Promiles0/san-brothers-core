import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Upload, X } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getRequiredDocs } from "@/lib/dashboard/service-requirements";
import type { Service, ServiceCategory } from "@/lib/types/database";

export const Route = createFileRoute("/dashboard/services/$slug")({
  component: RequestServicePage,
});
interface PendingUpload {
  file: File;
  requirement?: string;
}

function RequestServicePage() {
  const { slug } = Route.useParams();
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null | undefined>(undefined);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<PendingUpload[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (files.length === 0) {
      toast.error(t("dashboard.services.errNoFiles"));
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create service request
      const { data: sr, error: srErr } = await supabase
        .from("service_requests")
        .insert({
          client_id: user.id,
          service_id: service.id,
          service_category: service.category,
          status: "submitted",
          progress_step: 1,
          progress_total: 5,
          applicant_type: "individual",
          priority: "normal",
          notes: notes || null,
        })
        .select()
        .single();
      if (srErr) throw srErr;
      const requestId = sr.id as string;

      // 2. Upload files
      for (const { file } of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `clients/${user.id}/${requestId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file);
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

      toast.success(t("dashboard.services.successToast"));
      navigate({ to: "/dashboard/my-services/$id", params: { id: requestId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* About You */}
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

      {/* Category-specific details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.services.section.details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategoryDetails
            category={service.category}
            value={details}
            onChange={setDetails}
            t={t}
          />
        </CardContent>
      </Card>

      {/* Required documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("dashboard.services.section.requiredDocs")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiredDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.services.noDocsRequired")}
            </p>
          ) : (
            requiredDocs.map((req) => <UploadRow key={req} label={req} onPick={onFilePick(req)} />)
          )}

          <UploadRow
            label={t("dashboard.services.addAnother")}
            onPick={onFilePick(undefined)}
            extra
          />

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

      {/* Notes */}
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

      <Button
        onClick={submit}
        disabled={submitting || files.length === 0}
        size="lg"
        className="w-full sm:w-auto"
      >
        {submitting ? t("dashboard.common.submitting") : t("dashboard.services.submit")}
      </Button>
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

function CategoryDetails({
  category,
  value,
  onChange,
  t,
}: {
  category: ServiceCategory;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  t: (k: string) => string;
}) {
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });

  if (category === "visa") {
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
  if (category === "accounting") {
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
  if (category === "consultancy") {
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
  if (category === "translation") {
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
  return null;
}
