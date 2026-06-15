import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/confirmation/$requestId")({
  validateSearch: (s: Record<string, unknown>) => ({
    serviceName: typeof s.serviceName === "string" ? s.serviceName : undefined,
    priceText: typeof s.priceText === "string" ? s.priceText : undefined,
    payMethod: typeof s.payMethod === "string" ? s.payMethod : undefined,
    paymentRef: typeof s.paymentRef === "string" ? s.paymentRef : undefined,
  }),
  component: ConfirmationPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestRow {
  id: string;
  status: string;
  progress_step: number | null;
  progress_total: number | null;
  service_category: string;
  assigned_staff_id: string | null;
  created_at: string;
  services: { name_en: string } | null;
}

interface PaymentRow {
  amount_rwf: number | null;
  currency: string | null;
  method: string | null;
  status: string | null;
  reference: string | null;
}

// ─── Step pipeline ────────────────────────────────────────────────────────────

const STANDARD_STEPS = [
  { key: "submitted", label: "Request received" },
  { key: "under_review", label: "Under review by our team" },
  { key: "verified", label: "Documents verified" },
  { key: "submitted_to_authority", label: "Submitted to authority" },
  { key: "completed", label: "Completed" },
] as const;

const FREE_STEPS = [
  { key: "free_consultation", label: "Consultation booked" },
  { key: "in_progress", label: "Interpreter preparing" },
  { key: "completed", label: "Session complete" },
] as const;

function activeIndex(steps: readonly { key: string }[], status: string): number {
  const i = steps.findIndex((s) => s.key === status);
  return i === -1 ? 1 : i;
}

const NEXT_BY_CATEGORY: Record<string, string[]> = {
  visa: [
    "We verify your documents within 2 business hours.",
    "A visa specialist is assigned to your case.",
    "You'll get updates by email and in Messages.",
  ],
  accounting: [
    "An accountant reviews your submission.",
    "We may request clarifications via Messages.",
    "Final filing or report is delivered in My Services.",
  ],
  translation: [
    "A certified translator is assigned to your file.",
    "First draft is shared for your review.",
    "Final certified copy is delivered in Documents.",
  ],
  consultancy: [
    "Your consultant prepares a tailored brief.",
    "We schedule a call at your convenience.",
    "Action items and notes appear in My Services.",
  ],
  interpreter: [
    "Your interpreter is being notified now.",
    "Join the live session from Messages when ready.",
    "A short summary is saved after the call.",
  ],
};

// ─── Receipt download ─────────────────────────────────────────────────────────

