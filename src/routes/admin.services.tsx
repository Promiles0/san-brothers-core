import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/services")({ component: AdminServices });

interface ServiceRow {
  id: string;
  name_en: string;
  category: string;
  price_min_rwf: number | null;
  price_max_rwf: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
}

function AdminServices() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select(
        "id,name_en,category,price_min_rwf,price_max_rwf,estimated_days_min,estimated_days_max,is_active",
      )
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setServices((data as ServiceRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const toggleActive = async (svc: ServiceRow) => {
    const next = !svc.is_active;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: next } : s)));
    const { error } = await supabase
      .from("services")
      .update({ is_active: next })
      .eq("id", svc.id);
    if (error) {
      toast.error(error.message);
      setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: !next } : s)));
    } else {
      toast.success(`${svc.name_en} ${next ? "activated" : "deactivated"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-sm text-muted-foreground">
          Manage the service catalog and pricing. Toggle active status to show/hide services to clients.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${services.length} services`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price min (RWF)</TableHead>
                  <TableHead>Price max (RWF)</TableHead>
                  <TableHead>Days min</TableHead>
                  <TableHead>Days max</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name_en}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {s.category}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {s.price_min_rwf?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {s.price_max_rwf?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell>{s.estimated_days_min ?? "—"}</TableCell>
                    <TableCell>{s.estimated_days_max ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={() => toggleActive(s)}
                      />
                    </TableCell>
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
