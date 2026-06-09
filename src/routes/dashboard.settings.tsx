import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useTheme } from "@/lib/providers/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Smartphone,
  Sun,
  Moon,
  Monitor,
  Globe,
  Shield,
  AlertTriangle,
  Laptop,
  Trash2,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale, Theme } from "@/lib/types";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

const LANGS: { v: Locale | string; label: string; flag: string }[] = [
  { v: "en", label: "English", flag: "🇬🇧" },
  { v: "zh", label: "中文", flag: "🇨🇳" },
  { v: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
  { v: "fr", label: "Français", flag: "🇫🇷" },
  { v: "ar", label: "العربية", flag: "🇸🇦" },
];

const THEMES: { v: Theme; label: string; Icon: typeof Sun }[] = [
  { v: "light", label: "Light", Icon: Sun },
  { v: "dark", label: "Dark", Icon: Moon },
  { v: "system", label: "System", Icon: Monitor },
];

function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const themeCtx = useTheme();
  const { user, profile, updatePassword, refreshProfile } = useAuth();
  const [twoFA, setTwoFA] = useState<boolean>(profile?.two_factor_enabled ?? false);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("+250 ");
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState<boolean>(
    (profile as never as { sms_notifications_enabled?: boolean })?.sms_notifications_enabled ?? false,
  );
  const [smsPreferences, setSmsPreferences] = useState({
    serviceUpdates: true,
    paymentConfirmations: true,
    promotionalMessages: false,
  });
  const [smsBusy, setSmsBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const setLanguage = async (l: Locale) => {
    setLocale(l);
    if (user)
      await supabase
        .from("users")
        .update({ preferred_language: l })
        .eq("id", user.id)
        .then(() => refreshProfile());
  };

  const setThemePref = async (th: Theme) => {
    themeCtx.setTheme(th);
    if (user) await supabase.from("users").update({ theme_preference: th }).eq("id", user.id);
  };

  const changePw = async () => {
    if (newPw.length < 8) {
      toast.error(t("dashboard.settings.pwShort"));
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(newPw);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("dashboard.settings.pwUpdated"));
    setPwOpen(false);
    setCurrentPw("");
    setNewPw("");
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
    toast.success(t("dashboard.settings.signedOutAll"));
  };

  const toggle2FA = async (v: boolean) => {
    setTwoFA(v);
    if (user) await supabase.from("users").update({ two_factor_enabled: v }).eq("id", user.id);
    toast.message(t("dashboard.settings.twoFAStub"));
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+250")) return "+250 ";
    const digits = cleaned.slice(4);
    if (digits.length === 0) return "+250 ";
    if (digits.length <= 3) return `+250 ${digits}`;
    if (digits.length <= 6) return `+250 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+250 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  };

  const handleSaveSmsPreferences = async () => {
    setSmsBusy(true);
    if (user) {
      await supabase
        .from("users")
        .update({ sms_notifications_enabled: smsNotificationsEnabled } as never)
        .eq("id", user.id);
    }
    setSmsBusy(false);
    toast.success("Preferences saved!");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.settings.title")}</h1>
        <p className="text-sm text-muted-foreground">Customize your experience and security</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            {t("dashboard.settings.appearance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map(({ v, label, Icon }) => (
              <button
                key={v}
                onClick={() => setThemePref(v)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition hover:bg-accent",
                  themeCtx.theme === v
                    ? "border-primary bg-primary/5"
                    : "border-border",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            {t("dashboard.settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGS.map((l) => {
              const supported = ["en", "zh", "rw"].includes(l.v);
              return (
                <button
                  key={l.v}
                  onClick={() => supported && setLanguage(l.v as Locale)}
                  disabled={!supported}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                    locale === l.v
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-accent",
                    !supported && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <span className="text-lg">{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {!supported && <span className="text-[10px] text-muted-foreground">soon</span>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            {t("dashboard.settings.security")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>{t("dashboard.settings.twoFA")}</Label>
              <p className="text-xs text-muted-foreground">{t("dashboard.settings.twoFADesc")}</p>
            </div>
            <Switch checked={twoFA} onCheckedChange={toggle2FA} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {t("dashboard.settings.changePw")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("dashboard.settings.changePw")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t("dashboard.settings.currentPw")}</Label>
                    <Input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("dashboard.settings.newPw")}</Label>
                    <Input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={changePw} disabled={busy}>
                    {busy ? t("dashboard.common.saving") : t("dashboard.common.save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={signOutEverywhere}>
              {t("dashboard.settings.signOutAll")}
            </Button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Active Sessions
            </Label>
            <div className="rounded-lg border border-border divide-y">
              <div className="flex items-center gap-3 p-3">
                <Laptop className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Current browser</div>
                  <div className="text-xs text-muted-foreground">This device</div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Current
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-primary" />
            SMS Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Get SMS updates about your services</p>

          <div className="space-y-2">
            <Label className="text-sm">Phone number</Label>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="+250 078X XXX XXX"
                value={smsPhoneNumber}
                onChange={(e) => setSmsPhoneNumber(formatPhoneNumber(e.target.value))}
                maxLength={17}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("SMS verification coming soon.")}
              >
                Verify
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium">Notification preferences</Label>
            <div className="space-y-2">
              {[
                ["serviceUpdates", "Service status updates"],
                ["paymentConfirmations", "Payment confirmations"],
                ["promotionalMessages", "Promotional messages"],
              ].map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={smsPreferences[key as keyof typeof smsPreferences]}
                    onChange={(e) =>
                      setSmsPreferences((p) => ({ ...p, [key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm border-t pt-3">
              <Switch
                checked={smsNotificationsEnabled}
                onCheckedChange={setSmsNotificationsEnabled}
              />
              <span>Enable SMS notifications</span>
            </label>
          </div>

          <Button onClick={handleSaveSmsPreferences} disabled={smsBusy} className="w-full">
            {smsBusy ? "Saving..." : "Save Preferences"}
          </Button>

          <div className="rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
            <p className="font-medium">SMS notifications coming soon!</p>
            <p className="mt-1 text-xs">
              We're working on integrating SMS delivery. Your preferences are saved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-destructive/5 p-4">
            <div>
              <div className="text-sm font-semibold">Delete Account</div>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data. This cannot be undone.
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete My Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm account deletion</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm.
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
        </CardContent>
      </Card>
    </div>
  );
}
