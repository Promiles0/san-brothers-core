import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  slug: string;
  name_en: string;
  name_zh: string | null;
  name_rw: string | null;
  description_en: string | null;
  category: string;
  price_min_rwf: number | null;
  price_max_rwf: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
}

const CATEGORIES = ["visa", "accounting", "translation", "consultancy"];

function emptyForm(): Partial<ServiceRow> {
  return {
    slug: "",
    name_en: "",
    name_zh: "",
    name_rw: "",
    description_en: "",
    category: "visa",
    price_min_rwf: 0,
    price_max_rwf: 0,
    is_active: true,
  };
}

function AdminServices() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceRow> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select(
        "id,slug,name_en,name_zh,name_rw,description_en,category,price_min_rwf,price_max_rwf,estimated_days_min,estimated_days_max,is_active",
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
    const { error } = await supabase.from("services").update({ is_active: next }).eq("id", svc.id);
    if (error) {
      toast.error(error.message);
      setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: !next } : s)));
    } else {
      toast.success(`${svc.name_en} ${next ? "activated" : "deactivated"}`);
      void logAudit({
        action: next ? "service_activated" : "service_deactivated",
        target_type: "service",
        target_id: svc.id,
        metadata: { service: svc.name_en },
      });
    }
  };

  const updatePrice = async (
    svc: ServiceRow,
    field: "price_min_rwf" | "price_max_rwf",
    val: number,
  ) => {
    setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, [field]: val } : s)));
    const { error } = await supabase
      .from("services")
      .update({ [field]: val })
      .eq("id", svc.id);
    if (error) toast.error(error.message);
    else
      void logAudit({
        action: "service_price_updated",
        target_type: "service",
        target_id: svc.id,
        metadata: { service: svc.name_en, field, value: val },
      });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name_en?.trim() || !editing.category) {
      toast.error("Name and category required");
      return;
    }
    setSaving(true);
    const payload = {
      slug: editing.slug || editing.name_en.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name_en: editing.name_en,
      name_zh: editing.name_zh || null,
      name_rw: editing.name_rw || null,
      description_en: editing.description_en || null,
      category: editing.category,
      price_min_rwf: editing.price_min_rwf ?? 0,
      price_max_rwf: editing.price_max_rwf ?? 0,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Service updated" : "Service created");
    void logAudit({
      action: editing.id ? "service_updated" : "service_created",
      target_type: "service",
      target_id: editing.id,
      metadata: { name: payload.name_en, category: payload.category },
    });
    setEditing(null);
    fetchServices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-sm text-muted-foreground">Manage the service catalog and pricing.</p>
        </div>
        <Button onClick={() => setEditing(emptyForm())}>
          <Plus className="mr-1.5 h-4 w-4" /> Add service
        </Button>
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
            <p className="text-sm text-muted-foreground">
              No services yet. Click Add service to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => {
                  const isLiveCalls =
                    s.slug?.includes("live") ||
                    s.slug?.includes("interpreter") ||
                    s.name_en?.toLowerCase().includes("live call") ||
                    s.name_en?.toLowerCase().includes("interpreter");
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name_en}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {s.category}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isLiveCalls
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isLiveCalls ? "Live Calls" : "Standard"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label>Name (English)</Label>
                <Input
                  value={editing.name_en ?? ""}
                  onChange={(e) => setEditing({ ...editing, name_en: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name (Chinese)</Label>
                  <Input
                    value={editing.name_zh ?? ""}
                    onChange={(e) => setEditing({ ...editing, name_zh: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Name (Kinyarwanda)</Label>
                  <Input
                    value={editing.name_rw ?? ""}
                    onChange={(e) => setEditing({ ...editing, name_rw: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editing.category ?? "visa"}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={editing.slug ?? ""}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    placeholder="auto from name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min price (RWF)</Label>
                  <Input
                    type="number"
                    value={editing.price_min_rwf ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, price_min_rwf: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Max price (RWF)</Label>
                  <Input
                    type="number"
                    value={editing.price_max_rwf ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, price_max_rwf: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description_en ?? ""}
                  onChange={(e) => setEditing({ ...editing, description_en: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
