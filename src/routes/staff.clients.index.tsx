import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/staff/clients/")({ component: Page });

interface Client {
  id: string; full_name: string | null; email: string; phone: string | null;
  tin_number: string | null; is_walk_in: boolean | null; created_by_staff_id: string | null; created_at: string;
}

function Page() {
  const { hasCapability, isLoading: capLoading } = useCapabilities();
  const navigate = useNavigate();
  useEffect(() => { if (!capLoading && !hasCapability("register_clients_manually")) navigate({ to: "/staff" }); }, [capLoading, hasCapability, navigate]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "walkin" | "online">("all");
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("users").select("id,full_name,email,phone,tin_number,is_walk_in,created_by_staff_id,created_at")
        .eq("role", "client").order("created_at", { ascending: false }).limit(200);
      if (filter === "walkin") q = q.eq("is_walk_in", true);
      if (filter === "online") q = q.or("is_walk_in.is.null,is_walk_in.eq.false");
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s},tin_number.ilike.${s}`);
      }
      const { data } = await q;
      if (!cancelled) { setRows((data ?? []) as Client[]); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [search, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button asChild><Link to="/staff/clients/new">+ Register New Client</Link></Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="walkin">Walk-in</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input className="max-w-sm" placeholder="Search name, email, phone, TIN…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : rows.length === 0 ? <p className="py-12 text-center text-muted-foreground">No clients found.</p> : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>TIN</TableHead><TableHead>Type</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                    <TableCell className={c.email.includes("+walkin") ? "italic text-muted-foreground" : ""}>{c.email}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.tin_number ?? "—"}</TableCell>
                    <TableCell>
                      {c.is_walk_in
                        ? <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" variant="outline">Walk-in</Badge>
                        : <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" variant="outline">Online</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><Link to="/staff/clients/$id" params={{ id: c.id }} className="text-primary hover:underline text-sm">View →</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
