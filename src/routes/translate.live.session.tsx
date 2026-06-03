import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, PhoneCall, Loader2, Wallet } from "lucide-react";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/translate/live/session")({
  head: () => ({
    meta: [
      { title: "Live Interpreter Session" },
      { name: "description", content: "Start a live interpreter call." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionPage,
});

const LANGS = [
  { code: "EN", label: "English" },
  { code: "ZH", label: "中文 (Chinese)" },
  { code: "FR", label: "Français (French)" },
  { code: "RW", label: "Kinyarwanda" },
];

const PAYG_RATE = 400; // RWF per minute

type Phase = "pre" | "connecting" | "connected" | "ended";
type SessionType = "payg" | "bank";

function SessionPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { intent: "interpreter" } as never });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TranslateLayout>
      <SessionInner />
    </TranslateLayout>
  );
}

function SessionInner() {
  const { user } = useAuth();
  const [from, setFrom] = useState("EN");
  const [to, setTo] = useState("ZH");
  const [sessionType, setSessionType] = useState<SessionType>("payg");
  const [phase, setPhase] = useState<Phase>("pre");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [bank, setBank] = useState<number>(0);
  const [bankLoaded, setBankLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load minute bank balance (graceful if column doesn't exist)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("minute_bank_balance")
          .eq("id", user.id)
          .single();
        if (cancelled) return;
        if (error) {
          setBank(0);
        } else {
          setBank(Number((data as { minute_bank_balance?: number })?.minute_bank_balance ?? 0));
        }
      } catch {
        if (!cancelled) setBank(0);
      } finally {
        if (!cancelled) setBankLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Connecting → Connected simulation
  useEffect(() => {
    if (phase !== "connecting") return;
    const t = setTimeout(() => setPhase("connected"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  // Timer
  useEffect(() => {
    if (phase !== "connected") return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const minutesUsed = Math.ceil(seconds / 60);
  const costRwf = sessionType === "payg" ? minutesUsed * PAYG_RATE : 0;

  function startCall() {
    setSeconds(0);
    setMuted(false);
    setPhase("connecting");
  }

  async function endCall() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("ended");
    // Deduct from minute bank if applicable
    if (sessionType === "bank" && user && minutesUsed > 0 && bank > 0) {
      const newBalance = Math.max(0, bank - minutesUsed);
      try {
        await supabase.from("users").update({ minute_bank_balance: newBalance }).eq("id", user.id);
        setBank(newBalance);
      } catch {
        // ignore — column may not exist yet
      }
    }
  }

  function resetCall() {
    setPhase("pre");
    setSeconds(0);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      {/* Minute bank pill */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Live Interpreter</h1>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
          <Wallet className="h-3.5 w-3.5" />
          {bankLoaded ? `${bank} min in bank` : "…"}
        </Badge>
      </div>

      {phase === "pre" && (
        <Card>
          <CardHeader>
            <CardTitle>Set up your call</CardTitle>
            <CardDescription>Choose languages and how you'd like to pay.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGS.filter((l) => l.code !== from).map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Session type</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSessionType("payg")}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    sessionType === "payg"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">Pay as you go</div>
                  <div className="mt-1 text-xs text-muted-foreground">{PAYG_RATE} RWF / minute</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSessionType("bank")}
                  disabled={bank <= 0}
                  className={`rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    sessionType === "bank"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">Use minute bank</div>
                  <div className="mt-1 text-xs text-muted-foreground">{bank} minutes available</div>
                </button>
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={startCall} disabled={from === to}>
              <PhoneCall className="h-4 w-4" />
              Start Call
            </Button>
          </CardContent>
        </Card>
      )}

      {(phase === "connecting" || phase === "connected") && (
        <Card>
          <CardContent className="flex flex-col items-center gap-8 py-16">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {from} ↔ {to} · {sessionType === "payg" ? "Pay as you go" : "Minute bank"}
            </div>

            <div className="flex flex-col items-center gap-3">
              {phase === "connecting" ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-xl font-semibold">Connecting…</div>
                  <div className="text-sm text-muted-foreground">
                    Finding an available interpreter
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-green-500/30" />
                    <div className="relative grid h-20 w-20 place-items-center rounded-full bg-green-500/20">
                      <PhoneCall className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="text-xl font-semibold">Connected</div>
                  <div className="font-mono text-4xl tabular-nums tracking-tight">
                    {fmt(seconds)}
                  </div>
                  {sessionType === "payg" ? (
                    <div className="text-sm text-muted-foreground">
                      Cost:{" "}
                      <span className="font-semibold text-foreground">
                        {costRwf.toLocaleString()} RWF
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Using bank:{" "}
                      <span className="font-semibold text-foreground">{minutesUsed} min</span> (
                      {Math.max(0, bank - minutesUsed)} remaining)
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button
                size="lg"
                variant={muted ? "default" : "outline"}
                className="h-14 w-14 rounded-full p-0"
                onClick={() => setMuted((m) => !m)}
                disabled={phase !== "connected"}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="h-14 w-14 rounded-full p-0"
                onClick={endCall}
                aria-label="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "ended" && (
        <Card>
          <CardHeader>
            <CardTitle>Session summary</CardTitle>
            <CardDescription>Thanks for using We Speak Your Language.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y divide-border rounded-lg border">
              <Row label="Language pair" value={`${from} ↔ ${to}`} />
              <Row label="Duration" value={fmt(seconds)} />
              <Row label="Minutes billed" value={`${minutesUsed} min`} />
              <Row
                label={sessionType === "payg" ? "Total cost" : "Deducted from bank"}
                value={
                  sessionType === "payg" ? `${costRwf.toLocaleString()} RWF` : `${minutesUsed} min`
                }
              />
              {sessionType === "bank" && <Row label="Bank remaining" value={`${bank} min`} />}
            </dl>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetCall}>
                New session
              </Button>
              <Button className="flex-1" asChild>
                <a href="/dashboard">Back to dashboard</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}
