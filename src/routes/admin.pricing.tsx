import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Edit3,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getInterpreterPricing, updateInterpreterPricing } from "@/lib/pricing/interpreter-rates";
import {
  getAllMinutePackages,
  createMinutePackage,
  updateMinutePackage,
  deleteMinutePackage,
  type MinutePackage,
} from "@/lib/pricing/minute-packages";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/admin/pricing")({
  component: AdminPricing,
});

interface PackageForm {
  name: string;
  minutes: number;
  price_usd: number;
  is_popular: boolean;
  is_free_trial: boolean;
  free_minutes: number;
  active: boolean;
}

const emptyForm: PackageForm = {
  name: "",
  minutes: 45,
  price_usd: 13.0,
  is_popular: false,
  is_free_trial: false,
  free_minutes: 0,
  active: true,
};

const RWF_PER_USD = 1285;

type ServiceCategory = "visa" | "accounting" | "consultancy" | "translation";
type PriceUnit = "flat" | "per_page" | "per_minute" | "per_month";

const CATEGORY_BADGES: Record<ServiceCategory, string> = {
  visa: "bg-blue-500/10 text-blue-500",
  accounting: "bg-emerald-500/10 text-emerald-500",
  consultancy: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  translation: "bg-purple-500/10 text-purple-500",
};

const CATEGORY_ORDER: ServiceCategory[] = ["visa", "accounting", "consultancy", "translation"];

const UNIT_LABEL: Record<PriceUnit, string> = {
  flat: "Fixed Price",
  per_page: "Per Page",
  per_minute: "Per Minute",
  per_month: "Per Month",
};

const UNIT_OPTIONS: PriceUnit[] = ["flat", "per_page", "per_minute", "per_month"];

interface ServicePriceRow {
  id: string;
  price_usd: number;
  unit: PriceUnit;
  display_note: string | null;
  services: {
    id: string;
    slug: string;
    name_en: string;
    category: ServiceCategory;
    sort_order: number;
    is_active: boolean;
  } | null;
}

function formatServicePrice(price: number, unit: PriceUnit, note: string | null): string {
  if (note === "Custom quote" && price === 0) return "Custom quote";
  const base = `$${price.toFixed(2)}`;
  const suffix =
    unit === "per_page"
      ? " / page"
      : unit === "per_minute"
        ? " / min"
        : unit === "per_month"
          ? " / mo"
          : "";
  return `${base}${suffix}`;
}

