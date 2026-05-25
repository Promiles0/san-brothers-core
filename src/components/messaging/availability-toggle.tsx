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

export function AvailabilityToggle() {
  const { user } = useAuth();
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

  const update = async (next: string) => {
    if (!user) return;
    setStatus(next);
    const { error } = await supabase
      .from("users")
      .update({ availability_status: next })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success(`Status set to ${next}`);
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
