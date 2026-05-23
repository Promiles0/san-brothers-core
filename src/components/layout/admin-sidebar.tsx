import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Users,
  CreditCard,
  UserCog,
  ShieldCheck,
  ScrollText,
  Wrench,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface Item {
  label: string;
  icon: LucideIcon;
  to?: string;
  hash?: string;
  badgeKey?: "allCases";
  action?: "logout";
  intent?: "destructive";
}

interface Group {
  title: string;
  items: Item[];
}

const groups: Group[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/staff/admin" },
      { label: "Analytics", icon: BarChart3, to: "/staff/admin/analytics" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "All Cases", icon: FolderKanban, to: "/staff/visa", badgeKey: "allCases" },
      { label: "Clients", icon: Users, to: "/staff/clients" },
      { label: "Payments", icon: CreditCard, to: "/staff/admin/payments" },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Staff Management", icon: UserCog, to: "/staff/admin", hash: "staff" },
      { label: "Capabilities", icon: ShieldCheck, to: "/staff/admin", hash: "capabilities" },
      { label: "Audit Log", icon: ScrollText, to: "/staff/admin", hash: "audit" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Services & Pricing", icon: Wrench, to: "/staff/admin", hash: "pricing" },
      { label: "Settings", icon: Settings, to: "/staff/settings" },
    ],
  },
];

const bottom: Item = {
  label: "Log out",
  icon: LogOut,
  action: "logout",
  intent: "destructive",
};

function useAdminCounts() {
  const [counts, setCounts] = useState({ allCases: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled,rejected)");
      if (!cancelled) setCounts({ allCases: count ?? 0 });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return counts;
}

export function AdminSidebar({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const counts = useAdminCounts();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (item: Item) => {
    if (!item.to) return false;
    if (item.hash) return false;
    if (item.to === "/staff/admin") return currentPath === "/staff/admin";
    return currentPath === item.to || currentPath.startsWith(item.to + "/");
  };

  const renderItem = (item: Item) => {
    const Icon = item.icon;
    const active = isActive(item);
    const badge = item.badgeKey ? counts[item.badgeKey] : 0;
    const cls = cn(
      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      collapsed && "justify-center",
      item.intent === "destructive"
        ? "text-destructive hover:bg-destructive/10"
        : active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );
    const inner = (
      <>
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        {!collapsed && badge ? (
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
            {badge}
          </Badge>
        ) : null}
      </>
    );

    if (item.action === "logout") {
      return (
        <button
          key={item.label}
          onClick={async () => {
            await signOut();
            onNavigate?.();
            navigate({ to: "/" });
          }}
          className={cls}
        >
          {inner}
        </button>
      );
    }

    if (item.hash) {
      return (
        <a
          key={item.label}
          href={`${item.to}#${item.hash}`}
          onClick={(e) => {
            if (currentPath === item.to) {
              e.preventDefault();
              const el = document.getElementById(item.hash!);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            onNavigate?.();
          }}
          className={cls}
        >
          {inner}
        </a>
      );
    }

    return (
      <Link key={item.label} to={item.to!} onClick={() => onNavigate?.()} className={cls}>
        {inner}
      </Link>
    );
  };

  return (
    <nav className="flex h-full flex-col gap-1 p-2">
      <div
        className={cn(
          "px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary",
          collapsed && "sr-only",
        )}
      >
        Command Center
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-0.5">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {g.title}
              </div>
            )}
            {g.items.map(renderItem)}
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-sidebar-border pt-2">{renderItem(bottom)}</div>
    </nav>
  );
}
