import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/lib/dashboard/status-badge";

export const Route = createFileRoute("/staff/claims/")({ component: Page });

interface Claim {
  id: string;
  status: string;
  reason_category: string;
  description: string;
  created_at: string;
  client: { full_name: string | null; email: string } | null;
  service_request: { id: string; service: { name_en: string } | null } | null;
}

const LABELS: Record<string, string> = {
  service_not_delivered: "Service not delivered",
  service_incorrect: "Service incorrect",
  long_delay: "Long delay",
  quality_issue: "Quality issue",
  refund_request: "Refund request",
  other: "Other",
};

function Page() {
  const { hasCapability, isLoading } = useCapabilities();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !hasCapability("handle_claims")) navigate({ to: "/staff" });
  }, [isLoading, hasCapability, navigate]);

  const [tab, setTab] = useState<"open" | "under_review" | "resolved">("open");
  const [rows, setRows] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("claims")
        .select(
          "id,status,reason_category,description,created_at,client:users!claims_client_id_fkey(full_name,email),service_request:service_requests(id,service:services(name_en))",
        )
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setRows((data ?? []) as unknown as Claim[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Claims</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="under_review">Under Review</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No claims here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {c.client?.full_name ?? "—"}{" "}
                    {c.service_request?.service && (
                      <span className="text-muted-foreground">
                        — {c.service_request.service.name_en}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {LABELS[c.reason_category] ?? c.reason_category}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{c.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link to="/staff/claims/$id" params={{ id: c.id }}>
                    Review →
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
