import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AvailableInterpreter {
  id: string;
  full_name: string | null;
  profile_picture_url: string | null;
  availability_status: string | null;
  interpreter_languages: Array<{ from: string; to: string }> | null;
}

interface ForwardableCall {
  id: string;
  language_from: string;
  language_to: string;
}

interface ForwardCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: ForwardableCall;
  currentInterpreterName: string;
  currentInterpreterId: string;
  callId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ForwardCallModal({
  open,
  onOpenChange,
  call,
  currentInterpreterName,
  currentInterpreterId,
  callId,
}: ForwardCallModalProps) {
  const navigate = useNavigate();
  const [interpreters, setInterpreters] = useState<AvailableInterpreter[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    void fetchInterpreters();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInterpreters() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id,full_name,profile_picture_url,availability_status,interpreter_languages")
        .eq("role", "translator")
        .eq("interpreter_profile_complete", true)
        .eq("availability_status", "online")
        .neq("id", currentInterpreterId);

      if (error) {
        toast.error(error.message);
        return;
      }

      // Filter in JS: keep only interpreters who handle this language pair
      const filtered = ((data ?? []) as AvailableInterpreter[]).filter((u) =>
        u.interpreter_languages?.some(
          (pair) => pair.from === call.language_from && pair.to === call.language_to,
        ),
      );
      setInterpreters(filtered);
    } finally {
      setLoading(false);
    }
  }

  const handleForward = async () => {
    if (!selected) return;
    setForwarding(true);
    try {
      const now = new Date().toISOString();

      // Step 1: put call on hold
      const { error: holdErr } = await supabase
        .from("interpreter_calls")
        .update({ status: "on_hold", hold_start: now })
        .eq("id", callId);
      if (holdErr) throw holdErr;

      // Step 2: record forwarded_to
      const { error: fwdErr } = await supabase
        .from("interpreter_calls")
        .update({ forwarded_to: selected, forwarded_at: now })
        .eq("id", callId);
      if (fwdErr) throw fwdErr;

      // Step 3: notify target interpreter
      await supabase.from("notifications").insert({
        user_id: selected,
        type: "call_forward",
        title: "Call forwarded to you",
        body: `${currentInterpreterName} forwarded a ${call.language_from} → ${call.language_to} call to you`,
        link: `/staff/interpreter/${callId}`,
      });

      navigate({ to: "/staff" } as never);
    } catch {
      toast.error("Failed to forward call");
    } finally {
      setForwarding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Call</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Select an available interpreter for this{" "}
          <strong>
            {call.language_from} → {call.language_to}
          </strong>{" "}
          call. The call will be placed on hold while they accept.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : interpreters.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No other interpreters are available for this language pair right now.
          </p>
        ) : (
          <ScrollArea className="max-h-64">
            <ul className="space-y-2 pr-2">
              {interpreters.map((interp) => (
                <li key={interp.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(selected === interp.id ? null : interp.id)}
                    className={[
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                      selected === interp.id ? "border-primary bg-primary/5" : "border-border",
                    ].join(" ")}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={interp.profile_picture_url ?? undefined} />
                      <AvatarFallback>
                        {(interp.full_name?.[0] ?? "I").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{interp.full_name ?? "Interpreter"}</p>
                      <Badge
                        variant="secondary"
                        className="mt-0.5 bg-green-100 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      >
                        Online
                      </Badge>
                    </div>
                    {selected === interp.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={forwarding}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={!selected || forwarding}
            className="bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {forwarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Forward Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