function downloadReceipt(params: {
  requestId: string;
  serviceName: string;
  priceText: string;
  payMethod: string;
  reference: string;
  paymentId?: string;
  paymentStatus?: string;
  date: string;
}) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Receipt – ${params.reference}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 520px; margin: 40px auto; color: #111; padding: 0 16px; }
  .brand { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #1F3864; padding-bottom:12px; margin-bottom:20px; }
  .brand h1 { font-size: 20px; margin:0; color:#1F3864; }
  .brand span { font-size: 11px; text-transform:uppercase; letter-spacing:.1em; color:#666; }
  .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; vertical-align: top; }
  td:last-child { text-align: right; font-weight: 600; word-break: break-all; }
  .paid { display:inline-block; background:#16a34a; color:#fff; font-size:11px; padding:2px 8px; border-radius:999px; }
  .footer { margin-top: 28px; font-size: 12px; color: #999; text-align: center; }
</style>
</head>
<body>
<div class="brand"><h1>San Brothers Ltd</h1><span>Official Receipt</span></div>
<p class="sub">Thank you for your purchase.</p>
<table>
  <tr><td>Service</td><td>${params.serviceName}</td></tr>
  <tr><td>Case ID</td><td>#${params.requestId.slice(0, 8).toUpperCase()}</td></tr>
  <tr><td>Amount</td><td>${params.priceText}</td></tr>
  <tr><td>Payment method</td><td>${params.payMethod}</td></tr>
  <tr><td>Payment status</td><td><span class="paid">${(params.paymentStatus ?? "Paid").toUpperCase()}</span></td></tr>
  ${params.paymentId ? `<tr><td>Payment ID</td><td style="font-family:monospace;font-size:12px">${params.paymentId}</td></tr>` : ""}
  <tr><td>Reference</td><td>${params.reference}</td></tr>
  <tr><td>Date</td><td>${params.date}</td></tr>
</table>
<p class="footer">San Brothers Ltd · contact@sanbrothers.com · This receipt is generated electronically and is valid without signature.</p>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  saveAs(blob, `SanBrothers-Receipt-${params.reference}.html`);
}

// ─── Component ────────────────────────────────────────────────────────────────

function ConfirmationPage() {
  const { requestId } = Route.useParams();
  const search = Route.useSearch();

  const [request, setRequest] = useState<RequestRow | null | undefined>(undefined);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [animIn, setAnimIn] = useState(false);

  const isFree = search.payMethod === "free";
  const serviceName = search.serviceName ?? request?.services?.name_en ?? "Service";
  const priceText =
    search.priceText ??
    (payment?.amount_rwf != null
      ? `${payment.currency ?? "USD"} ${payment.amount_rwf.toLocaleString()}`
      : "—");
  const payMethodLabel =
    search.payMethod === "momo"
      ? "MTN MoMo"
      : search.payMethod === "paypal"
        ? "PayPal"
        : search.payMethod === "free"
          ? "Free consultation"
          : "Credit / Debit card";

  const paymentId = search.paymentRef ?? payment?.reference ?? undefined;
  const reference = `SB-${requestId.slice(0, 8).toUpperCase()}`;
  const dateStr = useMemo(() => new Date().toLocaleString(), []);

  // ── Fetch + realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [reqRes, payRes] = await Promise.all([
        supabase
          .from("service_requests")
          .select(
            "id,status,progress_step,progress_total,service_category,assigned_staff_id,created_at,services(name_en)",
          )
          .eq("id", requestId)
          .maybeSingle(),
        supabase
          .from("payments")
          .select("amount_rwf,currency,method,status,reference")
          .eq("service_request_id", requestId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      if (reqRes.error) {
        toast.error(reqRes.error.message);
        setRequest(null);
      } else {
        setRequest((reqRes.data as unknown as RequestRow) ?? null);
      }
      if (!payRes.error && payRes.data) setPayment(payRes.data as PaymentRow);
    })();

    const channel = supabase
      .channel(`confirmation-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          setRequest((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<RequestRow>) } : prev,
          );
        },
      )
      .subscribe();

    const t = setTimeout(() => setAnimIn(true), 50);
    return () => {
      mounted = false;
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  // ── Steps ────────────────────────────────────────────────────────────────
  const steps = isFree || request?.status === "free_consultation" ? FREE_STEPS : STANDARD_STEPS;
  const currentStatus = request?.status ?? (isFree ? "free_consultation" : "submitted");
  const activeIdx = activeIndex(steps, currentStatus);
  const isCompleted = currentStatus === "completed";

  const categoryKey =
    request?.service_category === "consultancy" && isFree
      ? "interpreter"
      : (request?.service_category ?? "visa");
  const nextItems = NEXT_BY_CATEGORY[categoryKey] ?? NEXT_BY_CATEGORY.visa;

  const copyPaymentId = () => {
    if (!paymentId) return;
    navigator.clipboard.writeText(paymentId);
    toast.success("Payment ID copied");
  };

  // ── Not found ────────────────────────────────────────────────────────────
  if (request === null) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">We couldn't find this request</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been removed, or you may not have access to it.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard" search={undefined}>
            Back to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl space-y-6 px-4 py-8 pb-32 sm:pb-8">
      {/* Confetti */}
      {animIn && !isFree && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 animate-[confetti_2.2s_ease-out_forwards] rounded-sm"
              style={{
                left: `${(i / 14) * 100}%`,
                background: `hsl(${(i * 47) % 360} 85% 60%)`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
          <style>{`@keyframes confetti{0%{transform:translateY(-20px) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(280px) rotate(720deg);opacity:0}}`}</style>
        </div>
      )}

      {/* Hero */}
      <div
        className={cn(
          "flex flex-col items-center gap-4 text-center transition-all duration-500",
          animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <div className="relative">
          <div className="absolute inset-0 -m-4 animate-pulse rounded-full bg-success/20 blur-xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-success to-success/70 shadow-lg shadow-success/30 ring-8 ring-success/10">
            <CheckCircle2 className="h-12 w-12 text-success-foreground" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isFree ? "Consultation Booked!" : "Payment Successful"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isFree
              ? "Your interpreter will be ready in the Messages section."
              : "Your request is confirmed. Here's everything you need."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="font-mono text-xs text-muted-foreground">
              Case #{requestId.slice(0, 8).toUpperCase()}
            </span>
            {request ? <StatusBadge status={currentStatus} /> : <Skeleton className="h-5 w-20" />}
          </div>
        </div>
      </div>

      {/* Receipt */}
      {!isFree && (
        <Card
          className={cn(
            "overflow-hidden border-border/60 bg-linear-to-br from-card to-card/60 backdrop-blur transition-all delay-150 duration-500",
            animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <div className="flex items-center justify-between border-b bg-primary/5 px-6 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Official Receipt
              </span>
            </div>
            <Badge className="bg-success text-success-foreground hover:bg-success">Paid</Badge>
          </div>
          <CardContent className="space-y-1 py-4 text-sm">
            <Row label="Service" value={serviceName} />
            <Row label="Amount" value={priceText} bold />
            <Row label="Payment method" value={payMethodLabel} />
            {paymentId ? (
              <div className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0">
                <span className="text-xs text-muted-foreground">Payment ID</span>
                <button
                  onClick={copyPaymentId}
                  className="group flex max-w-[60%] items-center gap-1.5 truncate font-mono text-xs text-foreground hover:text-primary"
                  title={paymentId}
                >
                  <span className="truncate">{paymentId}</span>
                  <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              </div>
            ) : null}
            <Row label="Reference" value={reference} mono />
            <Row label="Date" value={dateStr} />
          </CardContent>
        </Card>
      )}

      {/* Status tracker */}
      <Card
        className={cn(
          "border-border/60 bg-linear-to-br from-card to-card/60 backdrop-blur transition-all delay-300 duration-500",
          animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Live status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {steps.map((s, i) => {
              const done = isCompleted || i < activeIdx;
              const active = !isCompleted && i === activeIdx;
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                      done
                        ? "border-success bg-success text-success-foreground shadow shadow-success/30"
                        : active
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/15"
                          : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm",
                      done
                        ? "text-muted-foreground line-through"
                        : active
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* What happens next */}
      <Card
        className={cn(
          "border-border/60 bg-linear-to-br from-card to-card/60 backdrop-blur transition-all delay-500 duration-500",
          animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            What happens next
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm">
            {nextItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
            <span className="font-medium text-primary">Estimated response:</span> within 2 business
            hours
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
              <a href="https://wa.me/250000000000" target="_blank" rel="noreferrer">
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
              <a href="mailto:contact@sanbrothers.com">
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
              <a href="tel:+250000000000">
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Desktop actions */}
      <div
        className={cn(
          "hidden flex-col gap-3 transition-all delay-700 duration-500 sm:flex sm:flex-row",
          animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        {isFree ? (
          <Button asChild className="flex-1">
            <Link to="/dashboard/messages">
              <MessageSquare className="mr-2 h-4 w-4" /> Go to Messages
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild className="flex-1">
              <Link to="/dashboard/my-services/$id" params={{ id: requestId }}>
                <ArrowRight className="mr-2 h-4 w-4" /> Track My Case
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/dashboard/messages">
                <MessageSquare className="mr-2 h-4 w-4" /> Message us
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Download receipt"
              onClick={() =>
                downloadReceipt({
                  requestId,
                  serviceName,
                  priceText,
                  payMethod: payMethodLabel,
                  reference,
                  paymentId,
                  paymentStatus: payment?.status ?? "Paid",
                  date: dateStr,
                })
              }
            >
              <Download className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {isFree ? (
            <Button asChild className="flex-1">
              <Link to="/dashboard/messages">
                <MessageSquare className="mr-2 h-4 w-4" /> Open Messages
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild className="flex-1">
                <Link to="/dashboard/my-services/$id" params={{ id: requestId }}>
                  Track My Case <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  downloadReceipt({
                    requestId,
                    serviceName,
                    priceText,
                    payMethod: payMethodLabel,
                    reference,
                    paymentId,
                    paymentStatus: payment?.status ?? "Paid",
                    date: dateStr,
                  })
                }
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", bold && "font-semibold", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}
