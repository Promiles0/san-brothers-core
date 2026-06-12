import { supabase } from "@/lib/supabase";

export interface InterpreterPricing {
  id: string;
  client_rate_usd: number;
  staff_rate_usd: number;
  updated_at: string;
}

export async function getInterpreterPricing(): Promise<InterpreterPricing> {
  const { data, error } = await supabase
    .from("interpreter_pricing")
    .select("id, client_rate_usd, staff_rate_usd, updated_at")
    .limit(1)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    client_rate_usd: Number(data.client_rate_usd),
    staff_rate_usd: Number(data.staff_rate_usd),
    updated_at: data.updated_at,
  };
}

export async function updateInterpreterPricing(
  clientRate: number,
  staffRate: number,
  userId: string,
): Promise<InterpreterPricing> {
  const current = await getInterpreterPricing();
  const { data, error } = await supabase
    .from("interpreter_pricing")
    .update({
      client_rate_usd: clientRate,
      staff_rate_usd: staffRate,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    client_rate_usd: Number(data.client_rate_usd),
    staff_rate_usd: Number(data.staff_rate_usd),
    updated_at: data.updated_at,
  };
}

export function calculateCommission(clientRate: number, staffRate: number): number {
  return clientRate - staffRate;
}

export function convertUsdToRwf(usd: number): number {
  return Math.round(usd * 1285);
}
