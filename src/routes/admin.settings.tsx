/*
  Required SQL (run in Supabase SQL editor):

  CREATE TABLE IF NOT EXISTS public.company_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES public.users(id)
  );

  ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Admins read settings" ON public.company_settings
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

  CREATE POLICY "Admins upsert settings" ON public.company_settings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
*/
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

type Settings = {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo_url: string;
  };
  hours: Record<string, { enabled: boolean; open: string; close: string }>;
  notifications: { new_cases: boolean; payments: boolean; system_alerts: boolean };
  payments: { momo_number: string; card_enabled: boolean; cash_enabled: boolean };
};

const DEFAULTS: Settings = {
  company: { name: "", address: "", phone: "", email: "", website: "", logo_url: "" },
  hours: {
    monday: { enabled: true, open: "09:00", close: "17:00" },
    tuesday: { enabled: true, open: "09:00", close: "17:00" },
    wednesday: { enabled: true, open: "09:00", close: "17:00" },
    thursday: { enabled: true, open: "09:00", close: "17:00" },
    friday: { enabled: true, open: "09:00", close: "17:00" },
    saturday: { enabled: false, open: "09:00", close: "13:00" },
    sunday: { enabled: false, open: "09:00", close: "13:00" },
  },
  notifications: { new_cases: true, payments: true, system_alerts: true },
  payments: { momo_number: "", card_enabled: true, cash_enabled: true },
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function AdminSettings() {
  const { profile } = useAuth();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("company_settings").select("key,value");
      if (data) {
        const merged = { ...DEFAULTS };
        for (const row of data as { key: string; value: unknown }[]) {
          if (row.key in merged) {
            (merged as Record<string, unknown>)[row.key] = {
              ...(merged as Record<string, Record<string, unknown>>)[row.key],
              ...(row.value as Record<string, unknown>),
            };
          }
        }
        setS(merged);
      }
      setLoading(false);
    })();
  }, []);

  const save = async (key: keyof Settings) => {
    setSaving(key);
    const { error } = await supabase.from("company_settings").upsert(
      { key, value: s[key], updated_by: profile?.id ?? null, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
  };

  const uploadLogo = async (file: File) => {
    const path = `branding/logo-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setS((p) => ({ ...p, company: { ...p.company, logo_url: data.publicUrl } }));
    toast.success("Logo uploaded — click Save to persist");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Company-wide configuration.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Company info</CardTitle>
          <Button size="sm" onClick={() => save("company")} disabled={saving === "company"}>
            {saving === "company" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Save</span>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {([
            ["name", "Company name"],
            ["email", "Contact email"],
            ["phone", "Phone"],
            ["website", "Website"],
          ] as const).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                value={s.company[k]}
                onChange={(e) => setS((p) => ({ ...p, company: { ...p.company, [k]: e.target.value } }))}
              />
            </div>
          ))}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Textarea
              rows={2}
              value={s.company.address}
              onChange={(e) => setS((p) => ({ ...p, company: { ...p.company, address: e.target.value } }))}
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {s.company.logo_url && (
                <img src={s.company.logo_url} alt="logo" className="h-12 w-12 rounded border border-border object-cover" />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Working hours</CardTitle>
          <Button size="sm" onClick={() => save("hours")} disabled={saving === "hours"}>
            {saving === "hours" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Save</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((day) => {
            const h = s.hours[day];
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <div className="flex w-32 items-center gap-2">
                  <Switch
                    checked={h.enabled}
                    onCheckedChange={(v) =>
                      setS((p) => ({ ...p, hours: { ...p.hours, [day]: { ...h, enabled: v } } }))
                    }
                  />
                  <span className="capitalize text-sm">{day}</span>
                </div>
                <Input
                  type="time"
                  value={h.open}
                  disabled={!h.enabled}
                  className="w-32"
                  onChange={(e) =>
                    setS((p) => ({ ...p, hours: { ...p.hours, [day]: { ...h, open: e.target.value } } }))
                  }
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={h.close}
                  disabled={!h.enabled}
                  className="w-32"
                  onChange={(e) =>
                    setS((p) => ({ ...p, hours: { ...p.hours, [day]: { ...h, close: e.target.value } } }))
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notifications</CardTitle>
          <Button size="sm" onClick={() => save("notifications")} disabled={saving === "notifications"}>
            {saving === "notifications" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Save</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            ["new_cases", "Email notifications for new cases"],
            ["payments", "Email notifications for payments"],
            ["system_alerts", "System alerts"],
          ] as const).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label htmlFor={k}>{label}</Label>
              <Switch
                id={k}
                checked={s.notifications[k]}
                onCheckedChange={(v) =>
                  setS((p) => ({ ...p, notifications: { ...p.notifications, [k]: v } }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payments</CardTitle>
          <Button size="sm" onClick={() => save("payments")} disabled={saving === "payments"}>
            {saving === "payments" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Save</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>MoMo business number</Label>
            <Input
              value={s.payments.momo_number}
              onChange={(e) => setS((p) => ({ ...p, payments: { ...p.payments, momo_number: e.target.value } }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label>Card payments enabled</Label>
            <Switch
              checked={s.payments.card_enabled}
              onCheckedChange={(v) => setS((p) => ({ ...p, payments: { ...p.payments, card_enabled: v } }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Office / cash payments enabled</Label>
            <Switch
              checked={s.payments.cash_enabled}
              onCheckedChange={(v) => setS((p) => ({ ...p, payments: { ...p.payments, cash_enabled: v } }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
