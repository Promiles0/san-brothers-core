import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, DollarSign, Package } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  getInterpreterPricing,
  updateInterpreterPricing,
} from "@/lib/pricing/interpreter-rates";
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
    })();
  }, []);

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

  const commission = (parseFloat(clientRate) || 0) - (parseFloat(staffRate) || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Configure interpreter call rates and minute packages.
        </p>
      </div>

      {/* Interpreter Call Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Interpreter Call Rates
          </CardTitle>
          <CardDescription>
            Per-minute rates for live interpreter calls. Commission is the difference between
            client and staff rates.
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
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm">
                  Company commission per minute:{" "}
                  <span className="font-bold text-primary">
                    ${commission.toFixed(2)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Staff earns the staff rate. Company keeps the difference.
                </p>
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
                  <TableHead>Popular</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
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
    </div>
  );
}