function AdminPricing() {
  const { profile } = useAuth();
  const [clientRate, setClientRate] = useState("1.00");
  const [staffRate, setStaffRate] = useState("0.60");
  const [savingRates, setSavingRates] = useState(false);
  const [loadingRates, setLoadingRates] = useState(true);

  const [packages, setPackages] = useState<MinutePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packageDialog, setPackageDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MinutePackage | null>(null);
  const [packageForm, setPackageForm] = useState<PackageForm>(emptyForm);
  const [savingPackage, setSavingPackage] = useState(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [servicePrices, setServicePrices] = useState<ServicePriceRow[]>([]);
  const [loadingServicePrices, setLoadingServicePrices] = useState(true);
  const [editingServicePrice, setEditingServicePrice] = useState<ServicePriceRow | null>(null);
  const [spDraftPrice, setSpDraftPrice] = useState("");
  const [spDraftUnit, setSpDraftUnit] = useState<PriceUnit>("flat");
  const [spDraftNote, setSpDraftNote] = useState("");
  const [savingServicePrice, setSavingServicePrice] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const pricing = await getInterpreterPricing();
        setClientRate(pricing.client_rate_usd.toFixed(2));
        setStaffRate(pricing.staff_rate_usd.toFixed(2));
      } catch {
        toast.error("Failed to load interpreter rates");
      } finally {
        setLoadingRates(false);
      }
      try {
        const pkgs = await getAllMinutePackages();
        setPackages(pkgs);
      } catch {
        toast.error("Failed to load minute packages");
      } finally {
        setLoadingPackages(false);
      }
      const { data: latestRateAudit } = await supabase
        .from("audit_log")
        .select("created_at")
        .eq("action", "pricing_updated")
        .order("created_at", { ascending: false })
        .limit(1);
      setRateUpdatedAt(
        (latestRateAudit?.[0] as { created_at: string } | undefined)?.created_at ?? null,
      );
      try {
        const { data, error } = await supabase
          .from("service_prices")
          .select(
            "id, price_usd, unit, display_note, services(id, slug, name_en, category, sort_order, is_active)",
          )
          .order("sort_order", { foreignTable: "services", ascending: true });
        if (error) throw error;
        setServicePrices((data ?? []) as unknown as ServicePriceRow[]);
      } catch {
        toast.error("Failed to load service prices");
      } finally {
        setLoadingServicePrices(false);
      }
    })();
  }, []);

  const openEditServicePrice = (row: ServicePriceRow) => {
    setEditingServicePrice(row);
    setSpDraftPrice(String(row.price_usd));
    setSpDraftUnit(row.unit);
    setSpDraftNote(row.display_note ?? "");
  };

  const handleSaveServicePrice = async () => {
    if (!editingServicePrice) return;
    setSavingServicePrice(true);
    try {
      const newPrice = parseFloat(spDraftPrice);
      if (isNaN(newPrice) || newPrice < 0) {
        toast.error("Price must be a positive number");
        return;
      }
      const noteTrim = spDraftNote.trim();
      const { error } = await supabase
        .from("service_prices")
        .update({
          price_usd: newPrice,
          unit: spDraftUnit,
          display_note: noteTrim || null,
          updated_by: profile?.id ?? null,
        })
        .eq("id", editingServicePrice.id);
      if (error) throw error;
      const oldPrice = editingServicePrice.price_usd;
      const serviceName = editingServicePrice.services?.name_en ?? "Unknown";
      setServicePrices((prev) =>
        prev.map((p) =>
          p.id === editingServicePrice.id
            ? { ...p, price_usd: newPrice, unit: spDraftUnit, display_note: noteTrim || null }
            : p,
        ),
      );
      toast.success("Price updated");
      void logAudit({
        action: "service_price_updated",
        target_type: "service_price",
        target_id: editingServicePrice.id,
        metadata: {
          service_name: serviceName,
          old_price: oldPrice,
          new_price: newPrice,
          unit: spDraftUnit,
        },
      });
      setEditingServicePrice(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingServicePrice(false);
    }
  };

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      const client = parseFloat(clientRate);
      const staff = parseFloat(staffRate);
      if (isNaN(client) || isNaN(staff) || client <= 0 || staff <= 0) {
        toast.error("Rates must be positive numbers");
        return;
      }
      if (staff > client) {
        toast.error("Staff rate cannot exceed client rate");
        return;
      }
      await updateInterpreterPricing(client, staff, profile?.id ?? "");
      toast.success("Interpreter rates updated");
      void logAudit({
        action: "pricing_updated",
        target_type: "interpreter_pricing",
        metadata: { client_rate: client, staff_rate: staff, commission: client - staff },
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingRates(false);
    }
  };

  const refreshPackages = async () => {
    const pkgs = await getAllMinutePackages();
    setPackages(pkgs);
  };

  const handleSavePackage = async () => {
    setSavingPackage(true);
    try {
      const payload = {
        name: packageForm.name.trim(),
        minutes: Number(packageForm.minutes) || 0,
        price_usd: Number(packageForm.price_usd) || 0,
        is_popular: packageForm.is_popular,
        is_free_trial: packageForm.is_free_trial,
        free_minutes: Number(packageForm.free_minutes) || 0,
        active: packageForm.active,
        display_order: editingPackage?.display_order ?? packages.length + 1,
      };
      if (!payload.name) {
        toast.error("Name is required");
        return;
      }
      if (editingPackage) {
        await updateMinutePackage(editingPackage.id, payload);
        toast.success("Package updated");
        void logAudit({
          action: "minute_package_updated",
          target_type: "minute_package",
          target_id: editingPackage.id,
          metadata: payload,
        });
      } else {
        const created = await createMinutePackage(payload);
        toast.success("Package created");
        void logAudit({
          action: "minute_package_created",
          target_type: "minute_package",
          target_id: created.id,
          metadata: payload,
        });
      }
      await refreshPackages();
      setPackageDialog(false);
      setEditingPackage(null);
      setPackageForm(emptyForm);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    try {
      await deleteMinutePackage(id);
      toast.success("Package deleted");
      setPackages((prev) => prev.filter((p) => p.id !== id));
      void logAudit({
        action: "minute_package_deleted",
        target_type: "minute_package",
        target_id: id,
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openNewPackageDialog = () => {
    setEditingPackage(null);
    setPackageForm(emptyForm);
    setPackageDialog(true);
  };

  const openEditPackageDialog = (pkg: MinutePackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      minutes: pkg.minutes,
      price_usd: pkg.price_usd,
      is_popular: pkg.is_popular,
      is_free_trial: pkg.is_free_trial,
      free_minutes: pkg.free_minutes,
      active: pkg.active,
    });
    setPackageDialog(true);
  };

  const duplicatePackage = (pkg: MinutePackage) => {
    setEditingPackage(null);
    setPackageForm({
      name: `Copy of ${pkg.name}`,
      minutes: pkg.minutes,
      price_usd: pkg.price_usd,
      is_popular: false,
      is_free_trial: pkg.is_free_trial,
      free_minutes: pkg.free_minutes,
      active: pkg.active,
    });
    setPackageDialog(true);
  };

  const commission = (parseFloat(clientRate) || 0) - (parseFloat(staffRate) || 0);
  const client = parseFloat(clientRate) || 0;
  const staff = parseFloat(staffRate) || 0;
  const staffPct = client > 0 ? Math.round((staff / client) * 100) : 0;
  const companyPct = Math.max(0, 100 - staffPct);
  const sortedPackages = [...packages].sort((a, b) => a.display_order - b.display_order);
  const activePackages = packages.filter((pkg) => pkg.active);
  const avgPrice =
    activePackages.length > 0
      ? activePackages.reduce((acc, pkg) => acc + pkg.price_usd, 0) / activePackages.length
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Configure interpreter call rates and minute packages.
        </p>
      </div>

      {/* Service Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Edit3 className="h-4 w-4 text-primary" />
            Service Pricing
          </CardTitle>
          <CardDescription>
            Live USD prices for all services. Edits sync to the public /pricing page automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingServicePrices ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : servicePrices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No service prices found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Current Price (USD)</TableHead>
                  <TableHead>Display Note</TableHead>
                  <TableHead>Active?</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORY_ORDER.flatMap((cat) => {
                  const rows = servicePrices
                    .filter((r) => r.services?.category === cat)
                    .sort(
                      (a, b) => (a.services?.sort_order ?? 0) - (b.services?.sort_order ?? 0),
                    );
                  if (rows.length === 0) return [];
                  return [
                    <TableRow key={`hdr-${cat}`} className="hover:bg-transparent">
                      <TableCell colSpan={7} className="py-2">
                        <Badge className={`capitalize ${CATEGORY_BADGES[cat]}`}>{cat}</Badge>
                      </TableCell>
                    </TableRow>,
                    ...rows.map((row) => {
                      const isCustomQuote =
                        row.display_note === "Custom quote" && row.price_usd === 0;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-bold">
                            {row.services?.name_en ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${CATEGORY_BADGES[cat]}`}>{cat}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{UNIT_LABEL[row.unit]}</TableCell>
                          <TableCell className="tabular-nums">
                            {isCustomQuote ? (
                              <span className="text-muted-foreground">Custom quote</span>
                            ) : (
                              `$${row.price_usd.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.display_note ?? "—"}
                          </TableCell>
                          <TableCell>
                            {row.services?.is_active ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditServicePrice(row)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }),
                  ];
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Interpreter Call Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Interpreter Call Rates
          </CardTitle>
          <CardDescription>
            Per-minute rates for live interpreter calls. Commission is the difference between client
            and staff rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingRates ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Client Rate (USD/minute)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={clientRate}
                      onChange={(e) => setClientRate(e.target.value)}
                      disabled={savingRates}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ≈ RWF {(client * RWF_PER_USD).toLocaleString("en-US")} per minute
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Staff Rate (USD/minute)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={staffRate}
                      onChange={(e) => setStaffRate(e.target.value)}
                      disabled={savingRates}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ≈ RWF {(staff * RWF_PER_USD).toLocaleString("en-US")} per minute
                  </p>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm">
                  Company commission per minute:{" "}
                  <span className="font-bold text-primary">${commission.toFixed(2)}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Staff earns the staff rate. Company keeps the difference.
                </p>
                <div className="mt-4 overflow-hidden rounded-full bg-muted">
                  <div className="flex h-3 w-full">
                    <div className="bg-blue-500" style={{ width: `${staffPct}%` }} />
                    <div className="bg-emerald-500" style={{ width: `${companyPct}%` }} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Staff: {staffPct}%</span>
                  <span>Company: {companyPct}%</span>
                  <span>
                    Last updated:{" "}
                    {rateUpdatedAt
                      ? new Date(rateUpdatedAt).toLocaleDateString()
                      : "No audit entry yet"}
                  </span>
                </div>
              </div>
              <Button onClick={handleSaveRates} disabled={savingRates}>
                {savingRates && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Rates
              </Button>
            </>
          )}
        </CardContent>
      </Card>


      {/* Minute Packages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              Minute Packages
            </CardTitle>
            <CardDescription>Packages clients can purchase to use live calls.</CardDescription>
          </div>
          <Button onClick={openNewPackageDialog} size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Add Package
          </Button>
        </CardHeader>
        <CardContent>
          {loadingPackages ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No packages yet. Click Add Package to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Minutes</TableHead>
                  <TableHead>Price (USD)</TableHead>
                  <TableHead>Price/min</TableHead>
                  <TableHead>Popular</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPackages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {pkg.name}
                        {pkg.is_free_trial && (
                          <Badge variant="secondary" className="text-[10px]">
                            Free Trial +{pkg.free_minutes}m
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{pkg.minutes}</TableCell>
                    <TableCell className="tabular-nums">${pkg.price_usd.toFixed(2)}</TableCell>
                    <TableCell className="tabular-nums">
                      ${pkg.minutes > 0 ? (pkg.price_usd / pkg.minutes).toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell>
                      {pkg.is_popular ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          ★ Popular
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={pkg.active}
                        onCheckedChange={async (v) => {
                          try {
                            await updateMinutePackage(pkg.id, { active: v });
                            setPackages((prev) =>
                              prev.map((p) => (p.id === pkg.id ? { ...p, active: v } : p)),
                            );
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditPackageDialog(pkg)}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicatePackage(pkg)}>
                          Duplicate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePackage(pkg.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    Total active packages: {activePackages.length} | Avg price: $
                    {avgPrice.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={packageDialog} onOpenChange={(o) => !o && setPackageDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit Package" : "New Package"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Package Name</Label>
              <Input
                value={packageForm.name}
                onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                placeholder="e.g., Starter, Popular, Pro"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  value={packageForm.minutes}
                  onChange={(e) =>
                    setPackageForm({ ...packageForm, minutes: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={packageForm.price_usd}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      price_usd: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Popular (★ badge)</Label>
              <Switch
                checked={packageForm.is_popular}
                onCheckedChange={(v) => setPackageForm({ ...packageForm, is_popular: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Free Trial Package</Label>
              <Switch
                checked={packageForm.is_free_trial}
                onCheckedChange={(v) => setPackageForm({ ...packageForm, is_free_trial: v })}
              />
            </div>
            {packageForm.is_free_trial && (
              <div>
                <Label>Free Minutes Included</Label>
                <Input
                  type="number"
                  min="0"
                  value={packageForm.free_minutes}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      free_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Active (visible to clients)</Label>
              <Switch
                checked={packageForm.active}
                onCheckedChange={(v) => setPackageForm({ ...packageForm, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePackage} disabled={savingPackage}>
              {savingPackage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingServicePrice}
        onOpenChange={(open) => !open && setEditingServicePrice(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Service Price</DialogTitle>
            <DialogDescription>
              Update the USD price, unit, and display note. Changes appear on the public /pricing
              page immediately.
            </DialogDescription>
          </DialogHeader>
          {editingServicePrice && (
            <div className="space-y-4">
              <div>
                <Label>Service</Label>
                <Input value={editingServicePrice.services?.name_en ?? ""} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={spDraftPrice}
                    onChange={(e) => setSpDraftPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={spDraftUnit}
                    onValueChange={(v) => setSpDraftUnit(v as PriceUnit)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {UNIT_LABEL[u]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Display Note</Label>
                <Input
                  value={spDraftNote}
                  onChange={(e) => setSpDraftNote(e.target.value)}
                  placeholder="e.g. Starting from, Custom quote"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingServicePrice(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveServicePrice} disabled={savingServicePrice}>
              {savingServicePrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
