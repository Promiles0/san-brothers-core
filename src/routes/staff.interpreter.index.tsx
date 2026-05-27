import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Headphones, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/staff/interpreter/")({
  component: LiveCallsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveCall {
  id: string;
  language_from: string;
  language_to: string;
  status: "ringing" | "active" | "on_hold";
  client: { full_name: string | null } | null;
}

// ── Status badge colours ───────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  ActiveCall["status"],
  { label: string; className: string }
> = {
  ringing: {
    label: "Ringing",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  active: {
    label: "Active",
    className: "bg-green-500/15 text-green-700 dark:text-green-300",
  },
  on_hold: {
    label: "On Hold",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

function LiveCallsPage() {
  const { profile } = useAuth();
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("interpreter_calls")
        .select(
          "id,language_from,language_to,status,client:users!client_id(full_name)",
        )
        .eq("interpreter_id", profile.id)
        .in("status", ["ringing", "active", "on_hold"])
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (!error) setCalls((data ?? []) as unknown as ActiveCall[]);
      setLoading(false);
    })();

    // Live updates for this interpreter's calls
    const channel = supabase
      .channel("staff-live-calls:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interpreter_calls",
          filter: `interpreter_id=eq.${profile.id}`,
        },
        () => {
          // Re-fetch on any change
          void supabase
            .from("interpreter_calls")
            .select(
              "id,language_from,language_to,status,client:users!client_id(full_name)",
            )
            .eq("interpreter_id", profile.id)
            .in("status", ["ringing", "active", "on_hold"])
            .order("created_at", { ascending: false })
            .then(({ data }) => {
              if (!cancelled) setCalls((data ?? []) as unknown as ActiveCall[]);
            });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Calls</h1>
          <p className="text-sm text-muted-foreground">
            Your active and ringing interpreter calls
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Phone className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No active calls right now.</p>
            <p className="text-xs text-muted-foreground">
              Incoming calls will appear as an overlay notification.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {calls.map((call) => {
            const meta = STATUS_VARIANT[call.status];
            const clientName =
              (Array.isArray(call.client) ? call.client[0] : call.client)
                ?.full_name ?? "Client";
            return (
              <Card key={call.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold">
                      {clientName}
                    </CardTitle>
                    <Badge className={meta.className}>{meta.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {call.language_from} → {call.language_to}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button asChild size="sm" className="w-full gap-1.5">
                    <Link
                      to="/staff/interpreter/$callId"
                      params={{ callId: call.id }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Join Call
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
