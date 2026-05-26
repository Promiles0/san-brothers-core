import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/confirmation/$requestId")({
  validateSearch: (s: Record<string, unknown>) => ({
    serviceName: typeof s.serviceName === "string" ? s.serviceName : undefined,
    priceText: typeof s.priceText === "string" ? s.priceText : undefined,
    payMethod: typeof s.payMethod === "string" ? s.payMethod : undefined,
  }),
  component: ConfirmationPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestRow {
  id: string;
  status: string;
  service_category: string;
  created_at: string;
  services: { name_en: string } | null;
}

const NEXT_STEPS = [
  { key: "received", label: "Documents received", done: true },
  { key: "review", label: "Under review by our team", active: true },
  { key: "assigned", label: "Expert assigned to your case", done: false },
  { key: "processing", label: "Processing", done: false },
  { key: "completed", label: "Completed", done: false },
] as const;

const FREE_NEXT_STEPS = [
  { key: "booked", label: "Consultation booked", done: true },
  { key: "waiting", label: "Interpreter preparing", active: true },
  { key: "session", label: "Session in Messages", done: false },
] as const;

// ─── Receipt download ─────────────────────────────────────────────────────────

function downloadReceipt(params: {
  requestId: string;
  serviceName: string;
  priceText: string;
  payMethod: string;
  reference: string;
  date: string;
}) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Receipt – ${params.reference}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 480px; margin: 40px auto; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  td:last-child { text-align: right; font-weight: 600; }
  .footer { margin-top: 28px; font-size: 12px; color: #999; text-align: center; }
</style>
</head>
<body>
<h1>San Brothers Receipt</h1>
<p class="sub">Thank you for your request.</p>
<table>
  <tr><td>Service</td><td>${params.serviceName}</td></tr>
  <tr><td>Case ID</td><td>#${params.requestId.slice(0, 8).toUpperCase()}</td></tr>
  <tr><td>Amount</td><td>${params.priceText}</td></tr>
  <tr><td>Payment method</td><td>${params.payMethod}</td></tr>
  <tr><td>Reference</td><td>${params.reference}</td></tr>
  <tr><td>Date</td><td>${params.date}</td></tr>
</table>
<p class="footer">San Brothers Ltd · contact@sanbrothers.com</p>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  saveAs(blob, `receipt_${params.reference}.html`);
}

// ─── Component ────────────────────────────────────────────────────────────────

function ConfirmationPage() {
  const { requestId } = Route.useParams();
  // URL search params passed by the modal
  const search = Route.useSearch();

  const [request, setRequest] = useState<RequestRow | null | undefined>(undefined);
  const [animIn, setAnimIn] = useState(false);

  const isFree = search.payMethod === "free";
  const serviceName = search.serviceName ?? request?.services?.name_en ?? "Service";
  const priceText = search.priceText ?? "—";
  const payMethodLabel =
    search.payMethod === "momo"
      ? "MTN MoMo"
      : search.payMethod === "paypal"
        ? "PayPal"
        : search.payMethod === "free"
          ? "Free consultation"
          : "Credit / Debit card";

  const reference = `SB-${requestId.slice(0, 8).toUpperCase()}`;
  const dateStr = new Date().toLocaleString();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id,status,service_category,created_at,services(name_en)")
        .eq("id", requestId)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        setRequest(null);
        return;
      }
      setRequest((data as unknown as RequestRow) ?? null);
    })();
    // Trigger entrance animation
    const t = setTimeout(() => setAnimIn(true), 50);
    return () => clearTimeout(t);
  }, [requestId]);

  const steps = isFree ? FREE_NEXT_STEPS : NEXT_STEPS;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      {/* Success header */}
      <div
        className={cn(
          "flex flex-col items-center gap-4 text-center transition-all duration-500",
          animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {isFree ? "Consultation Booked!" : "Request Submitted Successfully!"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFree
              ? "Your interpreter will be ready in the Messages section."
              : "Our team will review your case and be in touch shortly."}
          </p>
          {request !== undefined ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Case ID: #
              {request === null ? requestId.slice(0, 8).toUpperCase() : requestId.slice(0, 8).toUpperCase()}
            </p>
          ) : (
            <Skeleton className="mx-auto mt-2 h-4 w-32" />
          )}
        </div>
      </div>

      {/* Receipt */}
      {!isFree && (
        <Card
          className={cn(
            "transition-all delay-150 duration-500",
            animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Service" value={serviceName} />
            <Row label="Amount" value={priceText} bold />
            <Row label="Payment method" value={payMethodLabel} />
            <Row label="Reference" value={reference} mono />
            <Row label="Date" value={dateStr} />
          </CardContent>
        </Card>
      )}

      {/* Next steps */}
      <Card
        className={cn(
          "transition-all delay-300 duration-500",
          animIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Next steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {steps.map((s, i) => {
              const done = "done" in s && s.done;
              const active = "active" in s && s.active;
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      done
                        ? "border-green-500 bg-green-500 text-white"
                        : active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                          ? "font-semibold"
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

      {/* Actions */}
      <div
        className={cn(
          "flex flex-col gap-3 transition-all delay-500 duration-500 sm:flex-row",
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
              <Link to="/dashboard/my-services">
                <ArrowRight className="mr-2 h-4 w-4" /> Track My Case
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/dashboard/messages">
                <MessageSquare className="mr-2 h-4 w-4" /> Send a Message
              </Link>
            </Button>
          </>
        )}
        {!isFree && (
          <Button
            variant="ghost"
            onClick={() =>
              downloadReceipt({
                requestId,
                serviceName,
                priceText,
                payMethod: payMethodLabel,
                reference,
                date: dateStr,
              })
            }
          >
            <Download className="mr-2 h-4 w-4" /> Download Receipt
          </Button>
        )}
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
    <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", bold && "font-semibold", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}
