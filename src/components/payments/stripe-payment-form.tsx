import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createPaymentIntentFn } from "@/lib/payments/create-payment-intent.functions";

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let _stripePromise: Promise<StripeJs | null> | null = null;
function getStripe() {
  if (!_stripePromise) {
    _stripePromise = PUBLISHABLE_KEY
      ? loadStripe(PUBLISHABLE_KEY)
      : Promise.resolve(null);
  }
  return _stripePromise;
}

export interface StripePaymentFormProps {
  amount: number; // USD
  serviceTitle: string;
  description?: string;
  metadata?: Record<string, string>;
  onSuccess: (paymentIntentId: string) => void | Promise<void>;
  onCancel: () => void;
  onError?: (message: string, error?: unknown) => void;
}

export function StripePaymentForm(props: StripePaymentFormProps) {
  const { amount, metadata, onError } = props;
  const createPaymentIntent = useServerFn(createPaymentIntentFn);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!PUBLISHABLE_KEY) {
      const message = "Stripe publishable key is not configured.";
      console.error(message);
      setInitError(message);
      onError?.(message);
      return;
    }
    setInitError(null);
    createPaymentIntent({
      data: { amount, currency: "usd", metadata: metadata ?? {} },
    })
      .then((res) => {
        if (cancelled) return;
        setClientSecret(res.clientSecret);
        setIntentId(res.paymentIntentId);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          const message = e.message || "Could not prepare Stripe checkout.";
          console.error("Stripe payment intent creation failed", e);
          setInitError(message);
          onError?.(message, e);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [amount, createPaymentIntent, metadata, onError]);

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "stripe" as const,
              variables: {
                colorPrimary: "#6366f1",
                borderRadius: "10px",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              },
            },
          }
        : undefined,
    [clientSecret],
  );

  return (
    <Card className="border-0 bg-gradient-to-br from-background to-muted/30 shadow-xl ring-1 ring-border/60 backdrop-blur">
      <CardContent className="p-6 sm:p-7">
        <Header {...props} />

        {initError ? (
          <ErrorState message={initError} onCancel={props.onCancel} />
        ) : !options ? (
          <LoadingState />
        ) : (
          <Elements stripe={getStripe()} options={options}>
            <InnerForm {...props} intentId={intentId!} />
          </Elements>
        )}

        <SecureFooter />
      </CardContent>
    </Card>
  );
}

function Header({ serviceTitle, description, amount, onCancel }: StripePaymentFormProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Secure checkout
        </div>
        <h3 className="mt-1 truncate text-lg font-semibold">{serviceTitle}</h3>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-3 inline-flex items-baseline gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
          <span className="text-[11px] font-medium uppercase tracking-wider">Total</span>
          <span className="text-base font-bold tabular-nums">${amount.toFixed(2)}</span>
          <span className="text-[11px] font-medium">USD</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close"
        className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">Preparing secure payment…</span>
    </div>
  );
}

function ErrorState({ message, onCancel }: { message: string; onCancel: () => void }) {
  return (
    <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" onClick={onCancel}>
        Close
      </Button>
    </div>
  );
}

function SecureFooter() {
  return (
    <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
      <Lock className="h-3 w-3" />
      <span>Secured by Stripe</span>
      <ShieldCheck className="ml-1 h-3 w-3" />
    </div>
  );
}

function InnerForm({
  amount,
  onSuccess,
  onCancel,
  onError,
}: StripePaymentFormProps & { intentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      const message = submitErr.message ?? "Payment validation failed.";
      console.error("Stripe payment validation failed", submitErr);
      setError(message);
      onError?.(message, submitErr);
      setSubmitting(false);
      return;
    }

    const { error: payErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (payErr) {
      const message = payErr.message ?? "Payment failed.";
      console.error("Stripe payment confirmation failed", payErr);
      setError(message);
      onError?.(message, payErr);
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        await onSuccess(paymentIntent.id);
      } catch (e) {
        const message = (e as Error).message || "Payment completed, but request submission failed.";
        console.error("Stripe post-payment submission failed", e);
        setError(message);
        onError?.(message, e);
        setSubmitting(false);
      }
    } else {
      const message = "Payment did not complete. Please try again.";
      console.error("Stripe payment incomplete", paymentIntent);
      setError(message);
      onError?.(message, paymentIntent);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border bg-background/60 p-3">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
          className="sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || submitting}
          className={cn(
            "sm:min-w-[180px] bg-gradient-to-r from-primary via-primary to-indigo-500",
            "text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95",
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
