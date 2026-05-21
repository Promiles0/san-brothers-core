import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities, type Capability } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/")({
  component: StaffHome,
});

type CategoryKey = "visa" | "accounting" | "consultancy" | "translation";
const CAP_TO_CAT: Record<string, CategoryKey> = {
  handle_visa: "visa", handle_accounting: "accounting",
  handle_consultancy: "consultancy", handle_translation: "translation",
};

interface Row {
  id: string; status: string; created_at: string; updated_at: string;
  assigned_staff_id: string | null; service_category: string;
  client: { full_name: string | null } | null;
  service: { name_en: string } | null;
  basePath: string;
}

function basePathFor(cat: string) {
  return `/staff/${cat}`;
}

function StaffHome() {
  const { user, profile } = useAuth();
  const { capabilities } = useCapabilities();
  const [today, setToday] = useState<Row[]>([]);
  const [pending, setPending] = useState<Row[]>([]);
  const [weekRows, setWeekRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const myCats = useMemo(() => capabilities.filter((c) => CAP_TO_CAT[c]).map((c) => CAP_TO_CAT[c]), [capabilities]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const startOfWeek = (() => {
          const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d;
        })();
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 7);

        const sel = "id,status,created_at,updated_at,assigned_staff_id,service_category,client:users!service_requests_client_id_fkey(full_name),service:services(name_en)";

        // Today's queue: assigned to me OR (unassigned in my categories) — and updated/created today
        const orParts: string[] = [`assigned_staff_id.eq.${user.id}`];
        if (myCats.length > 0) {
          orParts.push(`and(assigned_staff_id.is.null,service_category.in.(${myCats.join(",")}))`);
        }
        const todayQ = await supabase.from("service_requests").select(sel)
          .not("status", "in", "(completed,rejected,cancelled)")
          .or(orParts.join(","))
          .or(`created_at.gte.${todayStr},updated_at.gte.${todayStr}`)
          .order("updated_at", { ascending: false }).limit(10);

        const pendingQ = await supabase.from("service_requests").select(sel)
          .eq("assigned_staff_id", user.id)
          .in("status", ["awaiting_client", "under_review"])
          .order("updated_at", { ascending: false }).limit(20);

        const weekQ = await supabase.from("service_requests").select(sel)
          .eq("assigned_staff_id", user.id)
          .gte("updated_at", startOfWeek.toISOString())
          .lt("updated_at", endOfWeek.toISOString());

        if (cancelled) return;
        const mapRow = (r: Record<string, unknown>): Row => ({ ...(r as unknown as Row), basePath: basePathFor(r.service_category as string) });
        setToday(((todayQ.data ?? []) as Record<string, unknown>[]).map(mapRow));
        setPending(((pendingQ.data ?? []) as Record<string, unknown>[]).map(mapRow));
        setWeekRows(((weekQ.data ?? []) as Record<string, unknown>[]).map(mapRow));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, myCats]);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning"; if (h < 18) return "Good afternoon"; return "Good evening";
  })();

  const week = (() => {
    const d = new Date(); const day = (d.getDay() + 6) % 7;
    const monday = new Date(d); monday.setDate(monday.getDate() - day); monday.setHours(0,0,0,0);
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(monday); x.setDate(x.getDate() + i); return x; });
  })();

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <Card><CardContent className="pt-6">
          <h1 className="text-2xl font-bold">{greet}, {profile?.full_name?.split(" ")[0] ?? "there"}!</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{profile?.role}</Badge>
            <Badge variant="secondary">{capabilities.length} active capabilities</Badge>
          </div>
        </CardContent></Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Today's queue</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32 w-full" /> : today.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in your queue today.</p>
            ) : (
              <ul className="divide-y">
                {today.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.client?.full_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.service?.name_en}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <Link to={`${r.basePath}/${r.id}`} className="text-primary hover:underline text-xs">Open →</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pending actions</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-24 w-full" /> : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((r) => (
                  <li key={r.id} className={cn("flex items-center justify-between gap-2 rounded-md border-l-4 bg-muted/30 p-2 text-sm",
                    r.status === "awaiting_client" ? "border-orange-500" : "border-yellow-500")}>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.client?.full_name ?? "—"} — {r.service?.name_en}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <Link to={`${r.basePath}/${r.id}`} className="text-primary hover:underline text-xs">Open →</Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">This week</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {week.map((d) => {
                const key = d.toISOString().slice(0, 10);
                const dayRows = weekRows.filter((r) => (r.updated_at ?? "").slice(0, 10) === key);
                const isToday = key === todayKey;
                return (
                  <div key={key} className={cn("min-h-32 rounded border p-1 text-xs", isToday && "border-primary bg-primary/5")}>
                    <div className="mb-1 font-medium">{d.toLocaleDateString(undefined, { weekday: "short" })}<br /><span className="text-muted-foreground">{d.getDate()}</span></div>
                    <ul className="space-y-1">
                      {dayRows.slice(0, 4).map((r) => (
                        <li key={r.id}>
                          <Link to={`${r.basePath}/${r.id}`} className="block truncate rounded bg-muted px-1 py-0.5 hover:bg-muted-foreground/10">
                            {r.client?.full_name ?? "—"}
                          </Link>
                        </li>
                      ))}
                      {dayRows.length > 4 && <li className="text-muted-foreground">+{dayRows.length - 4}</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Total cases handled today: {weekRows.filter((r) => (r.updated_at ?? "").slice(0, 10) === todayKey).length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
