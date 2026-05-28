import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const OPTIONS = [
  { key: "online", label: "Online", color: "bg-emerald-500" },
  { key: "busy", label: "Busy", color: "bg-amber-500" },
  { key: "away", label: "Away", color: "bg-slate-400" },
] as const;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  zh: "Chinese",
  rw: "Kinyarwanda",
  sw: "Kiswahili",
};

interface QueueEntry {
  id: string;
  client_id: string;
  language_from: string;
  language_to: string;
}

export function AvailabilityToggle() {
  const { user, profile, refreshProfile } = useAuth();
  const [status, setStatus] = useState<string>("online");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("availability_status")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.availability_status) setStatus(data.availability_status);
    })();
  }, [user]);

  const checkQueue = async () => {
    const langs = profile?.interpreter_languages as
      | Array<{ from: string; to: string }>
      | null
      | undefined;
    if (!langs?.length) return;

    const { data: queuedClients } = await supabase
      .from("interpreter_queue")
      .select("*")
      .eq("status", "waiting");

    if (!queuedClients?.length) return;

    const matches = (queuedClients as QueueEntry[]).filter((entry) =>
      langs.some((pair) => pair.from === entry.language_from && pair.to === entry.language_to),
    );

    if (!matches.length) return;

    await supabase.from("notifications").insert(
      matches.map((entry) => ({
        user_id: entry.client_id,
        type: "interpreter_available",
        title: "Interpreter Available",
        body: `An interpreter for ${LANGUAGE_NAMES[entry.language_from] ?? entry.language_from} → ${LANGUAGE_NAMES[entry.language_to] ?? entry.language_to} is now available`,
        link: `/dashboard/interpreter?language_from=${entry.language_from}&language_to=${entry.language_to}`,
        is_read: false,
      })),
    );

    await supabase
      .from("interpreter_queue")
      .update({ status: "notified", notified_at: new Date().toISOString() })
      .in(
        "id",
        matches.map((e) => e.id),
      );

    console.log("[Queue] Notified", matches.length, "queued clients");
  };

  const update = async (next: string) => {
    if (!user) return;
    setStatus(next);
    const { error } = await supabase
      .from("users")
      .update({ availability_status: next })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Status set to ${next}`);
    if (next === "online") await checkQueue();
    await refreshProfile();
  };

  const current = OPTIONS.find((o) => o.key === status) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className={cn("h-2 w-2 rounded-full", current.color)} />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Availability</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.key} onClick={() => void update(o.key)}>
            <span className={cn("mr-2 h-2 w-2 rounded-full", o.color)} />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
