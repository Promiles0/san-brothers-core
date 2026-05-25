import { supabase } from "@/lib/supabase";

export async function logAudit({
  action,
  target_type,
  target_id,
  metadata,
}: {
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action,
    target_type,
    target_id: target_id ?? null,
    metadata: metadata ?? null,
  });
}
