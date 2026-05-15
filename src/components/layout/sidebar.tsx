import type { UserRole } from "@/lib/types";
import { sidebarMenus } from "./sidebar-menus";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ role, collapsed = false, onNavigate }: SidebarProps) {
  const items = sidebarMenus[role];
  return (
    <nav className="flex h-full flex-col gap-1 p-2">
      <div className={cn("px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60", collapsed && "sr-only")}>
        {role}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            {!collapsed && item.badge ? (
              <Badge variant="destructive" className="h-5 min-w-5 px-1">{item.badge}</Badge>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
