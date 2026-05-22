import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import type { Claim } from "@/lib/types/database";

export const Route = createFileRoute("/dashboard/claims/$id")({
  component: ClaimDetailPage,
});

function ClaimDetailPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const [claim, setClaim] = useState<Claim | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("claims").select("*").eq("id", id).maybeSingle();
      setClaim((data as Claim | null) ?? null);
    })();
  }, [id]);

  if (claim === undefined) return <Skeleton className="h-60 max-w-2xl" />;
  if (!claim)
    return <p className="text-sm text-muted-foreground">{t("dashboard.claims.notFound")}</p>;
  return (
    <div className="space-y-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard/claims">
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("dashboard.common.back")}
        </Link>
      </Button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t(`dashboard.claims.reason.${claim.reason_category}`)}
        </h1>
        <StatusBadge status={claim.status} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.claims.description")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{claim.description}</p>
        </CardContent>
      </Card>
      {claim.resolution_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.claims.resolution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{claim.resolution_notes}</p>
            {claim.refund_amount_rwf != null && (
              <p className="mt-2 text-sm font-semibold">
                {t("dashboard.claims.refund")}: {claim.refund_amount_rwf.toLocaleString()} RWF
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        {t("dashboard.common.created")}: {new Date(claim.created_at).toLocaleString()}
      </p>
    </div>
  );
}
