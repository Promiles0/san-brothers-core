import { supabase } from "@/lib/supabase";

export interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification(n: NotificationPayload) {
  const { error } = await supabase.from("notifications").insert(n);
  if (error) console.error("createNotification error", error);
}

export async function createNotifications(items: NotificationPayload[]) {
  if (!items.length) return;
  const { error } = await supabase.from("notifications").insert(items);
  if (error) console.error("createNotifications error", error);
}

export async function createNotificationForAdmins(payload: Omit<NotificationPayload, "user_id">) {
  const { data: admins, error } = await supabase
    .from("users")
    .select("id")
    .in("role", ["admin", "manager"]);
  if (error || !admins?.length) return;
  await createNotifications(admins.map((a) => ({ ...payload, user_id: (a as { id: string }).id })));
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
