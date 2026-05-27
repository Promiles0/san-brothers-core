import { useState, useEffect, useRef, type ReactNode } from "react";
import { Menu, ChevronRight, AlertTriangle, Phone, PhoneOff } from "lucide-react";
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

// ── Types ──────────────────────────────────────────────────────────────────────

interface IncomingCall {
  id: string;
  client_id: string;
  language_from: string;
  language_to: string;
  status?: string;
  hold_start?: string | null;
  total_hold_seconds?: number;
  forwarded_to?: string | null;
}

// ── useIncomingCall hook ───────────────────────────────────────────────────────

function useIncomingCall(
  profileId: string | undefined,
  isActiveInterpreter: boolean,
  interpreterLanguages: Array<{ from: string; to: string }> | null | undefined,
) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callerName, setCallerName] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a stable ref so polling closure always sees the latest value
  const incomingCallRef = useRef<IncomingCall | null>(null);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  const dismiss = () => {
    setIncomingCall(null);
    setCallerName(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    stopBeep();
  };

  function startBeep() {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const ring = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      };
      ring();
      beepIntervalRef.current = setInterval(ring, 1500);
    } catch {
      // Web Audio not available
    }
  }

  function stopBeep() {
    if (beepIntervalRef.current) { clearInterval(beepIntervalRef.current); beepIntervalRef.current = null; }
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
  }

  async function showCall(call: IncomingCall) {
    const { data } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", call.client_id)
      .single();
    const firstName = (data as { full_name: string } | null)?.full_name?.split(" ")[0] ?? null;
    setIncomingCall(call);
    setCallerName(firstName);
    startBeep();
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(dismiss, 30000);
  }

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!profileId) return;

    // FIX BUG 1: Subscribe to ALL INSERTs with NO filter — Supabase Realtime
    // does not reliably deliver INSERT events filtered by non-indexed columns
    // like `status`. Filter in JavaScript instead.
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
            // No server-side filter — JS filter below is reliable
          },
          async (payload) => {
            const call = payload.new as IncomingCall;
            console.log("[IncomingCall] INSERT received:", call);

            // JS filter 1: only ringing calls
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

            await showCall(call);
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
          await showCall(call);
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

    const poll = setInterval(async () => {
      // Don't show a second overlay if one is already up
      if (incomingCallRef.current) return;

      const { data, error } = await supabase
        .from("interpreter_calls")
        .select("*")
        .eq("status", "ringing")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.warn("[IncomingCall] Poll error:", error.message);
        return;
      }
      if (!data?.length) return;

      const match = data.find((call) =>
        interpreterLanguages.some(
          (pair) => pair.from === call.language_from && pair.to === call.language_to,
        ),
      );

      if (match) {
        console.log("[IncomingCall] Poll found ringing call (realtime missed it):", match);
        await showCall(match as IncomingCall);
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [isActiveInterpreter, interpreterLanguages]); // eslint-disable-line react-hooks/exhaustive-deps

  return { incomingCall, callerName, dismiss };
}

// ── IncomingCallOverlay ────────────────────────────────────────────────────────

function IncomingCallOverlay({
  call,
  callerName,
  profileId,
  onDismiss,
}: {
  call: IncomingCall;
  callerName: string | null;
  profileId: string;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);

  // FIX BUG 2: Proper error handling + logging so we can trace accept failures.
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
    onDismiss();
    console.log("[Accept] Navigating to interpreter screen for callId:", call.id);
    navigate({ to: "/staff/interpreter/$callId", params: { callId: call.id } } as never);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-background p-8 text-center shadow-2xl">
        {/* Pulsing ring */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute h-24 w-24 animate-ping rounded-full bg-green-500/30" />
          <div className="absolute h-18 w-18 animate-ping rounded-full bg-green-500/20 [animation-delay:400ms]" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-4 ring-green-500/40">
            <Phone className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Incoming Call
        </p>
        <h2 className="mt-1 text-2xl font-bold">
          {call.language_from} → {call.language_to}
        </h2>
        {callerName && (
          <p className="mt-1 text-sm text-muted-foreground">From {callerName}</p>
        )}

        <div className="mt-8 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            onClick={onDismiss}
            disabled={accepting}
          >
            <PhoneOff className="mr-2 h-4 w-4" />
            Decline
          </Button>
          <Button
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
            onClick={handleAccept}
            disabled={accepting}
          >
            <Phone className="mr-2 h-4 w-4" />
            {accepting ? "Connecting…" : "Accept"}
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
  const { profile, signOut } = useAuth();
  const { hasCapability } = useCapabilities();
  const navigate = useNavigate();

  const canHandleCalls = hasCapability("handle_live_calls");
  const isActiveInterpreter =
    canHandleCalls && profile?.interpreter_profile_complete === true;
  const interpreterLanguages = isActiveInterpreter
    ? (profile.interpreter_languages as Array<{ from: string; to: string }> | null)
    : null;
  const { incomingCall, callerName, dismiss } = useIncomingCall(
    isActiveInterpreter ? profile.id : undefined,
    isActiveInterpreter,
    interpreterLanguages,
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
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}

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
