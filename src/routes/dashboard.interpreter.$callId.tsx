import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Pause, Clock, Loader2, Moon, XCircle } from "lucide-react";
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
  queue_reason: "all_busy" | "none_online" | "unsupported_language" | null;
  is_free_call: boolean;
  interpreter_id: string | null;
  answered_at: string | null;
  ended_at: string | null;
  billed_seconds: number;
  hold_start: string | null;
  total_hold_seconds: number;
  daily_room_url: string | null;
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
  component: CallIdPage,
});

function CallIdPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <ActiveCallPage />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  zh: "Chinese",
  rw: "Kinyarwanda",
  sw: "Kiswahili",
};

const formatLangPair = (from: string, to: string) =>
  `${LANGUAGE_NAMES[from] ?? from} → ${LANGUAGE_NAMES[to] ?? to}`;

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
  const [isEnding, setIsEnding] = useState(false);
  const [queueEntryId, setQueueEntryId] = useState<string | null>(null);

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const billingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // guard against handleEndCall being invoked more than once
  const callEndedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Snapshot of minutes at call start so billing diffs correctly
  const originalMinutesRef = useRef<ClientMinutes | null>(null);

  // Keep a ref to callSeconds for use inside billing interval
  const callSecondsRef = useRef(0);
  useEffect(() => {
    callSecondsRef.current = callSeconds;
  }, [callSeconds]);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    void load();

    async function load() {
      const [callRes, minutesRes] = await Promise.all([
        supabase.from("interpreter_calls").select("*").eq("id", callId).single(),
        supabase.from("client_minutes").select("*").eq("client_id", user!.id).maybeSingle(),
      ]);
      if (callRes.error) {
        toast.error(callRes.error.message);
        return;
      }

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
          console.log(
            "[Realtime] status:",
            updated.status,
            "| interpreter_id:",
            updated.interpreter_id,
          );
          setCall(updated);
          if (updated.interpreter_id) {
            void fetchInterpreter(updated.interpreter_id);
          }
          if (updated.status === "completed" || updated.status === "cancelled") {
            if (!callEndedRef.current) {
              navigate({
                to: "/dashboard/interpreter/$callId/summary",
                params: { callId },
                replace: true,
              } as never);
            }
          }
        },
      )
      .subscribe((status) => {
        console.log("[Realtime] channel status:", status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
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

      if (updated.interpreter_id) {
        void fetchInterpreter(updated.interpreter_id);
      }

      if (updated.status === "completed" || updated.status === "cancelled") {
        if (!callEndedRef.current) {
          navigate({
            to: "/dashboard/interpreter/$callId/summary",
            params: { callId },
            replace: true,
          } as never);
        }
      }
    }, 3000);

    pollRef.current = interval;
    return () => {
      clearInterval(interval);
      pollRef.current = null;
    };
  }, [callId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Queue entry lookup ────────────────────────────────────────────────────────

  useEffect(() => {
    if (call?.status !== "queued" || !user) return;
    supabase
      .from("interpreter_queue")
      .select("id")
      .eq("client_id", user.id)
      .in("status", ["waiting", "notified"])
      .order("queued_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setQueueEntryId((data as { id: string }).id);
      });
  }, [call?.status, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notifications realtime (queued screen only) ────────────────────────────────

  useEffect(() => {
    if (call?.status !== "queued" || !user) return;
    const channel = supabase
      .channel("queue-notify-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + user.id,
        },
        (payload) => {
          const n = payload.new as { type: string; body: string | null; link: string | null };
          if (n.type !== "interpreter_available") return;
          toast("An interpreter is now available! Tap to call", {
            description: n.body ?? undefined,
            action: {
              label: "Call Now →",
              onClick: () => {
                window.location.href = n.link ?? "/dashboard/interpreter";
              },
            },
            duration: 15000,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [call?.status, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ringing → queue after 30s ─────────────────────────────────────────────────

  useEffect(() => {
    if (!call || call.status !== "ringing" || !user) return;
    if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    queueTimerRef.current = setTimeout(async () => {
      await supabase.from("interpreter_calls").update({ status: "queued" }).eq("id", callId);
      await supabase.from("interpreter_queue").insert({
        client_id: user.id,
        language_from: call.language_from,
        language_to: call.language_to,
        status: "waiting",
      });
    }, 30000);
    return () => {
      if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    };
  }, [call?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Call duration timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (!call || call.status !== "active" || !call.answered_at) return;

    const answeredMs = new Date(call.answered_at).getTime();
    const holdOffset = call.total_hold_seconds ?? 0;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - answeredMs) / 1000) - holdOffset;
      setCallSeconds(Math.max(0, elapsed));
    };
    tick();
    callTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [call?.status, call?.answered_at, call?.total_hold_seconds]);

  // ── Hold timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (!call || call.status !== "on_hold" || !call.hold_start) return;

    const startMs = new Date(call.hold_start).getTime();
    const tick = () => setHoldSeconds(Math.floor((Date.now() - startMs) / 1000));
    tick();
    holdTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, [call?.status, call?.hold_start]);

  // ── Billing (every 10s) ────────────────────────────────────────────────────────

  useEffect(() => {
    if (billingTimerRef.current) {
      clearInterval(billingTimerRef.current);
      billingTimerRef.current = null;
    }
    if (!call || call.status !== "active" || !call.answered_at || !user) return;

    billingTimerRef.current = setInterval(async () => {
      const elapsed = callSecondsRef.current;
      if (elapsed <= 0) return;

      await supabase.from("interpreter_calls").update({ billed_seconds: elapsed }).eq("id", callId);

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

    return () => {
      if (billingTimerRef.current) clearInterval(billingTimerRef.current);
    };
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
    // BUG 3 FIX: use <= 0 (not ===) so a timing skew can't let it slip past,
    // and gate on callEndedRef so we never call handleEndCall twice.
    if (minutesRemaining <= 0 && callSeconds > 0 && !callEndedRef.current) {
      console.log("[Minutes] Hit zero — ending call automatically");
      void handleEndCall();
    }
  }, [minutesRemaining, call?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleCancelCall = async () => {
    await supabase.from("interpreter_calls").update({ status: "cancelled" }).eq("id", callId);
    navigate({ to: "/dashboard/interpreter" } as never);
  };

  const handleCancelQueue = async () => {
    if (queueEntryId) {
      await supabase
        .from("interpreter_queue")
        .update({ status: "cancelled" })
        .eq("id", queueEntryId);
    }
    await supabase.from("interpreter_calls").update({ status: "cancelled" }).eq("id", callId);
    navigate({ to: "/dashboard" } as never);
  };

  const handleEndCall = async () => {
    if (!call || callEndedRef.current) return;
    callEndedRef.current = true;
    setIsEnding(true);

    // Stop polling immediately so it can't race the navigation below.
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    // Stop the billing interval so it doesn't fire while the DB update is in-flight.
    if (billingTimerRef.current) {
      clearInterval(billingTimerRef.current);
      billingTimerRef.current = null;
    }

    const billedSecs = callSecondsRef.current;
    const now = new Date().toISOString();
    console.log("[EndCall] Ending call:", callId, "| billedSecs:", billedSecs);

    /*
     * RLS NOTE — run once in Supabase SQL editor if the update fails with
     * a permissions error (code 42501 or empty data returned):
     *
     * DROP POLICY IF EXISTS "Client can end own call" ON interpreter_calls;
     * CREATE POLICY "Client can end own call" ON interpreter_calls
     *   FOR UPDATE USING (client_id = auth.uid());
     */
    const { data: updatedCall, error } = await supabase
      .from("interpreter_calls")
      .update({
        status: "completed",
        ended_at: now,
        billed_seconds: billedSecs,
      })
      .eq("id", callId)
      .select()
      .single();

    console.log("[EndCall] Update result:", { data: updatedCall, error });

    if (error) {
      console.error("[EndCall] FAILED:", error.message, error.code);
      toast.error("Failed: " + error.message);
      callEndedRef.current = false;
      setIsEnding(false);
      return;
    }

    const o = originalMinutesRef.current;
    if (o && user) {
      const usedMin = billedSecs / 60;
      const totalAvailable = o.free_minutes_remaining + o.paid_minutes_remaining;

      let free: number;
      let paid: number;

      if (usedMin >= totalAvailable) {
        free = 0;
        paid = 0;
      } else if (usedMin <= o.free_minutes_remaining) {
        free = Math.max(0, o.free_minutes_remaining - usedMin);
        paid = o.paid_minutes_remaining;
      } else {
        free = 0;
        paid = Math.max(0, o.paid_minutes_remaining - (usedMin - o.free_minutes_remaining));
      }

      console.log("[EndCall] Updating client_minutes — free:", free, "paid:", paid);

      await supabase
        .from("client_minutes")
        .update({ free_minutes_remaining: free, paid_minutes_remaining: paid })
        .eq("client_id", user.id);
    }

    console.log("[EndCall] Navigating to summary");
    window.location.href = `/dashboard/interpreter/${callId}/summary`;
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
    const reason = call.queue_reason ?? "none_online";

    if (reason === "unsupported_language") {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Language pair not yet supported</h2>
            <p className="text-sm text-muted-foreground">
              {formatLangPair(call.language_from, call.language_to)}
            </p>
            <p className="text-sm text-muted-foreground">
              We don't currently have interpreters for this language combination.
            </p>
            <p className="text-sm text-muted-foreground">
              Try a different language combination or contact our support team.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button onClick={() => navigate({ to: "/dashboard/interpreter" } as never)}>
              Try Different Languages
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => navigate({ to: "/dashboard/messages" } as never)}
            >
              Contact Support
            </Button>
          </div>
        </div>
      );
    }

    if (reason === "all_busy") {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Your interpreter is finishing another call</h2>
            <p className="text-sm text-muted-foreground">
              {formatLangPair(call.language_from, call.language_to)}
            </p>
            <p className="text-sm text-muted-foreground">
              An interpreter who speaks {formatLangPair(call.language_from, call.language_to)} is
              currently with another client.
            </p>
            <p className="text-sm text-muted-foreground">
              We'll notify you as soon as they're available.
            </p>
          </div>
          <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
            This usually takes a few minutes.
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" } as never)}>
              Back to Dashboard
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleCancelQueue}
            >
              Cancel &amp; Leave Queue
            </Button>
          </div>
        </div>
      );
    }

    // reason === "none_online"
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/60">
          <Moon className="h-10 w-10 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">No interpreter online right now</h2>
          <p className="text-sm text-muted-foreground">
            {formatLangPair(call.language_from, call.language_to)}
          </p>
          <p className="text-sm text-muted-foreground">
            We'll notify you when an interpreter for{" "}
            {formatLangPair(call.language_from, call.language_to)} comes online.
          </p>
        </div>
        <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          You'll receive a notification when an interpreter is ready. You can safely leave this
          page.
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" } as never)}>
            Back to Dashboard
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleCancelQueue}
          >
            Cancel &amp; Leave Queue
          </Button>
        </div>
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
            {formatLangPair(call.language_from, call.language_to)}
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
                <AvatarFallback className="text-lg">
                  {interpreterProfile.full_name[0]}
                </AvatarFallback>
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

        {call.daily_room_url ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-teal-500/30 p-[1.5px] shadow-2xl shadow-green-500/20">
            <div className="relative h-[26rem] w-full overflow-hidden rounded-[calc(1rem-1.5px)] bg-black">
              <iframe
                src={call.daily_room_url}
                allow="camera; microphone; fullscreen; autoplay; display-capture; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
                title="Video call"
              />
              <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                LIVE
              </span>
            </div>
          </div>
        ) : (
          <div className="relative flex h-[26rem] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/60 to-muted text-sm text-muted-foreground">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
              <Loader2 className="relative h-8 w-8 animate-spin text-green-500" />
            </div>
            <p className="font-medium">Connecting secure video…</p>
          </div>
        )}

        <Button size="lg" variant="destructive" className="w-full" onClick={handleEndCall} disabled={isEnding}>
          {isEnding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PhoneOff className="mr-2 h-4 w-4" />
          )}
          {isEnding ? "Ending..." : "End Call"}
        </Button>
      </div>
    );
  }

  return null;
}
