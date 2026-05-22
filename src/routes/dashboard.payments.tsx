import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/payments")({
  component: PaymentsPage,
});

interface Row {
  id: string;
  status: string;
  created_at: string;
  services: {
    name_en: string;
    name_zh: string | null;
    name_rw: string | null;
    price_min_rwf: number | null;
    price_max_rwf: number | null;
  } | null;
}
function PaymentsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("service_requests")
        .select(
          "id,status,created_at,services(name_en,name_zh,name_rw,price_min_rwf,price_max_rwf)",
        )
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, [user]);

  const localName = (r: Row) => {
    const s = r.services;
    return !s ? "" : (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.payments.title")}</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CreditCard className="h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground max-w-md">
            {t("dashboard.payments.comingSoon")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.payments.history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <Skeleton className="h-20" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.payments.noHistory")}</p>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <div className="font-medium">{localName(r)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {r.services?.price_min_rwf != null && (
                      <div>{r.services.price_min_rwf.toLocaleString()} RWF</div>
                    )}
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
