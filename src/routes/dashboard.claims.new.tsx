import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, X, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/dashboard/claims/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    service_request_id: typeof s.service_request_id === "string" ? s.service_request_id : undefined,
  }),
  component: NewClaimPage,
});

const REASONS = [
  "service_not_delivered",
  "service_incorrect",
  "long_delay",
  "quality_issue",
  "refund_request",
  "other",
];

interface SROpt {
  id: string;
  services: { name_en: string } | null;
}

function NewClaimPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { service_request_id } = useSearch({ from: "/dashboard/claims/new" });
  const [srId, setSrId] = useState<string>(service_request_id ?? "");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<SROpt[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("id,services(name_en)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      setOptions((data as unknown as SROpt[]) ?? []);
    })();
  }, [user]);

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    setFiles((p) => [...p, ...list]);
    e.target.value = "";
  };

  const submit = async () => {
    if (!user) return;
    if (!reason) {
      toast.error(t("dashboard.claims.errReason"));
      return;
    }
    if (description.trim().length < 20) {
      toast.error(t("dashboard.claims.errDescription"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: claim, error } = await supabase
        .from("claims")
        .insert({
          client_id: user.id,
          service_request_id: srId || null,
          reason_category: reason,
          description,
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;

      const paths: string[] = [];
      for (const f of files) {
        const safe = f.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${user.id}/claims/${claim.id}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, f);
        if (upErr) throw upErr;
        paths.push(path);
      }
      if (paths.length > 0) {
        await supabase.from("claims").update({ evidence_file_paths: paths }).eq("id", claim.id);
      }

      toast.success(t("dashboard.claims.successToast"));
      navigate({ to: "/dashboard/claims" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard/claims">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("dashboard.common.back")}
        </Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.claims.newTitle")}</h1>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>
              {t("dashboard.claims.linkedService")}{" "}
              <span className="text-muted-foreground">({t("dashboard.common.optional")})</span>
            </Label>
            <Select value={srId} onValueChange={setSrId}>
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.common.select")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.services?.name_en ?? o.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.claims.reason.label")} *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.common.select")} />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`dashboard.claims.reason.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.claims.description")} *</Label>
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dashboard.claims.descPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {description.length} / 20+ {t("dashboard.common.chars")}
            </p>
          </div>
          <div className="space-y-2">
            <Label>
              {t("dashboard.claims.evidence")}{" "}
              <span className="text-muted-foreground">({t("dashboard.common.optional")})</span>
            </Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-3 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" /> {t("dashboard.claims.addEvidence")}
              <Input type="file" multiple className="hidden" onChange={addFiles} />
            </label>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{f.name}</span>
                    <button
                      aria-label="Remove file"
                      onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                      className="rounded p-1 hover:bg-accent"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? t("dashboard.common.submitting") : t("dashboard.claims.submit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
