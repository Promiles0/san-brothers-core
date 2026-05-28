import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
  current_call_id: string | null;
  lastLangFrom: string | undefined;
  lastLangTo: string | undefined;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TAB_ORDER = ["pay-as-you-go", "daily", "monthly", "yearly"];
const TAB_LABELS: Record<string, string> = {
  "pay-as-you-go": "Pay as you go",
  daily: "Daily",
  monthly: "Monthly",
  yearly: "Yearly",
};

// Progress bar fills up at 60 minutes (visual cap)
const BALANCE_VISUAL_MAX = 60;

function fmtMinutes(m: number): string {
  return Number.isInteger(m) ? String(m) : m.toFixed(1);
}

function normalizeTab(tab: string): string {
  return tab.toLowerCase().replace(/\s+/g, "-");
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/interpreter")({
  validateSearch: (search: Record<string, unknown>) => ({
    interpreterId: typeof search.interpreterId === "string" ? search.interpreterId : undefined,
  }),
  component: InterpreterPage,
});

// ── Main page ─────────────────────────────────────────────────────────────────
// dashboard.interpreter.$callId (and its .summary child) live INSIDE this route
// in the TanStack Router file-based tree.  TanStack Router renders the parent
// component first and renders the child into <Outlet />.  We split into two
// components so React's Rules of Hooks are never violated by a conditional
// early-return that sits before other hook calls.

function InterpreterPage() {
  const childMatches = useChildMatches();
  // When $callId (or its .summary) is active, pass through to that screen.
  if (childMatches.length > 0) return <Outlet />;
  // Otherwise render the language-selector / minute-purchase page.
  return <InterpreterLandingPage />;
}

function InterpreterLandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { interpreterId } = Route.useSearch();

  const [dataLoading, setDataLoading] = useState(true);
  const [minutes, setMinutes] = useState<ClientMinutes | null>(null);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [packages, setPackages] = useState<MinutePackage[]>([]);

  const [langFrom, setLangFrom] = useState("");
  const [langTo, setLangTo] = useState("");
  const [langError, setLangError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [activeTab, setActiveTab] = useState(TAB_ORDER[0]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

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
    ]).then(([minutesRes, langsRes, pkgsRes]) => {
      if (minutesRes.error) toast.error(minutesRes.error.message);
      else setMinutes((minutesRes.data as ClientMinutes) ?? null);

      if (langsRes.error) toast.error(langsRes.error.message);
      else setLanguages((langsRes.data as SupportedLanguage[]) ?? []);

      if (pkgsRes.error) toast.error(pkgsRes.error.message);
      else setPackages((pkgsRes.data as MinutePackage[]) ?? []);

      setDataLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!interpreterId || !user) return;
    setPreferredInterpLoading(true);
    void (async () => {
      const [interpRes, lastCallRes] = await Promise.all([
        supabase
          .from("users")
          .select("id,full_name,profile_picture_url,availability_status,current_call_id")
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
          lastLangFrom: lastFrom,
          lastLangTo: lastTo,
        });
        if (lastFrom) setLangFrom(lastFrom);
        if (lastTo) setLangTo(lastTo);
      }
      setPreferredInterpLoading(false);
    })();
  }, [interpreterId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const freeMinutes = minutes?.free_minutes_remaining ?? 0;
  const paidMinutes = minutes?.paid_minutes_remaining ?? 0;

  type PageState = "loading" | "first_time" | "has_minutes" | "no_minutes";
  const pageState: PageState = dataLoading
    ? "loading"
    : freeMinutes > 0
      ? "first_time"
      : paidMinutes > 0
        ? "has_minutes"
        : "no_minutes";

  // Group packages by normalised tab key
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
      console.log("[Call] Inserting call row…", { langFrom, langTo, userId: user.id });

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
        console.error("[Call] Insert failed:", error);
        toast.error("Could not start call: " + error.message);
        setStarting(false);
        return;
      }

      console.log("[Call] Row created:", data);

      // Reset loading state BEFORE navigating — if the component stays mounted
      // during the route transition the button would stay stuck in loading.
      setStarting(false);

      navigate({
        to: "/dashboard/interpreter/$callId",
        params: { callId: (data as { id: string }).id },
      } as never);
    } catch (err) {
      console.error("[Call] Unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
      setStarting(false);
    }
  };

  const handlePurchase = async (pkg: MinutePackage) => {
    if (!user) return;
    setPurchasing(pkg.id);
    try {
      await new Promise<void>((r) => setTimeout(r, 1500));
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
      setMinutes({
        client_id: user.id,
        free_minutes_remaining: freeMinutes,
        paid_minutes_remaining: newPaid,
      });
      toast.success(`${pkg.label} purchased — ${pkg.minutes} minutes added!`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPurchasing(null);
    }
  };

  const isPreferredAvailable =
    preferredInterp?.availability_status === "online" && !preferredInterp?.current_call_id;

  // Hide the normal flow only when we're showing a live "call again" card for an available interpreter.
  const showNormalFlow =
    !interpreterId || !showPreferredCard || !preferredInterp || !isPreferredAvailable;

  if (pageState === "loading") {
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-2">
        <Skeleton className="h-8 w-44" />
        {interpreterId && <Skeleton className="h-48 w-full rounded-xl" />}
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Interpreter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect instantly with a professional interpreter.
        </p>
      </div>

      {/* ── Preferred interpreter card ── */}
      {interpreterId && preferredInterpLoading && (
        <Skeleton className="h-48 w-full rounded-xl" />
      )}

      {interpreterId && !preferredInterpLoading && preferredInterp && showPreferredCard && (
        isPreferredAvailable ? (
          /* Online + free → "Call [Name] Again" card */
          <Card className="border-green-300 bg-green-500/5 dark:border-green-700">
            <CardContent className="space-y-4 px-5 pb-5 pt-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={preferredInterp.profile_picture_url ?? undefined} />
                  <AvatarFallback>{preferredInterp.full_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{preferredInterp.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    You spoke with this interpreter before
                  </p>
                </div>
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-300">
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
                className="w-full bg-green-600 text-white hover:bg-green-700"
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
                className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setShowPreferredCard(false)}
              >
                Or find a different interpreter
              </button>
            </CardContent>
          </Card>
        ) : (
          /* Offline / busy → amber unavailable card; normal flow renders below */
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/60">
            <CardContent className="space-y-4 px-5 pb-5 pt-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={preferredInterp.profile_picture_url ?? undefined} />
                  <AvatarFallback>{preferredInterp.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    {preferredInterp.full_name}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {preferredInterp.full_name} is currently unavailable
                  </p>
                </div>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                They may be on another call or offline.
              </p>
              <Button
                variant="outline"
                className="w-full border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
                onClick={() => normalFlowRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                Find Another Interpreter
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* ── Normal flow ── */}
      <div ref={normalFlowRef} className="space-y-6">
        {showNormalFlow && (
          <>
            {/* STATE 1: Free minutes available */}
            {pageState === "first_time" && (
              <Card>
                <CardContent className="px-6 py-10">
                  <div className="flex flex-col items-center gap-5 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
                      <Headphones className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold">Live Interpreter Call</h2>
                      <p className="text-sm text-muted-foreground">
                        You have {fmtMinutes(freeMinutes)} free minutes — no payment needed
                      </p>
                      <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/20 dark:text-green-300">
                        FREE
                      </Badge>
                    </div>

                    <div className="w-full">
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
                    </div>

                    <Button
                      size="lg"
                      className="w-full bg-green-600 text-white hover:bg-green-700"
                      onClick={() => handleStartCall()}
                      disabled={starting}
                    >
                      {starting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting…
                        </>
                      ) : (
                        "Start Free Call →"
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      First {fmtMinutes(freeMinutes)} minutes free. Unused minutes carry over.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STATE 2: Has paid minutes */}
            {pageState === "has_minutes" && (
              <>
                <Card>
                  <CardContent className="space-y-2.5 px-5 pb-5 pt-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium">Your balance</span>
                      <span className="text-lg font-bold tabular-nums">
                        {fmtMinutes(paidMinutes)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">min</span>
                      </span>
                    </div>
                    <Progress
                      value={Math.min((paidMinutes / BALANCE_VISUAL_MAX) * 100, 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {fmtMinutes(paidMinutes)} minutes remaining
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-4 px-5 pb-5 pt-5">
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
                      className="w-full"
                      onClick={() => handleStartCall()}
                      disabled={starting}
                    >
                      {starting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting…
                        </>
                      ) : (
                        "Call Now →"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* STATE 3: No minutes left */}
            {pageState === "no_minutes" && (
              <>
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
                  <Headphones className="h-4 w-4 shrink-0" />
                  <span>You've used your free minutes — buy minutes to continue</span>
                </div>

                <PackagePicker
                  tabs={availableTabs}
                  activeTab={activeTab}
                  packagesByTab={packagesByTab}
                  purchasing={purchasing}
                  onTabChange={setActiveTab}
                  onPurchase={handlePurchase}
                />

                <Card>
                  <CardContent className="space-y-4 px-5 pb-5 pt-5">
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
                      disabled
                    />
                    <Button size="lg" className="w-full" disabled>
                      Call Now →
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Purchase minutes above to enable calling
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
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
    <div className="w-full space-y-3">
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

// ── Package picker ─────────────────────────────────────────────────────────────

function PackagePicker({
  tabs,
  activeTab,
  packagesByTab,
  purchasing,
  onTabChange,
  onPurchase,
}: {
  tabs: string[];
  activeTab: string;
  packagesByTab: Record<string, MinutePackage[]>;
  purchasing: string | null;
  onTabChange: (t: string) => void;
  onPurchase: (pkg: MinutePackage) => void;
}) {
  const displayTabs = tabs.length > 0 ? tabs : TAB_ORDER;

  if (tabs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No packages available right now.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Choose a plan</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="w-full">
            {displayTabs.map((t) => (
              <TabsTrigger key={t} value={t} className="flex-1 text-xs">
                {TAB_LABELS[t] ?? t}
              </TabsTrigger>
            ))}
          </TabsList>
          {displayTabs.map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {(packagesByTab[t] ?? []).slice(0, 3).map((pkg) => (
                  <PkgCard key={pkg.id} pkg={pkg} purchasing={purchasing} onPurchase={onPurchase} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PkgCard({
  pkg,
  purchasing,
  onPurchase,
}: {
  pkg: MinutePackage;
  purchasing: string | null;
  onPurchase: (pkg: MinutePackage) => void;
}) {
  const isLoading = purchasing === pkg.id;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border p-4 transition-all",
        pkg.is_highlighted
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40",
      )}
    >
      {pkg.is_highlighted && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge className="flex items-center gap-1 bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
            <Star className="h-2.5 w-2.5 fill-current" />
            Best Value
          </Badge>
        </div>
      )}

      <div className="space-y-0.5">
        {pkg.savings_percent > 0 && (
          <Badge
            variant="secondary"
            className="mb-1 w-fit bg-green-500/15 text-[10px] text-green-700 dark:text-green-300"
          >
            Save {pkg.savings_percent}%
          </Badge>
        )}
        <p className="text-sm font-semibold">{pkg.label}</p>
        <p className="text-2xl font-bold">${pkg.price_usd.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">{pkg.minutes} minutes</p>
      </div>

      <Button
        size="sm"
        variant={pkg.is_highlighted ? "default" : "outline"}
        className="mt-auto w-full"
        disabled={purchasing !== null}
        onClick={() => onPurchase(pkg)}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Buy ${pkg.label}`}
      </Button>
    </div>
  );
}
