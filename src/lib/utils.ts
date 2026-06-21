import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SLATone = "success" | "neutral" | "amber";

export interface SLAEstimate {
  tone: SLATone;
  text: string;
}

export interface SLAInput {
  createdAt: string | null | undefined;
  completedAt: string | null | undefined;
  estimatedDaysMin: number | null | undefined;
  estimatedDaysMax: number | null | undefined;
  status: string | null | undefined;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Derives a calm, non-alarming SLA indicator from a service request's
 * timestamps + the linked service's estimated duration window.
 * Returns null when there is nothing useful to show.
 */
export function computeSLA({
  createdAt,
  completedAt,
  estimatedDaysMin,
  estimatedDaysMax,
  status,
}: SLAInput): SLAEstimate | null {
  if (!createdAt) return null;
  if (status === "rejected" || status === "cancelled") return null;

  if (status === "completed") {
    if (!completedAt) return null;
    const days = Math.max(
      0,
      Math.round((new Date(completedAt).getTime() - new Date(createdAt).getTime()) / MS_PER_DAY),
    );
    return {
      tone: "success",
      text: `Completed in ${days} day${days === 1 ? "" : "s"}`,
    };
  }

  const max = estimatedDaysMax ?? null;
  const min = estimatedDaysMin ?? null;
  if (!max) return null;

  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / MS_PER_DAY);

  const rangeLabel = min && min !== max ? `${min}–${max} days` : `${max} days`;

  if (elapsed > max) {
    return {
      tone: "amber",
      text: `Taking longer than usual (expected ${rangeLabel})`,
    };
  }

  const remaining = Math.max(0, max - elapsed);
  if (min && min === max) {
    return {
      tone: "neutral",
      text: `~${remaining} day${remaining === 1 ? "" : "s"} remaining`,
    };
  }
  return {
    tone: "neutral",
    text: `Estimated ${rangeLabel} · ~${remaining} day${remaining === 1 ? "" : "s"} remaining`,
  };
}
