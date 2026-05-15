import type { UserRole } from "@/lib/types";
import {
  Home, Briefcase, FileText, MessageSquare, CreditCard, Sparkles, User as UserIcon, Settings, LogOut,
  Inbox, Clock, UserCheck, Forward, Users,
  CheckCircle2, Send, Award,
  PhoneCall, ListChecks, History, DollarSign,
  LayoutDashboard, TrendingUp, UserCog, Wrench, Languages, ScrollText, BookOpen,
  type LucideIcon,
} from "lucide-react";

export interface SidebarItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: number;
}

export const sidebarMenus: Record<UserRole, SidebarItem[]> = {
  client: [
    { label: "Home", icon: Home, href: "/dashboard?role=client" },
    { label: "My Services", icon: Briefcase },
    { label: "Documents", icon: FileText },
    { label: "Messages", icon: MessageSquare },
    { label: "Payments", icon: CreditCard },
    { label: "AI Assistant", icon: Sparkles },
    { label: "Profile", icon: UserIcon },
    { label: "Settings", icon: Settings },
    { label: "Logout", icon: LogOut },
  ],
  secretary: [
    { label: "New Requests", icon: Inbox, badge: 4 },
    { label: "In Progress", icon: Clock },
    { label: "Awaiting Client", icon: UserCheck },
    { label: "Forwarded", icon: Forward },
    { label: "All Clients", icon: Users },
    { label: "Messages", icon: MessageSquare },
    { label: "Profile", icon: UserIcon },
    { label: "Logout", icon: LogOut },
  ],
  manager: [
    { label: "Awaiting My Review", icon: Inbox, badge: 2 },
    { label: "Approved", icon: CheckCircle2 },
    { label: "Sent to Authority", icon: Send },
    { label: "Completed", icon: Award },
    { label: "All Clients", icon: Users },
    { label: "Messages", icon: MessageSquare },
    { label: "Profile", icon: UserIcon },
    { label: "Logout", icon: LogOut },
  ],
  translator: [
    { label: "Incoming", icon: Inbox, badge: 1 },
    { label: "Active Call", icon: PhoneCall },
    { label: "Document Queue", icon: ListChecks },
    { label: "Call History", icon: History },
    { label: "Earnings", icon: DollarSign },
    { label: "Profile", icon: UserIcon },
    { label: "Settings", icon: Settings },
    { label: "Logout", icon: LogOut },
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
    { label: "Logout", icon: LogOut },
  ],
};
