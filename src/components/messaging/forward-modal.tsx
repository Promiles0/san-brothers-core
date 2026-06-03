import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StaffOption {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  availability_status: string | null;
}

const statusColor: Record<string, string> = {
  online: "bg-emerald-500",
  busy: "bg-amber-500",
  away: "bg-slate-400",
  offline: "bg-slate-400",
};

export function ForwardModal({
  open,
  onOpenChange,
  excludeId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  excludeId?: string | null;
  onConfirm: (staff: StaffOption, note: string) => Promise<void> | void;
}) {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<StaffOption | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id,full_name,email,role,availability_status")
        .neq("role", "client")
        .order("full_name", { ascending: true });
      if (error) toast.error(error.message);
      setStaff(((data ?? []) as StaffOption[]).filter((s) => s.id !== excludeId));
      setLoading(false);
    })();
  }, [open, excludeId]);

  const filtered = staff.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.full_name ?? "").toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  });

  const handleConfirm = async () => {
    if (!picked) return;
    setSubmitting(true);
    try {
      await onConfirm(picked, note.trim());
      onOpenChange(false);
      setPicked(null);
      setNote("");
      setQuery("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Forward conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff by name, email or role"
              className="pl-8"
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No staff found.</p>
            ) : (
              <ul>
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(s)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                        picked?.id === s.id ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.full_name ?? s.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.role}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            statusColor[s.availability_status ?? "offline"] ?? "bg-slate-400",
                          )}
                        />
                        {s.availability_status ?? "offline"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note to the new staff member"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!picked || submitting}>
            Forward to {picked?.full_name ?? picked?.email ?? "…"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
