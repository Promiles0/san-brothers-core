import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Headphones,
  Loader as Loader2,
  Sparkles,
  Star,
  Phone,
  Languages,
  Clock,
  ChevronRight,
  CircleCheck as CheckCircle2,
  Mic,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripePaymentForm } from "@/components/payments/stripe-payment-form";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClientMinutes {
  client_id: string;
  free_minutes_remaining: number;
  paid_minutes_remaining: number;
}

interface SupportedLanguage {
  id: string;
  code: string;
  name_en: string;
  name_native: string;
  flag_emoji: string;
}

interface MinutePackage {
  id: string;
  tab: string;
  tier: string;
  minutes: number;
  price_usd: number;
  label: string;
  savings_percent: number;
  is_highlighted: boolean;
}

interface PreferredInterpreter {
  id: string;
  full_name: string;
  profile_picture_url: string | null;
  availability_status: string;
  lastLangFrom: string | undefined;
  lastLangTo: string | undefined;
}

interface CallHistoryRow {
  id: string;
  language_from: string;
  language_to: string;
  created_at: string;
  minutes_deducted: number | null;
  billed_seconds: number | null;
  rating: number | null;
  status: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TAB_ORDER = ["pay-as-you-go", "daily", "monthly", "yearly"];
const TAB_LABELS: Record<string, string> = {
  "pay-as-you-go": "Pay as you go",
  daily: "Daily",
  monthly: "Monthly",
  yearly: "Yearly",
};

const BALANCE_VISUAL_MAX = 200;

const STATIC_PACKAGES = [
  {
    id: "s60",
    minutes: 60,
    price_usd: 12,
    label: "60 min",
    perMin: 0.2,
    badge: null,
    highlighted: false,
  },
  {
    id: "s200",
    minutes: 200,
    price_usd: 35,
    label: "200 min",
    perMin: 0.175,
    badge: "Most Popular",
    highlighted: true,
  },
  {
    id: "s500",
    minutes: 500,
    price_usd: 80,
    label: "500 min",
    perMin: 0.16,
    badge: null,
    highlighted: false,
  },
  {
    id: "s1000",
    minutes: 1000,
    price_usd: 150,
    label: "1000 min",
    perMin: 0.15,
    badge: "Best Value",
    highlighted: false,
  },
];

function fmtMinutes(m: number): string {
  return Number.isInteger(m) ? String(m) : m.toFixed(1);
}

function fmtDuration(row: CallHistoryRow): string {
  if (row.minutes_deducted) return `${Math.ceil(row.minutes_deducted)} min`;
  if (row.billed_seconds) return `${Math.ceil(row.billed_seconds / 60)} min`;
  return "—";
}

function normalizeTab(tab: string): string {
  return tab.toLowerCase().replace(/\s+/g, "-");
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Availability check ────────────────────────────────────────────────────────

type AvailabilityResult =
  | { available: true }
  | { available: false; reason: "all_busy" }
  | { available: false; reason: "none_online" }
  | { available: false; reason: "unsupported_language" };

const checkAvailability = async (langFrom: string, langTo: string): Promise<AvailabilityResult> => {
  const { data: capableStaff, error: capError } = await supabase
    .from("staff_capabilities")
    .select("user_id")
    .eq("capability", "handle_live_calls");

  if (capError || !capableStaff?.length)
    return { available: false, reason: "unsupported_language" };

  const staffIds = capableStaff.map((s: { user_id: string }) => s.user_id);

  const { data: allStaff } = await supabase
    .from("users")
    .select(
      "id, full_name, interpreter_languages, availability_status, interpreter_profile_complete",
    )
    .in("id", staffIds);

  type StaffRow = {
    id: string;
    full_name: string;
    interpreter_languages: Array<{ from: string; to: string }> | null;
    availability_status: string;
    interpreter_profile_complete: boolean;
  };

  const langCapable = ((allStaff ?? []) as StaffRow[]).filter(
    (s) =>
      s.interpreter_profile_complete === true &&
      s.interpreter_languages?.some((pair) => pair.from === langFrom && pair.to === langTo),
  );

  if (!langCapable.length) return { available: false, reason: "unsupported_language" };

  const onlineStaff = langCapable.filter((s) => s.availability_status === "online");
  if (!onlineStaff.length) return { available: false, reason: "none_online" };

  const { data: activeCalls } = await supabase
    .from("interpreter_calls")
    .select("interpreter_id")
    .in("status", ["ringing", "active", "on_hold"]);

  const busyIds = new Set(
    (activeCalls ?? [])
      .map((c: { interpreter_id: string | null }) => c.interpreter_id)
      .filter(Boolean),
  );

  const trulyAvailable = onlineStaff.filter((staff) => !busyIds.has(staff.id));
  if (!trulyAvailable.length) return { available: false, reason: "all_busy" };

  return { available: true };
};

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/interpreter")({
  validateSearch: (search: Record<string, unknown>) => ({
    interpreterId: typeof search.interpreterId === "string" ? search.interpreterId : undefined,
    language_from: typeof search.language_from === "string" ? search.language_from : undefined,
    language_to: typeof search.language_to === "string" ? search.language_to : undefined,
  }),
  component: InterpreterPage,
});

function InterpreterPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <InterpreterLandingPage />;
}

// ── Main landing page ─────────────────────────────────────────────────────────

function InterpreterLandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { interpreterId, language_from, language_to } = Route.useSearch();

  const [dataLoading, setDataLoading] = useState(true);
  const [minutes, setMinutes] = useState<ClientMinutes | null>(null);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [packages, setPackages] = useState<MinutePackage[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistoryRow[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(0);

  const [langFrom, setLangFrom] = useState("");
  const [langTo, setLangTo] = useState("");
  const [langError, setLangError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [payPkg, setPayPkg] = useState<MinutePackage | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);

  const [preferredInterp, setPreferredInterp] = useState<PreferredInterpreter | null>(null);
  const [preferredInterpLoading, setPreferredInterpLoading] = useState(false);
  const [showPreferredCard, setShowPreferredCard] = useState(true);
  const normalFlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("client_minutes").select("*").eq("client_id", user.id).maybeSingle(),
      supabase
        .from("supported_languages")
        .select("id,code,name_en,name_native,flag_emoji")
        .order("name_en", { ascending: true }),
      supabase.from("minute_packages").select("*").order("price_usd", { ascending: true }),
      supabase
        .from("interpreter_calls")
        .select(
          "id,language_from,language_to,created_at,minutes_deducted,billed_seconds,rating,status",
        )
        .eq("client_id", user.id)
        .in("status", ["completed", "ended"])
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("staff_capabilities").select("user_id").eq("capability", "handle_live_calls"),
    ]).then(async ([minutesRes, langsRes, pkgsRes, historyRes, capRes]) => {
      if (!minutesRes.error) setMinutes((minutesRes.data as ClientMinutes) ?? null);
      if (!langsRes.error) setLanguages((langsRes.data as SupportedLanguage[]) ?? []);
      if (!pkgsRes.error) setPackages((pkgsRes.data as MinutePackage[]) ?? []);
      if (!historyRes.error) setCallHistory((historyRes.data as CallHistoryRow[]) ?? []);

      if (!capRes.error && capRes.data?.length) {
        const ids = capRes.data.map((s: { user_id: string }) => s.user_id);
        const { data: onlineStaff } = await supabase
          .from("users")
          .select("id,availability_status")
          .in("id", ids)
          .eq("availability_status", "online");
        setOnlineCount(onlineStaff?.length ?? 0);
      }

      setDataLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (language_from) setLangFrom(language_from);
    if (language_to) setLangTo(language_to);
  }, [language_from, language_to]);

  useEffect(() => {
    if (!interpreterId || !user) return;
    setPreferredInterpLoading(true);
    void (async () => {
      const [interpRes, lastCallRes] = await Promise.all([
        supabase
          .from("users")
          .select("id,full_name,profile_picture_url,availability_status")
          .eq("id", interpreterId)
          .single(),
        supabase
          .from("interpreter_calls")
          .select("language_from,language_to")
          .eq("client_id", user.id)
          .eq("interpreter_id", interpreterId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (interpRes.data) {
        const lastFrom = lastCallRes.data?.language_from;
        const lastTo = lastCallRes.data?.language_to;
        setPreferredInterp({
          ...(interpRes.data as Omit<PreferredInterpreter, "lastLangFrom" | "lastLangTo">),
          lastLangFrom: lastFrom ?? undefined,
          lastLangTo: lastTo ?? undefined,
        });
        if (lastFrom) setLangFrom(lastFrom);
        if (lastTo) setLangTo(lastTo);
      }
      setPreferredInterpLoading(false);
    })();
  }, [interpreterId, user]);

  const freeMinutes = minutes?.free_minutes_remaining ?? 0;
  const paidMinutes = minutes?.paid_minutes_remaining ?? 0;
  const totalMinutes = freeMinutes + paidMinutes;

  type PageState = "loading" | "first_time" | "has_minutes" | "no_minutes";
  const pageState: PageState = dataLoading
    ? "loading"
    : freeMinutes > 0
      ? "first_time"
      : paidMinutes > 0
        ? "has_minutes"
        : "no_minutes";

  const packagesByTab = packages.reduce<Record<string, MinutePackage[]>>((acc, pkg) => {
    const key = normalizeTab(pkg.tab);
    (acc[key] ??= []).push(pkg);
    return acc;
  }, {});
  const availableTabs = TAB_ORDER.filter((t) => (packagesByTab[t]?.length ?? 0) > 0);

  const clearLangError = () => setLangError(null);

  const validateLangs = (): boolean => {
    if (!langFrom || !langTo) {
      setLangError("Please select both languages.");
      return false;
    }
    if (langFrom === langTo) {
      setLangError("From and To must be different languages.");
      return false;
    }
    setLangError(null);
    return true;
  };

  const handleStartCall = async (preferredInterpreterId?: string) => {
    if (!validateLangs() || !user) return;
    setStarting(true);
    try {
      const result = await checkAvailability(langFrom, langTo);

      if (!result.available) {
        const { data: callRow, error: callError } = await supabase
          .from("interpreter_calls")
          .insert({
            client_id: user.id,
            language_from: langFrom,
            language_to: langTo,
            status: "queued",
            is_free_call: freeMinutes > 0,
            queue_reason: result.reason,
          })
          .select()
          .single();

        if (callError) {
          toast.error("Could not start call: " + callError.message);
          setStarting(false);
          return;
        }

        if (result.reason !== "unsupported_language") {
          await supabase.from("interpreter_queue").insert({
            client_id: user.id,
            language_from: langFrom,
            language_to: langTo,
            status: "waiting",
            queued_at: new Date().toISOString(),
            queue_reason: result.reason,
          });
        }
        setStarting(false);
        navigate({
          to: "/dashboard/interpreter/$callId",
          params: { callId: (callRow as { id: string }).id },
        } as never);
        return;
      }

      const { data, error } = await supabase
        .from("interpreter_calls")
        .insert({
          client_id: user.id,
          language_from: langFrom,
          language_to: langTo,
          status: "ringing",
          is_free_call: freeMinutes > 0,
          ...(preferredInterpreterId ? { preferred_interpreter_id: preferredInterpreterId } : {}),
        })
        .select()
        .single();

      if (error) {
        toast.error("Could not start call: " + error.message);
        setStarting(false);
        return;
      }

      setStarting(false);
      navigate({
        to: "/dashboard/interpreter/$callId",
        params: { callId: (data as { id: string }).id },
      } as never);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setStarting(false);
    }
  };

  const handlePurchase = async (pkg: MinutePackage) => {
    if (!user) return;
    setPayPkg(pkg);
    setIsPreparingPayment(true);
    setClientSecret(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Please sign in to continue.");
        setPayPkg(null);
        return;
      }
      const response = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind: "minute_package",
          minute_package_id: pkg.id,
          metadata: {
            client_id: user.id,
            minutes: String(pkg.minutes),
          },
        }),
      });
      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        toast.error("Failed to prepare payment. Please try again.");
        setPayPkg(null);
      }
    } catch (err) {
      console.error("Payment preparation error:", err);
      toast.error("Failed to prepare payment. Please try again.");
      setPayPkg(null);
    } finally {
      setIsPreparingPayment(false);
    }
  };

  const finalizePurchase = async (pkg: MinutePackage, intentId: string) => {
    if (!user) return;
    setPurchasing(pkg.id);
    setPayPkg(null);
    try {
      const newPaid = paidMinutes + pkg.minutes;
      const { error } = await supabase.from("client_minutes").upsert(
        {
          client_id: user.id,
          free_minutes_remaining: freeMinutes,
          paid_minutes_remaining: newPaid,
        },
        { onConflict: "client_id" },
      );
      if (error) throw error;
      await supabase.from("payments").insert({
        client_id: user.id,
        amount_rwf: pkg.price_usd,
        currency: "USD",
        method: "stripe",
        status: "completed",
        reference: intentId,
      });
      setMinutes({
        client_id: user.id,
        free_minutes_remaining: freeMinutes,
        paid_minutes_remaining: newPaid,
      });
      toast.success(`${pkg.minutes} minutes added to your account!`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPurchasing(null);
    }
  };

  const isPreferredAvailable = preferredInterp?.availability_status === "online";
  const showNormalFlow =
    !interpreterId || !showPreferredCard || !preferredInterp || !isPreferredAvailable;

  const callNowLabel =
    pageState === "first_time"
      ? `Start Free Call →`
      : pageState === "has_minutes"
        ? "Call Now →"
        : "Call Now →";

  const callButtonClass =
    pageState === "first_time"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  if (pageState === "loading") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Live Interpreter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect instantly with a professional interpreter in seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT (3/5) ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Preferred interpreter card */}
          {interpreterId && preferredInterpLoading && <Skeleton className="h-48 rounded-xl" />}

          {interpreterId &&
            !preferredInterpLoading &&
            preferredInterp &&
            showPreferredCard &&
            (isPreferredAvailable ? (
              <div className="rounded-xl p-[1.5px] bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-lg shadow-green-500/20">
                <div className="bg-card rounded-[calc(0.75rem-1.5px)] p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={preferredInterp.profile_picture_url ?? undefined} />
                      <AvatarFallback>{preferredInterp.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{preferredInterp.full_name}</p>
                      <p className="text-xs text-muted-foreground">Your previous interpreter</p>
                    </div>
                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                      Available
                    </Badge>
                  </div>
                  <LanguagePair
                    languages={languages}
                    langFrom={langFrom}
                    langTo={langTo}
                    error={langError}
                    onFromChange={(v) => {
                      setLangFrom(v);
                      clearLangError();
                    }}
                    onToChange={(v) => {
                      setLangTo(v);
                      clearLangError();
                    }}
                  />
                  <Button
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStartCall(interpreterId)}
                    disabled={starting}
                  >
                    {starting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      `Call ${preferredInterp.full_name} Again →`
                    )}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground hover:underline underline-offset-2"
                    onClick={() => setShowPreferredCard(false)}
                  >
                    Or find a different interpreter
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/60 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={preferredInterp.profile_picture_url ?? undefined} />
                    <AvatarFallback>{preferredInterp.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      {preferredInterp.full_name}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Currently unavailable
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100"
                  onClick={() => normalFlowRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  Find Another Interpreter
                </Button>
              </div>
            ))}

          {/* Main call card */}
          <div ref={normalFlowRef}>
            {showNormalFlow && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Card top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-green-400" />

                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10">
                        <span className="absolute inset-0 rounded-xl animate-ping bg-blue-500/10" />
                        <Mic className="relative h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h2 className="font-bold text-foreground text-lg">Live Interpreter</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-muted-foreground">
                            {onlineCount > 0
                              ? `${onlineCount} interpreter${onlineCount !== 1 ? "s" : ""} available now`
                              : "Checking availability…"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {pageState === "first_time" && (
                      <div className="relative overflow-hidden rounded-full bg-green-600 px-3 py-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        <span className="relative flex items-center gap-1.5 text-xs font-bold text-white">
                          <Sparkles className="h-3 w-3" />
                          {fmtMinutes(freeMinutes)} FREE MINUTES
                        </span>
                      </div>
                    )}
                  </div>

                  {pageState === "no_minutes" && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-950/60">
                      <Headphones className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-800 dark:text-amber-200">
                        You've used your free minutes — buy minutes below to continue calling.
                      </span>
                    </div>
                  )}

                  {/* Language selection */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Select languages
                    </p>
                    <LanguagePair
                      languages={languages}
                      langFrom={langFrom}
                      langTo={langTo}
                      error={langError}
                      disabled={pageState === "no_minutes"}
                      onFromChange={(v) => {
                        setLangFrom(v);
                        clearLangError();
                      }}
                      onToChange={(v) => {
                        setLangTo(v);
                        clearLangError();
                      }}
                    />
                  </div>

                  {/* CTA button */}
                  <Button
                    size="lg"
                    className={cn("w-full text-sm font-semibold h-12", callButtonClass)}
                    onClick={() => handleStartCall()}
                    disabled={starting || pageState === "no_minutes"}
                  >
                    {starting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        <Phone className="mr-2 h-4 w-4" />
                        {callNowLabel}
                      </>
                    )}
                  </Button>

                  {pageState === "first_time" && (
                    <p className="text-center text-xs text-muted-foreground">
                      First {fmtMinutes(freeMinutes)} minutes free · No card needed
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-5">How it works</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Languages, step: 1, title: "Choose languages", time: "10 seconds" },
                { icon: Zap, step: 2, title: "Get matched", time: "30 seconds" },
                { icon: Phone, step: 3, title: "Start talking", time: "Instant" },
              ].map((item, i, arr) => (
                <div key={item.step} className="relative flex flex-col items-center text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 mb-2">
                    <item.icon className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                  {i < arr.length - 1 && (
                    <ChevronRight className="absolute right-0 top-3 h-4 w-4 text-muted-foreground -translate-x-1 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Call history */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Recent Calls
              </h2>
            </div>
            {callHistory.length === 0 ? (
              <div className="py-10 text-center">
                <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">No calls yet.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Start your first free call!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {callHistory.map((call) => {
                  const from = languages.find((l) => l.code === call.language_from);
                  const to = languages.find((l) => l.code === call.language_to);
                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
                        <span className="text-base">{from?.flag_emoji ?? "🌐"}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-base">{to?.flag_emoji ?? "🌐"}</span>
                        <div className="ml-2 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {from?.name_en ?? call.language_from} →{" "}
                            {to?.name_en ?? call.language_to}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {fmtDate(call.created_at)} · {fmtDuration(call)}
                          </p>
                        </div>
                      </div>
                      {call.rating != null && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < call.rating!
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground",
                              )}
                            />
                          ))}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        onClick={() => {
                          setLangFrom(call.language_from);
                          setLangTo(call.language_to);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Call Again
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Minute balance */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Your Balance
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center">
                <p
                  className="text-4xl font-black text-foreground tabular-nums"
                  style={{
                    textShadow: totalMinutes > 0 ? "0 0 20px rgba(59,130,246,0.3)" : undefined,
                  }}
                >
                  {fmtMinutes(totalMinutes)}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">minutes remaining</p>
                {freeMinutes > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                    {fmtMinutes(freeMinutes)} free + {fmtMinutes(paidMinutes)} paid
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                    style={{
                      width: `${Math.min((totalMinutes / BALANCE_VISUAL_MAX) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {totalMinutes > 0
                    ? `${Math.round((totalMinutes / BALANCE_VISUAL_MAX) * 100)}% of ${BALANCE_VISUAL_MAX} min reference`
                    : "No minutes remaining"}
                </p>
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() =>
                  document.getElementById("buy-minutes")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                + Buy More Minutes
              </Button>
            </div>
          </div>

          {/* Pricing packages */}
          <div id="buy-minutes" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                Minute Packages
              </h3>
            </div>
            <div className="p-4">
              {availableTabs.length > 0 ? (
                // DB packages exist
                <div className="grid grid-cols-2 gap-3">
                  {(packagesByTab[availableTabs[0]] ?? []).slice(0, 4).map((pkg, i) => (
                    <DbPkgCard
                      key={pkg.id}
                      pkg={pkg}
                      purchasing={purchasing}
                      onPurchase={handlePurchase}
                      staggerIdx={i}
                    />
                  ))}
                </div>
              ) : (
                // Static fallback packages
                <div className="grid grid-cols-2 gap-3">
                  {STATIC_PACKAGES.map((pkg, i) => (
                    <StaticPkgCard
                      key={pkg.id}
                      pkg={pkg}
                      staggerIdx={i}
                      onPurchase={() => {
                        const fakePkg: MinutePackage = {
                          id: pkg.id,
                          tab: "pay-as-you-go",
                          tier: "",
                          minutes: pkg.minutes,
                          price_usd: pkg.price_usd,
                          label: pkg.label,
                          savings_percent: 0,
                          is_highlighted: pkg.highlighted,
                        };
                        handlePurchase(fakePkg);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quality promise */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Our Promise
            </h3>
            <ul className="space-y-2">
              {[
                "Certified interpreters",
                "15+ languages supported",
                "Available 24/7",
                "HD audio quality",
                "Secure & confidential",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog
        open={!!payPkg}
        onOpenChange={(o: boolean) => {
          if (!o) {
            setPayPkg(null);
            setClientSecret(null);
          }
        }}
      >
        <DialogContent className="w-full max-w-xl border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Buy minutes</DialogTitle>
          </DialogHeader>
          {payPkg && (
            <div className="relative min-h-[400px]">
              {isPreparingPayment ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm rounded-xl border">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Preparing secure checkout...</p>
                </div>
              ) : clientSecret ? (
                <StripePaymentForm
                  amount={payPkg.price_usd}
                  clientSecret={clientSecret}
                  serviceTitle={`Interpreter Minutes — ${payPkg.label}`}
                  description={`${payPkg.minutes} minutes`}
                  metadata={{
                    client_id: user?.id ?? "",
                    package_id: payPkg.id,
                    minutes: String(payPkg.minutes),
                  }}
                  onSuccess={(intentId: string) => finalizePurchase(payPkg, intentId)}
                  onCancel={() => {
                    setPayPkg(null);
                    setClientSecret(null);
                  }}
                />
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Language pair dropdowns ────────────────────────────────────────────────────

function LanguagePair({
  languages,
  langFrom,
  langTo,
  error,
  onFromChange,
  onToChange,
  disabled = false,
}: {
  languages: SupportedLanguage[];
  langFrom: string;
  langTo: string;
  error: string | null;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">From language</Label>
          <Select value={langFrom} onValueChange={onFromChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} disabled={lang.code === langTo}>
                  {lang.flag_emoji} {lang.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To language</Label>
          <Select value={langTo} onValueChange={onToChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} disabled={lang.code === langFrom}>
                  {lang.flag_emoji} {lang.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Package cards ──────────────────────────────────────────────────────────────

function DbPkgCard({
  pkg,
  purchasing,
  onPurchase,
  staggerIdx,
}: {
  pkg: MinutePackage;
  purchasing: string | null;
  onPurchase: (pkg: MinutePackage) => void;
  staggerIdx: number;
}) {
  const isLoading = purchasing === pkg.id;
  const perMin = pkg.minutes > 0 ? (pkg.price_usd / pkg.minutes).toFixed(3) : null;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        pkg.is_highlighted
          ? "border-blue-500/60 bg-blue-500/5 ring-1 ring-blue-500/30"
          : "border-border hover:border-blue-400/50",
      )}
      style={{ animationDelay: `${staggerIdx * 80}ms` }}
    >
      {pkg.is_highlighted && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
            Most Popular
          </span>
        </div>
      )}
      {pkg.savings_percent > 0 && (
        <span className="w-fit rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-300">
          Save {pkg.savings_percent}%
        </span>
      )}
      <div>
        <p className="text-xl font-black text-foreground tabular-nums">
          {pkg.minutes}
          <span className="text-xs font-normal text-muted-foreground ml-1">min</span>
        </p>
        <p className="text-base font-bold text-foreground">${pkg.price_usd.toFixed(2)}</p>
        {perMin && <p className="text-[10px] text-muted-foreground">${perMin}/min</p>}
      </div>
      <Button
        size="sm"
        variant={pkg.is_highlighted ? "default" : "outline"}
        className="mt-auto w-full text-xs h-7"
        disabled={purchasing !== null}
        onClick={() => onPurchase(pkg)}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buy Now"}
      </Button>
    </div>
  );
}

function StaticPkgCard({
  pkg,
  onPurchase,
  staggerIdx,
}: {
  pkg: (typeof STATIC_PACKAGES)[0];
  onPurchase: () => void;
  staggerIdx: number;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        pkg.highlighted
          ? "border-blue-500/60 bg-blue-500/5 ring-1 ring-blue-500/30"
          : "border-border hover:border-blue-400/50",
      )}
      style={{ animationDelay: `${staggerIdx * 80}ms` }}
    >
      {pkg.badge && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white",
              pkg.badge === "Most Popular" ? "bg-blue-600" : "bg-emerald-600",
            )}
          >
            {pkg.badge}
          </span>
        </div>
      )}
      <div>
        <p className="text-xl font-black text-foreground tabular-nums">
          {pkg.minutes}
          <span className="text-xs font-normal text-muted-foreground ml-1">min</span>
        </p>
        <p className="text-base font-bold text-foreground">${pkg.price_usd}</p>
        <p className="text-[10px] text-muted-foreground">${pkg.perMin}/min</p>
      </div>
      <Button
        size="sm"
        variant={pkg.highlighted ? "default" : "outline"}
        className="mt-auto w-full text-xs h-7"
        onClick={onPurchase}
      >
        Buy Now
      </Button>
    </div>
  );
}
