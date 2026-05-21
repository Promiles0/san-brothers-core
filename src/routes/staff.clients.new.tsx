import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/clients/new")({ component: Page });

interface SvcOpt { id: string; name_en: string; category: string }
interface NewClient { id: string; full_name: string; pin: string }

function Page() {
  const { user } = useAuth();
  const { hasCapability, isLoading: capLoading } = useCapabilities();
  const navigate = useNavigate();
  useEffect(() => { if (!capLoading && !hasCapability("register_clients_manually")) navigate({ to: "/staff" }); }, [capLoading, hasCapability, navigate]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+250");
  const [email, setEmail] = useState("");
  const [tin, setTin] = useState("");
  const [city, setCity] = useState("Kigali");
  const [country, setCountry] = useState("Rwanda");
  const [serviceId, setServiceId] = useState<string>("");
  const [services, setServices] = useState<SvcOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<NewClient | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("services").select("id,name_en,category").eq("is_active", true).order("name_en");
      setServices((data ?? []) as SvcOpt[]);
    })();
  }, []);

  const submit = async () => {
    if (!fullName.trim() || !phone.trim()) { toast.error("Name and phone are required"); return; }
    if (!/^\+250\d{9}$/.test(phone.replace(/\s/g, ""))) { toast.error("Phone must be in Rwanda format (+250...)"); return; }
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      let finalEmail = email.trim();
      if (!finalEmail) {
        const parts = fullName.toLowerCase().split(/\s+/);
        const f = parts[0] ?? "client";
        const l = parts[1] ?? "user";
        const r4 = Math.floor(1000 + Math.random() * 9000);
        finalEmail = `${f}.${l}+walkin${r4}@sanbrothers.rw`;
      }
      const { error } = await supabase.from("users").insert({
        id, email: finalEmail, full_name: fullName.trim(),
        phone: phone.replace(/\s/g, ""), tin_number: tin || null,
        city, country, role: "client", status: "active",
        signup_source: "staff_manual", preferred_language: "en", theme_preference: "system",
        two_factor_enabled: false, is_walk_in: true, walk_in_pin: pin,
        created_by_staff_id: user?.id ?? null,
      });
      if (error) throw error;
      if (serviceId) {
        const svc = services.find((s) => s.id === serviceId);
        if (svc) {
          await supabase.from("service_requests").insert({
            client_id: id, service_id: serviceId, service_category: svc.category,
            status: "submitted", applicant_type: "individual", priority: "normal",
          });
        }
      }
      setSuccess({ id, full_name: fullName.trim(), pin });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader><CardTitle>Client registered successfully!</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-lg font-medium">{success.full_name}</p>
            <div className="rounded-lg border-2 border-dashed border-primary bg-primary/5 p-6">
              <p className="text-sm text-muted-foreground">PIN</p>
              <p className="text-4xl font-bold tracking-widest text-primary">{success.pin}</p>
            </div>
            <p className="text-sm text-muted-foreground">Give this PIN to the client. They can use it to check their case status at the office.</p>
            <div className="flex flex-wrap justify-center gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print this page</Button>
              <Button variant="outline" onClick={() => { setSuccess(null); setFullName(""); setPhone("+250"); setEmail(""); setTin(""); setServiceId(""); }}>Register another</Button>
              <Button asChild><Link to="/staff/clients/$id" params={{ id: success.id }}>View profile</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Register Walk-in Client</h1>
      <Card><CardContent className="space-y-4 pt-6">
        <div className="space-y-1"><Label>Full name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="space-y-1"><Label>Phone (Rwanda format) *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250..." /></div>
        <div className="space-y-1"><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Auto-generated if blank" /></div>
        <div className="space-y-1"><Label>TIN number (optional)</Label><Input value={tin} onChange={(e) => setTin(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="space-y-1"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
        </div>
        <div className="space-y-1">
          <Label>Initial service to request (optional)</Label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger><SelectValue placeholder="No service" /></SelectTrigger>
            <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_en}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Registering…" : "Register client"}</Button>
      </CardContent></Card>
    </div>
  );
}
