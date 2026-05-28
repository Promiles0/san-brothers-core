import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { checkQueueAndNotify } from "@/lib/interpreter/check-queue";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ForwardCallModal } from "@/components/staff/forward-call-modal";

// ── Types ──────────────────────────────────────────────────────────────────────

interface InterpreterCall {
  id: string;
  client_id: string;
  language_from: string;
  language_to: string;
  status: "ringing" | "active" | "on_hold" | "completed" | "cancelled" | "queued";
  interpreter_id: string | null;
  answered_at: string | null;
  ended_at: string | null;
  billed_seconds: number;
  hold_start: string | null;
  total_hold_seconds: number;
  forwarded_to: string | null;
  forwarded_at: string | null;
}

interface ClientProfile {
  id: string;
  full_name: string | null;
  profile_picture_url: string | null;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/staff/interpreter/$callId")({
  component: InterpreterCallScreen,
});

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

function InterpreterCallScreen() {
  const { callId } = Route.useParams();
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [call, setCall] = useState<InterpreterCall | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    void load();
    async function load() {
      const { data, error } = await supabase
        .from("interpreter_calls")
        .select("*")
        .eq("id", callId)
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }

      const c = data as InterpreterCall;
      setCall(c);

      const { data: clientData } = await supabase
        .from("users")
        .select("id,full_name,profile_picture_url")
        .eq("id", c.client_id)
        .single();
      if (clientData) setClientProfile(clientData as ClientProfile);

      setLoading(false);
    }
  }, [callId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime + polling ────────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel("staff-call-" + callId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "interpreter_calls",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          const updated = payload.new as InterpreterCall;
          console.log("[StaffCall] status update:", updated.status);
          if (updated.status === "completed" || updated.status === "cancelled") {
            console.log("[StaffCall] Call ended by client, navigating away");
            window.location.href = "/staff";
          }
          if (updated.status === "on_hold") {
            setCall(updated);
          }
        },
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("interpreter_calls")
        .select("status")
        .eq("id", callId)
        .single();

      console.log("[StaffCall] Poll status:", data?.status);

      if (data?.status === "completed" || data?.status === "cancelled") {
        clearInterval(poll);
        window.location.href = "/staff";
      }
    }, 5000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [callId]);

  // ── Duration timer ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (!call || call.status !== "active" || !call.answered_at) return;

    const answeredMs = new Date(call.answered_at).getTime();
    const holdOffset = call.total_hold_seconds ?? 0;
    const tick = () => {
      setCallSeconds(Math.max(0, Math.floor((Date.now() - answeredMs) / 1000) - holdOffset));
    };
    tick();
    callTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [call?.status, call?.answered_at, call?.total_hold_seconds]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleEndCall = async () => {
    if (isEnding) return;
    setIsEnding(true);

    const { data, error } = await supabase
      .from("interpreter_calls")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", callId)
      .select()
      .single();

    console.log("[StaffEndCall] result:", { data, error });

    if (error) {
      toast.error("Failed: " + error.message);
      setIsEnding(false);
      return;
    }

    if (profile?.id) {
      await supabase.from("users").update({ availability_status: "online" }).eq("id", profile.id);
      await refreshProfile();
      await checkQueueAndNotify(
        (profile.interpreter_languages as Array<{ from: string; to: string }>) || [],
        profile.id,
      );
    }

    window.location.href = "/staff";
  };

  const handleRelease = async () => {
    await supabase
      .from("interpreter_calls")
      .update({ status: "ringing", interpreter_id: null, answered_at: null })
      .eq("id", callId);

    if (profile?.id) {
      await supabase.from("users").update({ availability_status: "online" }).eq("id", profile.id);
      await refreshProfile();
      await checkQueueAndNotify(
        (profile.interpreter_languages as Array<{ from: string; to: string }>) || [],
        profile.id,
      );
    }

    navigate({ to: "/staff" } as never);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!call) return null;

  const clientFirstName = clientProfile?.full_name?.split(" ")[0] ?? "Client";

  return (
    <div className="mx-auto max-w-lg space-y-5 py-4">
      {/* Top bar: Active Call + green badge + timer */}
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-green-800 dark:text-green-300">
            Active Call
          </span>
          <Badge className="bg-green-500 text-white text-xs">LIVE</Badge>
        </div>
        <div className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-300">
          {fmt(callSeconds)}
        </div>
      </div>

      {/* Client info card */}
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar className="h-14 w-14">
            <AvatarImage src={clientProfile?.profile_picture_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-lg">
              {(clientFirstName[0] ?? "C").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{clientFirstName}</p>
            <p className="text-sm text-muted-foreground">
              {formatLangPair(call.language_from, call.language_to)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily.co placeholder */}
      <div className="flex min-h-52 items-center justify-center rounded-2xl bg-zinc-900 text-sm text-zinc-400">
        Video call will appear here — Daily.co integration pending
      </div>

      {/* Bottom action bar */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-300"
          onClick={() => setForwardModalOpen(true)}
        >
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Hold & Forward
        </Button>
        <Button variant="destructive" onClick={handleEndCall} disabled={isEnding}>
          {isEnding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PhoneOff className="mr-2 h-4 w-4" />
          )}
          {isEnding ? "Ending…" : "End Call"}
        </Button>
        <Button variant="outline" onClick={() => setReleaseDialogOpen(true)}>
          Release
        </Button>
      </div>

      {/* Release confirm dialog */}
      <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release this call?</AlertDialogTitle>
            <AlertDialogDescription>
              Release this call back to the pool? Another interpreter will take over.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease}>Release</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forward modal */}
      {call && profile && (
        <ForwardCallModal
          open={forwardModalOpen}
          onOpenChange={setForwardModalOpen}
          call={call}
          currentInterpreterName={profile.full_name ?? "Interpreter"}
          currentInterpreterId={profile.id}
          callId={callId}
        />
      )}
    </div>
  );
}
