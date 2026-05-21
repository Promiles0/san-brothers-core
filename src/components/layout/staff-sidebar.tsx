import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Calculator, Briefcase, Languages,
  Users, ShieldAlert, BarChart2, Settings, LogOut, type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useCapabilities, type Capability } from "@/lib/staff/capability-context";

interface Item {
  label: string;
  icon: LucideIcon;
  to?: string;
  cap?: Capability;
  badgeKey?: "unassignedVisa" | "unassignedAccounting" | "openClaims";
  action?: "logout";
  intent?: "destructive";
}

const items: Item[] = [
  { label: "Home", icon: LayoutDashboard, to: "/staff" },
  { label: "Visa Cases", icon: FileText, to: "/staff/visa", cap: "handle_visa", badgeKey: "unassignedVisa" },
  { label: "Accounting", icon: Calculator, to: "/staff/accounting", cap: "handle_accounting", badgeKey: "unassignedAccounting" },
  { label: "Consultancy", icon: Briefcase, to: "/staff/consultancy", cap: "handle_consultancy" },
  { label: "Translation", icon: Languages, to: "/staff/translation", cap: "handle_translation" },
  { label: "Clients", icon: Users, to: "/staff/clients", cap: "register_clients_manually" },
  { label: "Claims", icon: ShieldAlert, to: "/staff/claims", cap: "handle_claims", badgeKey: "openClaims" },
  { label: "Reports", icon: BarChart2, to: "/staff/reports", cap: "view_financial_reports" },
  { label: "Settings", icon: Settings, to: "/staff/settings" },
  { label: "Log out", icon: LogOut, action: "logout", intent: "destructive" },
];

function useStaffCounts() {
  const [counts, setCounts] = useState({ unassignedVisa: 0, unassignedAccounting: 0, openClaims: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [visa, acc, claims] = await Promise.all([
          supabase.from("service_requests").select("id", { count: "exact", head: true })
            .is("assigned_staff_id", null).eq("service_category", "visa")
            .not("status", "in", "(completed,rejected,cancelled)"),
          supabase.from("service_requests").select("id", { count: "exact", head: true })
            .is("assigned_staff_id", null).eq("service_category", "accounting")
            .not("status", "in", "(completed,rejected,cancelled)"),
          supabase.from("claims").select("id", { count: "exact", head: true })
            .in("status", ["open", "under_review"]),
        ]);
        if (cancelled) return;
        setCounts({
          unassignedVisa: visa.count ?? 0,
          unassignedAccounting: acc.count ?? 0,
          openClaims: claims.count ?? 0,
        });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return counts;
}

export function StaffSidebar({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { hasCapability } = useCapabilities();
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const counts = useStaffCounts();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const visible = items.filter((i) => !i.cap || hasCapability(i.cap));
  const navItems = visible.filter((i) => i.action !== "logout");
  const bottomItems = visible.filter((i) => i.action === "logout");

  const handleClick = async (item: Item) => {
    if (item.action === "logout") {
      await signOut();
      onNavigate?.();
      navigate({ to: "/" });
    } else {
      onNavigate?.();
    }
  };

  const renderItem = (item: Item) => {
    const Icon = item.icon;
    const badge = item.badgeKey ? counts[item.badgeKey] : 0;
    const isActive = item.to
      ? item.to === "/staff" ? currentPath === "/staff" : currentPath === item.to || currentPath.startsWith(item.to + "/")
      : false;
    const cls = cn(
      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      collapsed && "justify-center",
      item.intent === "destructive"
        ? "text-destructive hover:bg-destructive/10"
        : isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );
    const inner = (
      <>
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        {!collapsed && badge ? (
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5">{badge}</Badge>
        ) : null}
      </>
    );
    if (item.to && !item.action) {
      return <Link key={item.label} to={item.to} onClick={() => onNavigate?.()} className={cls}>{inner}</Link>;
    }
    return <button key={item.label} onClick={() => handleClick(item)} className={cls}>{inner}</button>;
  };

  // Department pills (top of sidebar)
  const depts = [
    { cap: "handle_visa" as Capability, label: "Visa", to: "/staff/visa" },
    { cap: "handle_accounting" as Capability, label: "Accounting", to: "/staff/accounting" },
    { cap: "handle_consultancy" as Capability, label: "Consultancy", to: "/staff/consultancy" },
    { cap: "handle_translation" as Capability, label: "Translation", to: "/staff/translation" },
  ].filter((d) => hasCapability(d.cap));

  return (
    <nav className="flex h-full flex-col gap-1 p-2">
      <div className={cn("px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60", collapsed && "sr-only")}>
        {profile?.role ?? "staff"}
      </div>
      {!collapsed && depts.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {depts.map((d) => (
            <Link key={d.cap} to={d.to} onClick={() => onNavigate?.()}
              className="rounded-full border border-sidebar-border bg-sidebar-accent/30 px-2 py-0.5 text-[11px] text-sidebar-foreground hover:bg-sidebar-accent">
              {d.label}
            </Link>
          ))}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1">{navItems.map(renderItem)}</div>
      {bottomItems.length > 0 && (
        <div className="mt-auto border-t border-sidebar-border pt-2">{bottomItems.map(renderItem)}</div>
      )}
    </nav>
  );
}
