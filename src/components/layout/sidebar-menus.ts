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
  Inbox,
  Clock,
  UserCheck,
  Forward,
  Users,
  CheckCircle2,
  Send,
  Award,
  MessageSquare,
  PhoneCall,
  History,
  DollarSign,
  LayoutDashboard,
  TrendingUp,
  UserCog,
  Wrench,
  Languages,
  ScrollText,
  BookOpen,
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
  secretary: [
    { label: "New Requests", icon: Inbox, badge: 4 },
    { label: "In Progress", icon: Clock },
    { label: "Awaiting Client", icon: UserCheck },
    { label: "Forwarded", icon: Forward },
    { label: "All Clients", icon: Users },
    { label: "Messages", icon: MessageSquare },
    { label: "Profile", icon: UserIcon },
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
  manager: [
    { label: "Awaiting My Review", icon: Inbox, badge: 2 },
    { label: "Approved", icon: CheckCircle2 },
    { label: "Sent to Authority", icon: Send },
    { label: "Completed", icon: Award },
    { label: "All Clients", icon: Users },
    { label: "Messages", icon: MessageSquare },
    { label: "Profile", icon: UserIcon },
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
  translator: [
    { label: "Incoming", icon: Inbox, badge: 1 },
    { label: "Active Call", icon: PhoneCall },
    { label: "Document Queue", icon: ListChecks },
    { label: "Call History", icon: History },
    { label: "Earnings", icon: DollarSign },
    { label: "Profile", icon: UserIcon },
    { label: "Settings", icon: Settings },
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
  admin: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Revenue", icon: TrendingUp },
    { label: "Clients", icon: Users },
    { label: "Staff", icon: UserCog },
    { label: "Services & Pricing", icon: Wrench },
    { label: "Translators", icon: Languages },
    { label: "Audit Log", icon: ScrollText },
    { label: "AI Knowledge Base", icon: BookOpen },
    { label: "Settings", icon: Settings },
    { label: "Logout", icon: LogOut, action: "logout", intent: "destructive" },
  ],
};
