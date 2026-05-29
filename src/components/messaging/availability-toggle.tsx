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
import { checkQueueAndNotify } from "@/lib/interpreter/check-queue";

const OPTIONS = [
  { key: "online", label: "Online", color: "bg-emerald-500" },
  { key: "busy", label: "Busy", color: "bg-amber-500" },
  { key: "away", label: "Away", color: "bg-slate-400" },
] as const;

export function AvailabilityToggle() {
  const { user, profile, refreshProfile } = useAuth();
  const [status, setStatus] = useState<string>(profile?.availability_status ?? "online");

  // Seed from DB on mount
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

  // Keep in sync when profile refreshes (e.g. after ending a call)
  useEffect(() => {
    if (profile?.availability_status) {
      setStatus(profile.availability_status);
    }
  }, [profile?.availability_status]);

  const update = async (next: string) => {
    if (!user || !profile) return;
    setStatus(next); // Update UI immediately

    const { error } = await supabase
      .from("users")
      .update({ availability_status: next })
      .eq("id", user.id);

    if (error) {
      setStatus(profile.availability_status ?? "online"); // Revert on error
      toast.error("Failed to update status");
      return;
    }

    toast.success(`Status set to ${next}`);
    await refreshProfile();

    if (next === "online") {
      await checkQueueAndNotify(
        (profile.interpreter_languages as Array<{ from: string; to: string }>) || [],
        profile.id,
      );
    }
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
