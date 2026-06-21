import type { UserRole } from "@/lib/types";
import {
  Home,
  LayoutGrid,
  ListChecks,
  FolderOpen,
  MessageCircle,
  CreditCard,
  ShieldAlert,
  User as UserIcon,
  Settings,
  LogOut,
  Headphones,
  type LucideIcon,
} from "lucide-react";

export interface SidebarItem {
  /** i18n key under dashboard.nav.* (falls back to label) */
  key?: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  /** badge source: "active" | "claims" | "messages" | static number */
  badge?: "active" | "claims" | "messages" | number;
  /** styling intent */
  intent?: "default" | "destructive";
  /** action instead of nav (e.g. logout) */
  action?: "logout";
}

export const sidebarMenus: Record<UserRole, SidebarItem[]> = {
  client: [
    { key: "home", label: "Home", icon: Home, to: "/dashboard" },
    {
      key: "browseServices",
      label: "Browse Services",
      icon: LayoutGrid,
      to: "/dashboard/services",
    },
    {
      key: "myServices",
      label: "My Services",
      icon: ListChecks,
      to: "/dashboard/my-services",
      badge: "active",
    },
    { key: "documents", label: "Documents", icon: FolderOpen, to: "/dashboard/documents" },
    {
      key: "liveInterpreter",
      label: "Live Interpreter",
      icon: Headphones,
      to: "/dashboard/interpreter",
    },
    {
      key: "messages",
      label: "Messages",
      icon: MessageCircle,
      to: "/dashboard/messages",
      badge: "messages",
    },
    { key: "payments", label: "Payments", icon: CreditCard, to: "/dashboard/payments" },
    { key: "claims", label: "Claims", icon: ShieldAlert, to: "/dashboard/claims", badge: "claims" },
    { key: "profile", label: "Profile", icon: UserIcon, to: "/dashboard/profile" },
    { key: "settings", label: "Settings", icon: Settings, to: "/dashboard/settings" },
    { key: "logout", label: "Log out", icon: LogOut, action: "logout", intent: "destructive" },
  ],
  // NOTE: secretary/manager/translator/admin roles render their own dedicated
  // sidebars (StaffSidebar / AdminSidebar). The generic Sidebar is only used
  // by the client dashboard. These minimal stubs exist solely to satisfy the
  // Record<UserRole, SidebarItem[]> type; do not add nav items here without
  // also wiring real routes — broken `to`-less entries used to live here.
  secretary: [
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
  manager: [
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
  translator: [
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
  admin: [
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
};
