import { supabase } from "@/lib/supabase";

/**
 * Returns the list of 30-minute slot labels (in CAT, "HH:mm") that are already
 * booked (status=confirmed, booking_type=remote) on the given date.
 * Used to block selection in the time-slot grid and to validate before insert,
 * preventing double-bookings on top of any DB-level unique constraint.
 */
export async function getBookedSlots(date: Date): Promise<string[]> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("interpreter_bookings")
    .select("scheduled_at, duration_minutes")
    .eq("status", "confirmed")
    .eq("booking_type", "remote")
    .gte("scheduled_at", dayStart.toISOString())
    .lte("scheduled_at", dayEnd.toISOString());

  const blocked: string[] = [];
  for (const booking of (data ?? []) as Array<{
    scheduled_at: string;
    duration_minutes: number;
  }>) {
    const start = new Date(booking.scheduled_at);
    const slots = Math.ceil(booking.duration_minutes / 30);
    for (let i = 0; i < slots; i++) {
      const slotTime = new Date(start.getTime() + i * 30 * 60 * 1000);
      blocked.push(
        slotTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Africa/Kigali",
        }),
      );
    }
  }
  return blocked;
}

/**
 * Combine a calendar date and a "HH:mm" CAT time string into a UTC ISO string
 * suitable for inserting into `interpreter_bookings.scheduled_at`.
 * CAT is UTC+2 with no DST, so we subtract 120 minutes.
 */
export function catDateTimeToUtcIso(date: Date, timeHHmm: string): string {
  const [hStr, mStr] = timeHHmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  // Build a UTC timestamp representing CAT (UTC+2) wall-clock time.
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h - 2, m, 0, 0);
  return new Date(utc).toISOString();
}

export function formatCat(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Kigali",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...opts,
  });
}
