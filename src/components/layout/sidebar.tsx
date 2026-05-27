import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { UserRole } from "@/lib/types";
import { sidebarMenus, type SidebarItem } from "./sidebar-menus";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardCounts } from "@/lib/dashboard/useDashboardCounts";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";

interface SidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Nav item keys to hide (matched against SidebarItem.key) */
  hiddenNavKeys?: string[];
}

export function Sidebar({ role, collapsed = false, onNavigate, hiddenNavKeys }: SidebarProps) {
  const rawItems = sidebarMenus[role];
  const items = hiddenNavKeys?.length
    ? rawItems.filter((item) => !item.key || !hiddenNavKeys.includes(item.key))
    : rawItems;
  const counts = useDashboardCounts();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const resolveBadge = (badge: SidebarItem["badge"]) => {
    if (badge === undefined) return undefined;
    if (typeof badge === "number") return badge || undefined;
    if (badge === "active") return counts.activeServices || undefined;
    if (badge === "claims") return counts.openClaims || undefined;
    if (badge === "messages") return counts.unreadMessages || undefined;
    return undefined;
  };

  // Split: regular nav items at top, logout-style items at bottom
  const navItems = items.filter((i) => i.action !== "logout");
  const bottomItems = items.filter((i) => i.action === "logout");

  const handleClick = async (item: SidebarItem) => {
    if (item.action === "logout") {
      await signOut();
      onNavigate?.();
      navigate({ to: "/" });
      return;
    }
    onNavigate?.();
  };

  const itemLabel = (item: SidebarItem) =>
    item.key ? t(`dashboard.nav.${item.key}`) || item.label : item.label;

  const renderItem = (item: SidebarItem) => {
    const Icon = item.icon;
    const badgeValue = resolveBadge(item.badge);
    const isActive = item.to
      ? item.to === "/dashboard"
        ? currentPath === "/dashboard"
        : currentPath === item.to || currentPath.startsWith(item.to + "/")
      : false;

    const baseClass = cn(
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
        {!collapsed && <span className="flex-1 text-left">{itemLabel(item)}</span>}
        {!collapsed && badgeValue ? (
          <Badge
            variant={item.intent === "destructive" ? "destructive" : "secondary"}
            className="h-5 min-w-5 px-1.5"
          >
            {badgeValue}
          </Badge>
        ) : null}
      </>
    );

    if (item.to && !item.action) {
      return (
        <Link key={item.label} to={item.to} onClick={() => onNavigate?.()} className={baseClass}>
          {inner}
        </Link>
      );
    }
    return (
      <button key={item.label} onClick={() => handleClick(item)} className={baseClass}>
        {inner}
      </button>
    );
  };

  return (
    <nav className="flex h-full flex-col gap-1 p-2">
      <div
        className={cn(
          "px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60",
          collapsed && "sr-only",
        )}
      >
        {role}
      </div>
      <div className="flex flex-1 flex-col gap-1">{navItems.map(renderItem)}</div>
      {bottomItems.length > 0 && (
        <div className="mt-auto border-t border-sidebar-border pt-2">
          {bottomItems.map(renderItem)}
        </div>
      )}
    </nav>
  );
}
