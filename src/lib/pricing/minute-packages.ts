import { supabase } from "@/lib/supabase";

export interface MinutePackage {
  id: string;
  name: string;
  minutes: number;
  price_usd: number;
  is_popular: boolean;
  is_free_trial: boolean;
  free_minutes: number;
  active: boolean;
  display_order: number;
}

const SELECT =
  "id,name,minutes,price_usd,is_popular,is_free_trial,free_minutes,active,display_order";

function normalize(row: Record<string, unknown>): MinutePackage {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    minutes: Number(row.minutes ?? 0),
    price_usd: Number(row.price_usd ?? 0),
    is_popular: Boolean(row.is_popular),
    is_free_trial: Boolean(row.is_free_trial),
    free_minutes: Number(row.free_minutes ?? 0),
    active: row.active === undefined ? true : Boolean(row.active),
    display_order: Number(row.display_order ?? 0),
  };
}

export async function getMinutePackages(): Promise<MinutePackage[]> {
  const { data, error } = await supabase
    .from("minute_packages")
    .select(SELECT)
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getAllMinutePackages(): Promise<MinutePackage[]> {
  const { data, error } = await supabase
    .from("minute_packages")
    .select(SELECT)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function createMinutePackage(
  pkg: Omit<MinutePackage, "id">,
): Promise<MinutePackage> {
  const { data, error } = await supabase
    .from("minute_packages")
    .insert(pkg)
    .select(SELECT)
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateMinutePackage(
  id: string,
  updates: Partial<MinutePackage>,
): Promise<MinutePackage> {
  const { data, error } = await supabase
    .from("minute_packages")
    .update(updates)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteMinutePackage(id: string): Promise<void> {
  const { error } = await supabase.from("minute_packages").delete().eq("id", id);
  if (error) throw error;
}
