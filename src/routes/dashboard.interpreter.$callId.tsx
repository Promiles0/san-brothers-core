import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Pause, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface InterpreterCall {
  id: string;
  client_id: string;
  language_from: string;
  language_to: string;
  status: "ringing" | "active" | "on_hold" | "completed" | "cancelled" | "queued";
  is_free_call: boolean;
  interpreter_id: string | null;
  answered_at: string | null;
  ended_at: string | null;
  billed_seconds: number;
  hold_start: string | null;
  total_hold_seconds: number;
}

interface InterpreterProfile {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
}

interface ClientMinutes {
  client_id: string;
  free_minutes_remaining: number;
  paid_minutes_remaining: number;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/interpreter/$callId")({
  component: ActiveCallPage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

function ActiveCallPage() {
  const { callId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [call, setCall] = useState<InterpreterCall | null>(null);
  const [interpreterProfile, setInterpreterProfile] = useState<InterpreterProfile | null>(null);
  const [clientMinutes, setClientMinutes] = useState<ClientMinutes | null>(null);
  const [loading, setLoading] = useState(true);

  const [callSeconds, setCallSeconds] = useState(0);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [warned, setWarned] = useState(false);

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const billingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot of minutes at call start so billing diffs correctly
  const originalMinutesRef = useRef<ClientMinutes | null>(null);

  // Keep a ref to callSeconds for use inside billing interval
  const callSecondsRef = useRef(0);
  useEffect(() => { callSecondsRef.current = callSeconds; }, [callSeconds]);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    void load();

    async function load() {
      const [callRes, minutesRes] = await Promise.all([
        supabase.from("interpreter_calls").select("*").eq("id", callId).single(),
        supabase.from("client_minutes").select("*").eq("client_id", user!.id).maybeSingle(),
      ]);
      if (callRes.error) { toast.error(callRes.error.message); return; }

      const c = callRes.data as InterpreterCall;
      const m = (minutesRes.data as ClientMinutes) ?? null;
      setCall(c);
      setClientMinutes(m);
      originalMinutesRef.current = m;

      if (c.interpreter_id) void fetchInterpreter(c.interpreter_id);
      if (c.status === "completed" || c.status === "cancelled") {
        navigate({ to: "/dashboard/interpreter/$callId/summary", params: { callId } } as never);
        return;
      }
      setLoading(false);
    }
  }, [callId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInterpreter(interpreterId: string) {
    const { data } = await supabase
      .from("users")
      .select("id,full_name,profile_picture_url")
      .eq("id", interpreterId)
      .single();
    if (data) setInterpreterProfile(data as InterpreterProfile);
  }

  // ── Realtime subscription ─────────────────────────────────────────────────────
  // FIX: channel name uses "-" not ":" (colons break Supabase channel names),
  //      event is "*" to catch INSERT as well as UPDATE,
  //      interpreterProfile removed from deps so the channel isn't torn down
  //      and recreated the moment the profile loads (which was swallowing the
  //      ringing→active transition event).

  useEffect(() => {
    const channel = supabase
      .channel("call-" + callId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interpreter_calls",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          const updated = payload.new as InterpreterCall;
          console.log("[Realtime] status:", updated.status, "| interpreter_id:", updated.interpreter_id);
          setCall(updated);
          if (updated.interpreter_id) {
            void fetchInterpreter(updated.interpreter_id);
          }
          if (updated.status === "completed" || updated.status === "cancelled") {
            navigate({ to: "/dashboard/interpreter/$callId/summary", params: { callId } } as never);
          }
        },
      )
      .subscribe((status) => {
        console.log("[Realtime] channel status:", status);
      });
    return () => { supabase.removeChannel(channel); };
  }, [callId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling fallback (every 3 s) ──────────────────────────────────────────────
  // Simple select("*") — no FK join that could silently fail.
  // Errors are logged so they show up in the browser console.

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("interpreter_calls")
        .select("*")
        .eq("id", callId)
        .single();

      if (error) {
        console.error("[Poll] fetch error:", error.message);
        return;
      }
      if (!data) return;

      const updated = data as InterpreterCall;
      console.log("[Poll] status:", updated.status, "| interpreter_id:", updated.interpreter_id);

      setCall(updated);

      // Fetch interpreter profile as a separate, simple query when we first
      // see an interpreter_id (avoids FK-join syntax that can silently fail).
      if (updated.interpreter_id) {
        void fetchInterpreter(updated.interpreter_id);
      }

      if (updated.status === "completed" || updated.status === "cancelled") {
        navigate({ to: "/dashboard/interpreter/$callId/summary", params: { callId } } as never);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [callId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ringing → queue after 30s ─────────────────────────────────────────────────

  useEffect(() => {
    if (!call || call.status !== "ringing" || !user) return;
    if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    queueTimerRef.current = setTimeout(async () => {
      await supabase
        .from("interpreter_calls")
        .update({ status: "queued" })
        .eq("id", callId);
      await supabase.from("interpreter_queue").insert({
        client_id: user.id,
        language_from: call.language_from,
        language_to: call.language_to,
        status: "waiting",
      });
    }, 30000);
    return () => { if (queueTimerRef.current) clearTimeout(queueTimerRef.current); };
  }, [call?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Call duration timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    if (!call || call.status !== "active" || !call.answered_at) return;

    const answeredMs = new Date(call.answered_at).getTime();
    const holdOffset = (call.total_hold_seconds ?? 0);
    const tick = () => {
      const elapsed = Math.floor((Date.now() - answeredMs) / 1000) - holdOffset;
      setCallSeconds(Math.max(0, elapsed));
    };
    tick();
    callTimerRef.current = setInterval(tick, 1000);
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [call?.status, call?.answered_at, call?.total_hold_seconds]);

  // ── Hold timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
    if (!call || call.status !== "on_hold" || !call.hold_start) return;

    const startMs = new Date(call.hold_start).getTime();
    const tick = () => setHoldSeconds(Math.floor((Date.now() - startMs) / 1000));
    tick();
    holdTimerRef.current = setInterval(tick, 1000);
    return () => { if (holdTimerRef.current) clearInterval(holdTimerRef.current); };
  }, [call?.status, call?.hold_start]);

  // ── Billing (every 10s) ────────────────────────────────────────────────────────

  useEffect(() => {
    if (billingTimerRef.current) { clearInterval(billingTimerRef.current); billingTimerRef.current = null; }
    if (!call || call.status !== "active" || !call.answered_at || !user) return;

    billingTimerRef.current = setInterval(async () => {
      const elapsed = callSecondsRef.current;
      if (elapsed <= 0) return;

      await supabase
        .from("interpreter_calls")
        .update({ billed_seconds: elapsed })
        .eq("id", callId);

      const orig = originalMinutesRef.current;
      if (!orig) return;
      const usedMin = elapsed / 60;
      let free = orig.free_minutes_remaining;
      let paid = orig.paid_minutes_remaining;
      if (free >= usedMin) {
        free -= usedMin;
      } else {
        paid -= usedMin - free;
        free = 0;
      }
      free = Math.max(0, free);
      paid = Math.max(0, paid);
      await supabase
        .from("client_minutes")
        .update({ free_minutes_remaining: free, paid_minutes_remaining: paid })
        .eq("client_id", user.id);
    }, 10000);

    return () => { if (billingTimerRef.current) clearInterval(billingTimerRef.current); };
  }, [call?.status, call?.answered_at, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Minutes remaining + warnings ──────────────────────────────────────────────

  const orig = originalMinutesRef.current;
  const totalSecondsAvailable = orig
    ? Math.floor((orig.free_minutes_remaining + orig.paid_minutes_remaining) * 60)
    : 0;
  const minutesRemaining = Math.max(0, totalSecondsAvailable - callSeconds);

  useEffect(() => {
    if (call?.status !== "active") return;
    if (minutesRemaining <= 60 && minutesRemaining > 0 && !warned) {
      setWarned(true);
      toast.warning("⚠️ Less than 1 minute remaining");
    }
    if (minutesRemaining === 0 && callSeconds > 0) {
      void handleEndCall();
    }
  }, [minutesRemaining, call?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleCancelCall = async () => {
    await supabase.from("interpreter_calls").update({ status: "cancelled" }).eq("id", callId);
    navigate({ to: "/dashboard/interpreter" });
  };

  const handleEndCall = async () => {
    if (!call) return;
    const billedSecs = callSecondsRef.current;
    await supabase
      .from("interpreter_calls")
      .update({ status: "completed", ended_at: new Date().toISOString(), billed_seconds: billedSecs })
      .eq("id", callId);

    const o = originalMinutesRef.current;
    if (o && user) {
      const usedMin = billedSecs / 60;
      let free = Math.max(0, o.free_minutes_remaining - usedMin);
      let paid = o.paid_minutes_remaining;
      if (o.free_minutes_remaining < usedMin) {
        paid = Math.max(0, paid - (usedMin - o.free_minutes_remaining));
      }
      await supabase
        .from("client_minutes")
        .update({ free_minutes_remaining: free, paid_minutes_remaining: paid })
        .eq("client_id", user.id);
    }

    navigate({ to: "/dashboard/interpreter/$callId/summary", params: { callId } } as never);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  console.log("[CallScreen] call:", call, "status:", call?.status);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!call) return null;

  // ── Queued (no interpreter found) ─────────────────────────────────────────────
  if (call.status === "queued") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">No interpreter available right now</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We'll notify you as soon as one becomes available.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // ── Ringing ───────────────────────────────────────────────────────────────────
  if (call.status === "ringing") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-8 py-16 text-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <div className="absolute h-36 w-36 animate-ping rounded-full bg-primary/20" />
          <div className="absolute h-28 w-28 animate-ping rounded-full bg-primary/25 [animation-delay:300ms]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/40">
            <Phone className="h-9 w-9 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Finding your interpreter...</h2>
          <p className="text-sm text-muted-foreground">
            {call.language_from} → {call.language_to}
          </p>
        </div>

        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />

        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={handleCancelCall}
        >
          <PhoneOff className="mr-2 h-4 w-4" />
          Cancel Call
        </Button>
      </div>
    );
  }

  // ── On Hold ───────────────────────────────────────────────────────────────────
  if (call.status === "on_hold") {
    return (
      <div className="mx-auto max-w-md space-y-6 py-8">
        {interpreterProfile && (
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <Avatar className="h-14 w-14">
                <AvatarImage src={interpreterProfile.profile_picture_url ?? undefined} />
                <AvatarFallback className="text-lg">{interpreterProfile.full_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{interpreterProfile.full_name}</p>
                <p className="text-xs text-muted-foreground">Interpreter</p>
              </div>
              <Badge className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-300">
                On Hold
              </Badge>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Pause className="h-12 w-12 animate-pulse text-amber-500" />
          <p className="text-base font-medium">
            Please wait — your interpreter is finding a replacement...
          </p>
          <div className="text-4xl font-bold tabular-nums text-muted-foreground">
            {fmt(holdSeconds)}
          </div>
          <p className="text-xs text-muted-foreground">Hold time (not billed)</p>
          <p className="text-xs text-muted-foreground">
            Call Duration: {fmt(callSeconds)} (paused)
          </p>
        </div>
      </div>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────────────
  if (call.status === "active") {
    return (
      <div className="mx-auto max-w-md space-y-5 py-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Avatar className="h-14 w-14">
              <AvatarImage src={interpreterProfile?.profile_picture_url ?? undefined} />
              <AvatarFallback className="text-lg">
                {interpreterProfile?.full_name?.[0] ?? "I"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{interpreterProfile?.full_name ?? "Interpreter"}</p>
              <p className="text-xs text-muted-foreground">Interpreter</p>
            </div>
            <Badge className="ml-auto bg-green-500/15 text-green-700 dark:text-green-300">
              Connected
            </Badge>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-5 text-center">
              <p className="text-xs text-muted-foreground">Call Duration</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{fmt(callSeconds)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5 text-center">
              <p className="text-xs text-muted-foreground">Minutes Remaining</p>
              <p
                className={cn(
                  "mt-1 text-3xl font-bold tabular-nums transition-colors",
                  minutesRemaining <= 60 ? "animate-bounce text-destructive" : "",
                )}
              >
                {fmt(minutesRemaining)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-h-52 items-center justify-center rounded-2xl bg-zinc-900 text-sm text-zinc-400">
          Video call will appear here — Daily.co integration pending
        </div>

        <Button size="lg" variant="destructive" className="w-full" onClick={handleEndCall}>
          <PhoneOff className="mr-2 h-4 w-4" />
          End Call
        </Button>
      </div>
    );
  }

  return null;
}
