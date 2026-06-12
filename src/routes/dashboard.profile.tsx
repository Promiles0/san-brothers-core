import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  Loader2,
  User,
  Briefcase,
  Globe,
  Shield,
  Mail,
  Phone,
  CheckCircle2,
  Circle,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t, setLocale } = useI18n();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>("en");
  const [tin, setTin] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [nationality, setNationality] = useState("");
  const [contactMethod, setContactMethod] = useState("email");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setPreferredLanguage(profile.preferred_language);
    const p = profile as unknown as {
      tin_number?: string;
      company_name?: string;
      nationality?: string;
      preferred_contact_method?: string;
    };
    setTin(p.tin_number ?? "");
    setCompanyName(p.company_name ?? "");
    setNationality(p.nationality ?? "");
    setContactMethod(p.preferred_contact_method ?? "email");
  }, [profile]);

  const completion = useMemo(() => {
    if (!profile) return { pct: 0, missing: [] as string[] };
    const checks: { key: string; label: string; ok: boolean }[] = [
      { key: "name", label: "Full name", ok: !!profile.full_name },
      { key: "email", label: "Email", ok: !!profile.email },
      { key: "phone", label: "Phone", ok: !!profile.phone },
      { key: "avatar", label: "Profile photo", ok: !!profile.profile_picture_url },
      {
        key: "tin",
        label: "TIN Number",
        ok: !!(profile as unknown as { tin_number?: string }).tin_number,
      },
    ];
    const done = checks.filter((c) => c.ok).length;
    return {
      pct: Math.round((done / checks.length) * 100),
      checks,
      missing: checks.filter((c) => !c.ok).map((c) => c.label),
    };
  }, [profile]);

  if (!profile)
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <Skeleton className="h-72" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: fullName,
          phone,
          preferred_language: preferredLanguage,
          tin_number: tin || null,
          company_name: companyName || null,
          nationality: nationality || null,
          preferred_contact_method: contactMethod,
        } as never)
        .eq("id", user.id);
      if (error) throw error;
      setLocale(preferredLanguage);
      await refreshProfile();
      toast.success(t("dashboard.profile.savedToast"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    e.target.value = "";
    setAvatarUploading(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, f, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("users")
        .update({ profile_picture_url: pub.publicUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
      toast.success(t("dashboard.profile.avatarUpdated"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.profile.title")}</h1>
        <p className="text-sm text-muted-foreground">
          Keep your information up to date for faster service
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* LEFT: avatar + completion */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                {profile.profile_picture_url ? (
                  <AvatarImage src={profile.profile_picture_url} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {(profile.full_name?.[0] ?? profile.email[0]).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{profile.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{profile.email}</div>
                <Badge variant="outline" className="mt-2 capitalize">
                  {profile.role}
                </Badge>
              </div>
              <label className="w-full cursor-pointer">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={avatarUploading}
                >
                  <span>
                    {avatarUploading ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-3.5 w-3.5" />
                    )}
                    {t("dashboard.profile.changePicture")}
                  </span>
                </Button>
                <Input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Profile completion
                </span>
                <span className="text-sm font-bold">{completion.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                  style={{ width: `${completion.pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Complete your profile to get better service.
              </p>
              <div className="space-y-1.5 pt-1">
                {(completion.checks ?? []).map((c) => (
                  <div key={c.key} className="flex items-center gap-2 text-xs">
                    {c.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={cn(c.ok ? "text-muted-foreground line-through" : "")}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: form sections */}
        <div className="space-y-6">
          <Section icon={User} title="Personal Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("dashboard.profile.fullName")}>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label={t("dashboard.profile.phone")}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label={t("dashboard.profile.email")} hint={t("dashboard.profile.emailHint")}>
                <Input value={profile.email} readOnly className="bg-muted/40" />
              </Field>
              <Field label="Nationality">
                <Input
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g. Chinese"
                />
              </Field>
            </div>
          </Section>

          <Section icon={Briefcase} title="Business Information" subtitle="Optional">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company Name">
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </Field>
              <Field label={t("dashboard.profile.tin")}>
                <Input value={tin} onChange={(e) => setTin(e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section icon={Globe} title="Preferences">
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("dashboard.profile.preferredLang")}
                </Label>
                <RadioGroup
                  value={preferredLanguage}
                  onValueChange={(v) => setPreferredLanguage(v as Locale)}
                  className="mt-2 flex flex-wrap gap-3"
                >
                  {(["en", "zh", "rw"] as Locale[]).map((l) => (
                    <label
                      key={l}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <RadioGroupItem value={l} />
                      {l === "en" ? "🇬🇧 English" : l === "zh" ? "🇨🇳 中文" : "🇷🇼 Kinyarwanda"}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Preferred contact method
                </Label>
                <RadioGroup
                  value={contactMethod}
                  onValueChange={setContactMethod}
                  className="mt-2 flex flex-wrap gap-3"
                >
                  {[
                    { v: "email", label: "Email", Icon: Mail },
                    { v: "phone", label: "Phone", Icon: Phone },
                    { v: "whatsapp", label: "WhatsApp", Icon: Phone },
                  ].map(({ v, label, Icon }) => (
                    <label
                      key={v}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <RadioGroupItem value={v} />
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </Section>

          <Section icon={Shield} title="Account">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Account created</div>
                <div>{new Date(profile.created_at).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Role</div>
                <Badge variant="outline" className="capitalize">
                  {profile.role}
                </Badge>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-destructive">Delete Account</div>
                  <div className="text-xs text-muted-foreground">
                    Permanently delete your account and all data.
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete account?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone. Type{" "}
                      <span className="font-mono font-bold">DELETE</span> to confirm.
                    </p>
                    <Input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="Type DELETE"
                    />
                    <DialogFooter>
                      <Button
                        variant="destructive"
                        disabled={deleteConfirm !== "DELETE"}
                        onClick={() => toast.message("Contact support to delete your account.")}
                      >
                        Delete account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Section>

          <div className="sticky bottom-4 z-10 flex justify-end rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <Button onClick={save} disabled={saving} size="lg" className="w-full md:w-auto">
              {saving ? t("dashboard.common.saving") : t("dashboard.common.save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof User;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
          {subtitle && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">({subtitle})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
