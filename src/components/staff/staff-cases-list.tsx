import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { toast } from "sonner";
import type { ServiceCategory } from "@/lib/types/database";

interface CaseRow {
  id: string;
  status: string;
  progress_step: number;
  progress_total: number;
  assigned_staff_id: string | null;
  priority: string;
  created_at: string;
  client: { id: string; full_name: string | null; email: string; phone: string | null; tin_number: string | null } | null;
  service: { id: string; name_en: string } | null;
}

type Filter = "all" | "unassigned" | "mine" | "awaiting" | "completed";

export function StaffCasesList({ category, basePath, title }: { category: ServiceCategory; basePath: string; title: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase.from("service_requests")
        .select("id,status,progress_step,progress_total,assigned_staff_id,priority,created_at,client:users!service_requests_client_id_fkey(id,full_name,email,phone,tin_number),service:services(id,name_en)")
        .eq("service_category", category)
        .order("created_at", { ascending: false });

      if (filter === "unassigned") q = q.is("assigned_staff_id", null);
      else if (filter === "mine" && user) q = q.eq("assigned_staff_id", user.id);
      else if (filter === "awaiting") q = q.eq("status", "awaiting_client");
      else if (filter === "completed") q = q.eq("status", "completed");

      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as unknown as CaseRow[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [category, filter, user?.id]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.client?.full_name?.toLowerCase().includes(s) ||
      r.client?.email?.toLowerCase().includes(s) ||
      r.client?.phone?.toLowerCase().includes(s) ||
      r.client?.tin_number?.toLowerCase().includes(s)
    );
  });

  const assignAll = async () => {
    if (!user) return;
    const unassigned = filtered.filter((r) => !r.assigned_staff_id);
    if (unassigned.length === 0) { toast.info("Nothing to assign"); return; }
    const { error } = await supabase.from("service_requests")
      .update({ assigned_staff_id: user.id }).in("id", unassigned.map((r) => r.id));
    if (error) toast.error(error.message);
    else { toast.success(`Assigned ${unassigned.length} cases to you`); void load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <Button onClick={assignAll} size="sm" variant="outline">+ Assign unassigned to me</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            <TabsTrigger value="mine">My Cases</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting Client</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input className="max-w-xs" placeholder="Search name, email, phone, TIN…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No cases found.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{r.client?.full_name ?? "—"}</p>
                    <span className="text-xs text-muted-foreground">{r.client?.email}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.service?.name_en}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                    {!r.assigned_staff_id && <Badge variant="secondary">Unassigned</Badge>}
                  </div>
                  {r.progress_total > 0 && (
                    <div className="mt-2 max-w-xs">
                      <Progress value={(r.progress_step / r.progress_total) * 100} className="h-1.5" />
                      <p className="mt-1 text-xs text-muted-foreground">Step {r.progress_step}/{r.progress_total}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  <Button asChild size="sm"><Link to={`${basePath}/${r.id}`}>Open case →</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
