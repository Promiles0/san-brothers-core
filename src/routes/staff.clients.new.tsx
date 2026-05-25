import { useRef, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { createNotificationForAdmins } from "@/lib/notifications";

interface SvcOpt {
  id: string;
  name_en: string;
  category: string;
}

interface NewClient {
  id: string;
  full_name: string;
  pin: string;
}

export const Route = createFileRoute("/staff/clients/new")({
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const { hasCapability, isLoading: capLoading } = useCapabilities();
  const navigate = useNavigate();
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!capLoading && !hasCapability("register_clients_manually")) {
      navigate({ to: "/staff", search: {} as never });
    }
  }, [capLoading, hasCapability, navigate]);

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
      const { data } = await supabase
        .from("services")
        .select("id,name_en,category")
        .eq("is_active", true)
        .order("name_en");
      setServices((data ?? []) as SvcOpt[]);
    })();
  }, []);

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);

    if (!fullName.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      setBusy(false);
      submittingRef.current = false;
      return;
    }

    if (!/^\+250\d{8,9}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Phone must be in Rwanda format (+250xxxxxxxxx)");
      setBusy(false);
      submittingRef.current = false;
      return;
    }

    try {
      const normalizedPhone = phone.replace(/\s/g, "");

      // Pre-flight: check for an existing client before hitting the RPC
      // to give a friendly error instead of a 409 conflict.
      let preExisting: { id: string; full_name: string } | null = null;

      const { data: byPhone } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("phone", normalizedPhone)
        .maybeSingle();
      preExisting = byPhone;

      if (!preExisting && email.trim()) {
        const { data: byEmail } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("email", email.trim())
          .maybeSingle();
        preExisting = byEmail;
      }

      if (preExisting) {
        toast.error(`${preExisting.full_name} is already registered.`, {
          action: {
            label: "View profile",
            onClick: () =>
              navigate({
                to: "/staff/clients/$id",
                params: { id: preExisting!.id },
                search: {} as never,
              }),
          },
        });
        return;
      }

      console.log("Submitting:", { fullName, phone: normalizedPhone, city, country });

      const { data: result, error } = await supabase.rpc("register_walk_in_client", {
        p_full_name: fullName.trim(),
        p_phone: normalizedPhone,
        p_email: email.trim() || null,
        p_tin: tin.trim() || null,
        p_city: city.trim() || null,
        p_country: country.trim() || null,
        p_created_by: user?.id ?? null,
      });

      if (error) {
        // 23505 = PostgreSQL unique_violation (what Supabase puts in error.code).
        // "409" is the HTTP status, which the SDK does NOT expose in error.code.
        const isConflict =
          error.code === "23505" ||
          error.code === "409" ||
          error.message?.toLowerCase().includes("already") ||
          error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique");

        if (isConflict) {
          let conflictClient: { id: string; full_name: string } | null = null;

          const { data: byPhoneConflict } = await supabase
            .from("users")
            .select("id, full_name")
            .eq("phone", normalizedPhone)
            .maybeSingle();
          conflictClient = byPhoneConflict;

          if (!conflictClient && email.trim()) {
            const { data: byEmailConflict } = await supabase
              .from("users")
              .select("id, full_name")
              .eq("email", email.trim())
              .maybeSingle();
            conflictClient = byEmailConflict;
          }

          if (conflictClient) {
            toast.error(`${conflictClient.full_name} is already registered.`, {
              action: {
                label: "View profile",
                onClick: () =>
                  navigate({
                    to: "/staff/clients/$id",
                    params: { id: conflictClient!.id },
                    search: {} as never,
                  }),
              },
            });
          } else {
            toast.error(
              "A client with this phone or email is already registered. Check the clients list.",
            );
          }
        } else {
          toast.error(error.message);
        }
        return;
      }

      // If a service was selected, create a service request
      if (serviceId && result?.id) {
        const svc = services.find((s) => s.id === serviceId);
        if (svc) {
          await supabase.from("service_requests").insert({
            client_id: result.id,
            service_id: serviceId,
            service_category: svc.category,
            status: "submitted",
            applicant_type: "individual",
            priority: "normal",
          });
        }
      }

      setSuccess({
        id: result.id,
        full_name: result.full_name,
        pin: result.pin,
      });
      void logAudit({
        action: "client_registered",
        target_type: "user",
        target_id: result.id,
        metadata: { full_name: result.full_name },
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Client registered successfully!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-lg font-medium">{success.full_name}</p>
            <div className="rounded-lg border-2 border-dashed border-primary bg-primary/5 p-6">
              <p className="text-sm text-muted-foreground">PIN</p>
              <p className="text-4xl font-bold tracking-widest text-primary">{success.pin}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Give this PIN to the client. They can use it to check their case status at the office.
            </p>
            <div className="flex flex-wrap justify-center gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print this page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(null);
                  setFullName("");
                  setPhone("+250");
                  setEmail("");
                  setTin("");
                  setServiceId("");
                  submittingRef.current = false;
                }}
              >
                Register another
              </Button>
              <Button asChild>
                <Link to="/staff/clients/$id" params={{ id: success.id }} search={{} as never}>
                  View profile
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Register Walk-in Client</h1>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <Label>Full name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Phone (Rwanda format) *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250xxxxxxxxx"
            />
          </div>
          <div className="space-y-1">
            <Label>Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Auto-generated if blank"
            />
          </div>
          <div className="space-y-1">
            <Label>TIN number (optional)</Label>
            <Input value={tin} onChange={(e) => setTin(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Initial service to request (optional)</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="No service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              submit();
            }}
            disabled={busy}
            className="w-full"
          >
            {busy ? "Registering…" : "Register client"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
