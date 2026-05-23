// SQL — run in Supabase:
// CREATE TABLE IF NOT EXISTS public.payments (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   service_request_id uuid REFERENCES public.service_requests(id),
//   client_id uuid REFERENCES public.users(id),
//   amount_rwf integer NOT NULL,
//   currency text DEFAULT 'RWF',
//   method text CHECK (method IN ('momo','stripe','paypal','crypto','office')),
//   status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
//   reference text,
//   provider_ref text,
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now()
// );
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/payments")({
  component: PaymentsPage,
});

interface PaymentRow {
  id: string;
  amount_rwf: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  created_at: string;
  service_request: {
    service: { name_en: string; name_zh: string | null; name_rw: string | null } | null;
  } | null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
};

function PaymentsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<PaymentRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,amount_rwf,currency,method,status,reference,created_at,service_request:service_requests(service:services(name_en,name_zh,name_rw))",
        )
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        // Table may not exist yet — show empty.
        setRows([]);
        return;
      }
      setRows((data as unknown as PaymentRow[]) ?? []);
    })();
  }, [user]);

  const localName = (r: PaymentRow) => {
    const s = r.service_request?.service;
    if (!s) return "—";
    return (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.payments.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> {t("dashboard.payments.history")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <Skeleton className="h-24" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.payments.noHistory")}</p>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{localName(r)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      <span className="uppercase">{r.method}</span>
                      {r.reference && <> · {r.reference}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">
                        {r.amount_rwf.toLocaleString()} {r.currency}
                      </div>
                    </div>
                    <Badge variant={statusVariant[r.status] ?? "secondary"} className="capitalize">
                      {r.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toast.message("Receipt coming soon")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
