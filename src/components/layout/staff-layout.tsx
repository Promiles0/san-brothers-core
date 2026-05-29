import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { Menu, ChevronRight, AlertTriangle, Phone, PhoneOff, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { StaffSidebar } from "@/components/layout/staff-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { InterpreterProfileModal } from "@/components/staff/interpreter-profile-modal";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { checkQueueAndNotify } from "@/lib/interpreter/check-queue";
import { createDailyRoom } from "@/lib/interpreter/daily-rooms";

// ── Types ──────────────────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  zh: "Chinese",
  rw: "Kinyarwanda",
  sw: "Kiswahili",
};

const formatLangName = (code: string) => LANGUAGE_NAMES[code] ?? code;

interface IncomingCall {
  id: string;
  client_id: string;
  language_from: string;
  language_to: string;
  status?: string;
  hold_start?: string | null;
  total_hold_seconds?: number;
  forwarded_to?: string | null;
  preferred_interpreter_id?: string | null;
}

// ── useIncomingCall hook ───────────────────────────────────────────────────────

function useIncomingCall(
  profileId: string | undefined,
  isActiveInterpreter: boolean,
  interpreterLanguages: Array<{ from: string; to: string }> | null | undefined,
  availabilityStatus: string | null | undefined,
  refreshProfile: () => Promise<void>,
) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callerName, setCallerName] = useState<string | null>(null);
  // BUG 2 FIX: track when browser blocks audio (no user-gesture) so the
  // overlay can show a "tap to enable sound" affordance.
  const [audioBlocked, setAudioBlocked] = useState(false);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable ref so polling closure always reads the latest incomingCall value.
  const incomingCallRef = useRef<IncomingCall | null>(null);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
  // Track accepted calls so a channel reconnect / poll replay never re-shows them.
  const acceptedCallIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId || !isActiveInterpreter || availabilityStatus !== "online" || !interpreterLanguages?.length) return;
    void checkQueueAndNotify(interpreterLanguages, profileId);
  }, [profileId, isActiveInterpreter, availabilityStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setIncomingCall(null);
    setCallerName(null);
    setAudioBlocked(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    stopBeep();
  };

  // ── Audio helpers ──────────────────────────────────────────────────────────

  /** Play one beep tick on an already-running AudioContext. */
  function doBeep(ctx: AudioContext) {
    const ring = () => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch { /* node already stopped */ }
    };
    ring();
    if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    beepIntervalRef.current = setInterval(ring, 1500);
  }

  /**
   * Attempt to start the ring tone.
   * If the browser blocks audio (no prior user gesture), sets audioBlocked=true
   * so the overlay can show the "tap to enable sound" hint.
   */
  function startBeep() {
    stopBeep();
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        // Browser requires a user gesture before audio can play.
        console.log("[Audio] AudioContext suspended — audio blocked by browser policy");
        setAudioBlocked(true);
        return;
      }
      setAudioBlocked(false);
      doBeep(ctx);
    } catch (err) {
      console.warn("[Audio] AudioContext creation failed:", err);
      setAudioBlocked(true);
    }
  }

  /**
   * Called when the user taps "Enable sound" on the overlay.
   * Resumes a suspended AudioContext and starts beeping.
   */
  function resumeAudio() {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      // No context created yet (e.g. overlay came from poll) — try fresh.
      startBeep();
      return;
    }
    void ctx.resume().then(() => {
      if (ctx.state === "running") {
        console.log("[Audio] AudioContext resumed after user gesture");
        setAudioBlocked(false);
        doBeep(ctx);
      }
    });
  }

  function stopBeep() {
    if (beepIntervalRef.current) { clearInterval(beepIntervalRef.current); beepIntervalRef.current = null; }
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
  }

  // ── showCall ───────────────────────────────────────────────────────────────
  // tryAudio=true  → called from Realtime (post-user-gesture path — audio OK)
  // tryAudio=false → called from poll (no gesture — audio blocked by browser)

  async function showCall(call: IncomingCall, tryAudio: boolean) {
    const { data } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", call.client_id)
      .single();
    const firstName = (data as { full_name: string } | null)?.full_name?.split(" ")[0] ?? null;
    setIncomingCall(call);
    setCallerName(firstName);
    if (tryAudio) {
      startBeep();
    } else {
      // Poll path: flag as blocked immediately — user must tap to enable sound.
      setAudioBlocked(true);
    }
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(dismiss, 30000);
  }

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!profileId) return;

    // Subscribe to ALL INSERTs — no server-side filter on `status` because
    // Supabase Realtime silently drops INSERT filters on non-indexed columns.
    let channel1: ReturnType<typeof supabase.channel> | null = null;
    if (interpreterLanguages?.length) {
      channel1 = supabase
        .channel("incoming-calls-" + profileId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "interpreter_calls",
            // No server-side filter — JS filters below are reliable.
          },
          async (payload) => {
            const call = payload.new as IncomingCall;
            console.log("[IncomingCall] INSERT received:", call);

            // JS filter 0: skip calls we already accepted (guards against channel-reconnect replay)
            if (acceptedCallIds.current.has(call.id)) return;

            // JS filter 1: only truly ringing calls
            if (call.status !== "ringing") {
              console.log("[IncomingCall] Skipping — status is not ringing:", call.status);
              return;
            }

            // JS filter 2: language pair must match this interpreter's pairs
            const isMatch = interpreterLanguages.some(
              (pair) => pair.from === call.language_from && pair.to === call.language_to,
            );
            console.log(
              "[IncomingCall] language match:", isMatch,
              "| interpreter pairs:", interpreterLanguages,
              "| call:", call.language_from, "->", call.language_to,
            );
            if (!isMatch) return;

            // JS filter 3: preferred interpreter routing — skip if call is directed at someone else
            if (call.preferred_interpreter_id && call.preferred_interpreter_id !== profileId) {
              console.log("[IncomingCall] Skipping — call directed to another interpreter:", call.preferred_interpreter_id);
              return;
            }

            // FIX 2: skip if this interpreter is already on a call
            const { data: myActiveCalls } = await supabase
              .from("interpreter_calls")
              .select("id")
              .eq("interpreter_id", profileId)
              .in("status", ["ringing", "active", "on_hold"])
              .limit(1);

            if ((myActiveCalls?.length ?? 0) > 0) {
              console.log("[IncomingCall] Already on a call, skipping");
              return;
            }

            // FIX 2: skip if not online (query DB directly — profile state may be stale)
            const { data: freshProfile } = await supabase
              .from("users")
              .select("availability_status")
              .eq("id", profileId)
              .single();

            if (freshProfile?.availability_status !== "online") {
              console.log("[IncomingCall] Not online, skipping");
              return;
            }

            // Realtime path fires in an event handler context (user was on the
            // page) — audio is allowed.
            await showCall(call, true);
          },
        )
        .subscribe((status) => {
          console.log("[IncomingCall] channel1 status:", status);
        });
    }

    // Channel 2: calls forwarded to this interpreter
    const channel2 = supabase
      .channel("forwarded-calls-" + profileId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "interpreter_calls",
          filter: `forwarded_to=eq.${profileId}`,
        },
        async (payload) => {
          const call = payload.new as IncomingCall;
          console.log("[ForwardedCall] UPDATE received:", call);
          if (call.status !== "on_hold") return;
          await showCall(call, true);
        },
      )
      .subscribe((status) => {
        console.log("[IncomingCall] channel2 (forwarded) status:", status);
      });

    return () => {
      if (channel1) void supabase.removeChannel(channel1);
      void supabase.removeChannel(channel2);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      stopBeep();
    };
  }, [profileId, interpreterLanguages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling fallback (every 5 s) ──────────────────────────────────────────
  // Guards against Supabase Realtime silently dropping events.
  useEffect(() => {
    if (!isActiveInterpreter || !interpreterLanguages?.length) return;

    let pollCount = 0;
    const poll = setInterval(async () => {
      pollCount++;
      if (pollCount % 6 === 0) {
        await refreshProfile();
      }

      // Don't show a second overlay if one is already up.
      if (incomingCallRef.current) return;

      const { data, error } = await supabase
        .from("interpreter_calls")
        .select("*")
        .eq("status", "ringing")
        // BUG 1 FIX: exclude calls that already have an interpreter assigned —
        // old accepted calls keep status='ringing' in edge cases and would
        // otherwise keep re-showing the overlay on every poll tick.
        .is("interpreter_id", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.warn("[IncomingCall] Poll error:", error.message);
        return;
      }
      if (!data?.length) return;

      const match = data.find(
        (call) =>
          interpreterLanguages.some(
            (pair) => pair.from === call.language_from && pair.to === call.language_to,
          ) &&
          (!call.preferred_interpreter_id || call.preferred_interpreter_id === profileId),
      );

      if (match && !incomingCallRef.current && !acceptedCallIds.current.has(match.id)) {
        // FIX 2: skip if this interpreter is already on a call
        const { data: myActiveCalls } = await supabase
          .from("interpreter_calls")
          .select("id")
          .eq("interpreter_id", profileId)
          .in("status", ["ringing", "active", "on_hold"])
          .limit(1);

        if ((myActiveCalls?.length ?? 0) > 0) {
          console.log("[IncomingCall] Poll: Already on a call, skipping");
          return;
        }

        // FIX 2: skip if not online (query DB directly — profile state may be stale)
        const { data: freshProfile } = await supabase
          .from("users")
          .select("availability_status")
          .eq("id", profileId)
          .single();

        if (freshProfile?.availability_status !== "online") {
          console.log("[IncomingCall] Poll: Not online, skipping");
          return;
        }

        console.log("[IncomingCall] Poll found ringing call (realtime missed it):", match);
        // Poll fires without a user gesture — don't attempt audio.
        await showCall(match as IncomingCall, false);
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [isActiveInterpreter, interpreterLanguages]); // eslint-disable-line react-hooks/exhaustive-deps

  function markAccepted(id: string) {
    acceptedCallIds.current.add(id);
  }

  return { incomingCall, callerName, dismiss, markAccepted, audioBlocked, resumeAudio };
}

// ── IncomingCallOverlay ────────────────────────────────────────────────────────

function IncomingCallOverlay({
  call,
  callerName,
  profileId,
  audioBlocked,
  onEnableAudio,
  onMarkAccepted,
  onDismiss,
}: {
  call: IncomingCall;
  callerName: string | null;
  profileId: string;
  audioBlocked: boolean;
  onEnableAudio: () => void;
  onMarkAccepted: (id: string) => void;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (accepting) return; // prevent double-tap
    setAccepting(true);
    console.log("[Accept] Attempting to accept call:", call.id, "profileId:", profileId);

    const now = new Date().toISOString();
    const isForwarded = call.hold_start != null;
    const holdElapsed = isForwarded
      ? Math.floor((Date.now() - new Date(call.hold_start!).getTime()) / 1000)
      : 0;

    const updatePayload = {
      interpreter_id: profileId,
      status: "active",
      answered_at: now,
      ...(isForwarded && {
        forwarded_to: null,
        hold_start: null,
        total_hold_seconds: (call.total_hold_seconds ?? 0) + holdElapsed,
      }),
    };

    console.log("[Accept] Sending UPDATE:", updatePayload, "for call id:", call.id);

    const { error, data } = await supabase
      .from("interpreter_calls")
      .update(updatePayload)
      .eq("id", call.id)
      .select()
      .single();

    if (error) {
      console.error("[Accept] UPDATE failed:", error);
      toast.error("Could not accept call: " + error.message);
      setAccepting(false);
      return;
    }

    console.log("[Accept] UPDATE succeeded, row returned:", data);

    // FIX 4: mark interpreter as busy so new callers don't see them as available
    await supabase.from("users").update({ availability_status: "busy" }).eq("id", profileId);

    // Create Daily.co room and persist the URL so both sides can join
    const room = await createDailyRoom(call.id);
    if (room) {
      await supabase
        .from("interpreter_calls")
        .update({ daily_room_url: room.url, daily_room_name: room.name })
        .eq("id", call.id);
      console.log("[Daily] Room created:", room.url);
    }

    onMarkAccepted(call.id);
    onDismiss();
    console.log("[Accept] Navigating to interpreter screen for callId:", call.id);
    navigate({ to: "/staff/interpreter/$callId", params: { callId: call.id } } as never);
  };

  const flagFor = (code: string): string => {
    const map: Record<string, string> = {
      EN: "🇬🇧",
      FR: "🇫🇷",
      ZH: "🇨🇳",
      RW: "🇷🇼",
      SW: "🇰🇪",
      KS: "🇰🇪",
    };
    return map[code?.toUpperCase()] ?? "🌐";
  };

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-green-500/30 bg-background p-10 text-center shadow-2xl shadow-green-500/20 animate-in zoom-in-95 duration-300">
        {/* Dramatic pulsing rings */}
        <div className="relative mx-auto mb-8 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/40" />
          <div className="absolute inset-2 animate-ping rounded-full bg-green-500/30 [animation-delay:300ms]" />
          <div className="absolute inset-4 animate-ping rounded-full bg-green-500/20 [animation-delay:600ms]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50 ring-4 ring-green-400/60">
            <Phone className="h-9 w-9 text-white" />
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-600 dark:text-green-400">
          ● Incoming Call
        </p>

        {/* Language pair with prominent flags */}
        <div className="mt-4 flex items-center justify-center gap-3 text-3xl font-bold">
          <span className="flex items-center gap-2">
            <span className="text-4xl leading-none">{flagFor(call.language_from)}</span>
            <span>{call.language_from}</span>
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="flex items-center gap-2">
            <span className="text-4xl leading-none">{flagFor(call.language_to)}</span>
            <span>{call.language_to}</span>
          </span>
        </div>

        {callerName && (
          <p className="mt-3 text-sm text-muted-foreground">From <span className="font-medium text-foreground">{callerName}</span></p>
        )}

        {audioBlocked && (
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={onEnableAudio}
          >
            <Volume2 className="h-3 w-3" />
            Tap to enable sound
          </button>
        )}

        <div className="mt-9 flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-14 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={onDismiss}
            disabled={accepting}
          >
            <PhoneOff className="mr-2 h-5 w-5" />
            Decline
          </Button>
          <Button
            size="lg"
            className="h-14 flex-[1.5] bg-gradient-to-r from-green-500 to-emerald-600 text-base font-semibold text-white shadow-lg shadow-green-600/40 hover:from-green-600 hover:to-emerald-700"
            onClick={handleAccept}
            disabled={accepting}
          >
            <Phone className="mr-2 h-5 w-5" />
            {accepting ? "Connecting…" : "Accept Call"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StaffLayout({
  children,
  breadcrumbs = ["Staff", "Home"],
}: {
  children: ReactNode;
  breadcrumbs?: string[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { profile, signOut, refreshProfile } = useAuth();
  const { hasCapability } = useCapabilities();
  const navigate = useNavigate();

  const canHandleCalls = hasCapability("handle_live_calls");
  const isActiveInterpreter =
    canHandleCalls && profile?.interpreter_profile_complete === true;
  // Memoize so the array reference is stable — prevents the Supabase channel
  // from being torn down and recreated on every render.
  const interpreterLanguages = useMemo(
    () =>
      isActiveInterpreter
        ? (profile?.interpreter_languages as Array<{ from: string; to: string }> | null)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActiveInterpreter, profile?.id],
  );
  const { incomingCall, callerName, dismiss, markAccepted, audioBlocked, resumeAudio } = useIncomingCall(
    isActiveInterpreter ? profile?.id : undefined,
    isActiveInterpreter,
    interpreterLanguages,
    profile?.availability_status,
    refreshProfile,
  );
  const sidebarLabel = "San Brothers — Staff";
  const sidebarBadge = "SB";
  const initial = (profile?.full_name?.[0] ?? profile?.email?.[0] ?? "S").toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
            {sidebarBadge}
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">{sidebarLabel}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <StaffSidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border p-4">
                <SheetTitle>Staff</SheetTitle>
              </SheetHeader>
              <StaffSidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={i === breadcrumbs.length - 1 ? "text-foreground" : ""}>{b}</span>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="capitalize">
                  {profile?.full_name ?? profile?.role}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/staff/settings" })}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {canHandleCalls && !profile?.interpreter_profile_complete && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Complete your interpreter profile</strong> — Tell us which languages you
                interpret so clients can find you.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
              onClick={() => setProfileModalOpen(true)}
            >
              Complete Profile →
            </Button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <InterpreterProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />

      {incomingCall && profile && (
        <IncomingCallOverlay
          call={incomingCall}
          callerName={callerName}
          profileId={profile.id}
          audioBlocked={audioBlocked}
          onEnableAudio={resumeAudio}
          onMarkAccepted={markAccepted}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}

/*
 * ── Schema migration — run once in Supabase SQL Editor ────────────────────────
 *
 * ALTER TABLE interpreter_calls
 *    ADD COLUMN IF NOT EXISTS preferred_interpreter_id uuid references users(id);
 */

/*
 * ── RLS POLICY — run once in Supabase SQL Editor ──────────────────────────────
 *
 * This allows any staff member with the `handle_live_calls` capability to
 * UPDATE a ringing call (claim it). Without this, the UPDATE silently succeeds
 * client-side but is rolled back by RLS, leaving the call in `ringing` forever.
 *
 * DROP POLICY IF EXISTS "Interpreter can update calls" ON interpreter_calls;
 * CREATE POLICY "Interpreter can update calls" ON interpreter_calls
 *   FOR UPDATE USING (
 *     EXISTS (
 *       SELECT 1 FROM staff_capabilities
 *       WHERE user_id = auth.uid()
 *       AND capability = 'handle_live_calls'
 *     )
 *   );
 */
