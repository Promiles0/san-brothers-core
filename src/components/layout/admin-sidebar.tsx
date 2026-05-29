import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCog,
  FolderKanban,
  BarChart3,
  MessageSquare,
  Headphones,
  FolderOpen,
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
  to: string;
  badgeKey?: "activeCases";
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
      { label: "Overview", icon: LayoutDashboard, to: "/admin" },
      { label: "Revenue", icon: BarChart3, to: "/admin/revenue" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Clients", icon: Users, to: "/admin/clients" },
      { label: "Cases", icon: FolderKanban, to: "/admin/cases", badgeKey: "activeCases" },
      { label: "Messages", icon: MessageSquare, to: "/admin/messages" },
      { label: "Interpreters", icon: Headphones, to: "/admin/interpreter" },
      { label: "Documents", icon: FolderOpen, to: "/admin/documents" },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Staff", icon: UserCog, to: "/admin/staff" },
      { label: "Audit Log", icon: ScrollText, to: "/admin/audit" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Services", icon: Wrench, to: "/admin/services" },
      { label: "Settings", icon: Settings, to: "/admin/settings" },
    ],
  },
];

const bottom: Item = {
  label: "Log out",
  icon: LogOut,
  to: "",
  action: "logout",
  intent: "destructive",
};

function useAdminCounts() {
  const [counts, setCounts] = useState({ activeCases: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled,rejected)");
      if (!cancelled) setCounts({ activeCases: count ?? 0 });
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
    if (item.to === "/admin") return currentPath === "/admin";
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
          type="button"
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

    return (
      <Link key={item.label} to={item.to as never} onClick={() => onNavigate?.()} className={cls}>
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
        Admin Panel
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-0.5">
            {!collapsed && (
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
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
