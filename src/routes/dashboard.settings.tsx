import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import type { Locale, Theme } from "@/lib/types";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});
function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const themeCtx = useTheme();
  const { user, profile, updatePassword, refreshProfile } = useAuth();
  const [twoFA, setTwoFA] = useState<boolean>(profile?.two_factor_enabled ?? false);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.settings.appearance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={themeCtx.theme}
            onValueChange={(v) => setThemePref(v as Theme)}
            className="flex gap-4"
          >
            {(["light", "dark", "system"] as Theme[]).map((th) => (
              <label key={th} className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value={th} /> {t(`theme.${th}`)}
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.settings.language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={locale}
            onValueChange={(v) => setLanguage(v as Locale)}
            className="flex gap-4"
          >
            {(["en", "zh", "rw"] as Locale[]).map((l) => (
              <label key={l} className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value={l} />{" "}
                {l === "en" ? "English" : l === "zh" ? "中文" : "Kinyarwanda"}
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.settings.security")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.settings.notifications")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("dashboard.settings.notifStub")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
