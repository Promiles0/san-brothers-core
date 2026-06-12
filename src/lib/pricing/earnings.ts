import { supabase } from "@/lib/supabase";
import { getInterpreterPricing } from "./interpreter-rates";

export interface StaffEarnings {
  totalMinutes: number;
  totalEarned: number;
  ratePerMinute: number;
  callCount: number;
  updatedAt: string;
}

interface RawCall {
  id: string;
  client_id: string | null;
  billed_seconds: number | null;
  minutes_deducted: number | null;
  rating: number | null;
  created_at: string;
}

function callMinutes(row: { billed_seconds: number | null; minutes_deducted: number | null }): number {
  if (row.minutes_deducted) return Math.ceil(Number(row.minutes_deducted));
  if (row.billed_seconds) return Math.ceil(Number(row.billed_seconds) / 60);
  return 0;
}

export async function getStaffEarningsThisMonth(
  staffId: string,
): Promise<StaffEarnings> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: calls, error } = await supabase
    .from("interpreter_calls")
    .select("billed_seconds,minutes_deducted,created_at")
    .eq("interpreter_id", staffId)
    .in("status", ["completed", "ended"])
    .gte("created_at", monthStart.toISOString());

  if (error) throw error;

  const pricing = await getInterpreterPricing();
  const totalMinutes = (calls ?? []).reduce((sum, c) => sum + callMinutes(c), 0);
  const totalEarned = totalMinutes * pricing.staff_rate_usd;

  return {
    totalMinutes,
    totalEarned,
    ratePerMinute: pricing.staff_rate_usd,
    callCount: calls?.length ?? 0,
    updatedAt: pricing.updated_at,
  };
}

export interface EarningsHistoryRow {
  id: string;
  client_id: string | null;
  client_name: string | null;
  durationMinutes: number;
  rating: number | null;
  earnedUsd: number;
  created_at: string;
}

export async function getStaffEarningsHistory(
  staffId: string,
  limit = 20,
): Promise<EarningsHistoryRow[]> {
  const { data: calls, error } = await supabase
    .from("interpreter_calls")
    .select("id,client_id,billed_seconds,minutes_deducted,rating,created_at,client:users!client_id(full_name)")
    .eq("interpreter_id", staffId)
    .in("status", ["completed", "ended"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const pricing = await getInterpreterPricing();

  return (calls ?? []).map((c: RawCall & { client: { full_name: string | null } | { full_name: string | null }[] | null }) => {
    const minutes = callMinutes(c);
    const clientObj = Array.isArray(c.client) ? c.client[0] : c.client;
    return {
      id: c.id,
      client_id: c.client_id,
      client_name: clientObj?.full_name ?? null,
      durationMinutes: minutes,
      rating: c.rating,
      earnedUsd: minutes * pricing.staff_rate_usd,
      created_at: c.created_at,
    };
  });
}
