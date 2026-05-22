import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
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
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setPreferredLanguage(profile.preferred_language);
    // tin_number may not be on ProfileRow type; cast loosely
    setTin((profile as unknown as { tin_number?: string }).tin_number ?? "");
  }, [profile]);

  if (!profile) return <Skeleton className="h-60 max-w-2xl" />;

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
        })
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
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.profile.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.profile.picture")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile.profile_picture_url ? (
                <AvatarImage src={profile.profile_picture_url} />
              ) : null}
              <AvatarFallback>
                {(profile.full_name?.[0] ?? profile.email[0]).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <Button asChild variant="outline" size="sm" disabled={avatarUploading}>
                <span>
                  {avatarUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-3.5 w-3.5" />
                  )}
                  {t("dashboard.profile.changePicture")}
                </span>
              </Button>
              <Input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.profile.info")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("dashboard.profile.fullName")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.profile.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.profile.email")}</Label>
              <Input value={profile.email} readOnly className="bg-muted/40" />
              <p className="text-xs text-muted-foreground">{t("dashboard.profile.emailHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.profile.role")}</Label>
              <Input value={profile.role} readOnly className="bg-muted/40 capitalize" />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.profile.tin")}</Label>
              <Input value={tin} onChange={(e) => setTin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.profile.createdAt")}</Label>
              <Input
                value={new Date(profile.created_at).toLocaleDateString()}
                readOnly
                className="bg-muted/40"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.profile.preferredLang")}</Label>
            <RadioGroup
              value={preferredLanguage}
              onValueChange={(v) => setPreferredLanguage(v as Locale)}
              className="flex gap-4"
            >
              {(["en", "zh", "rw"] as Locale[]).map((l) => (
                <label key={l} className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value={l} />{" "}
                  {l === "en" ? "English" : l === "zh" ? "中文" : "Kinyarwanda"}
                </label>
              ))}
            </RadioGroup>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? t("dashboard.common.saving") : t("dashboard.common.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
