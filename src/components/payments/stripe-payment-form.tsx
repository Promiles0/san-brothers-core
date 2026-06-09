import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe as StripeJs, type StripeCardElement } from "@stripe/stripe-js";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader as Loader2, Lock, ShieldCheck, CreditCard, Building2, DollarSign, CircleCheck as CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let _stripePromise: Promise<StripeJs | null> | null = null;
function getStripe() {
  if (!_stripePromise) {
    _stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : Promise.resolve(null);
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
  clientSecret?: string | null; // Added prop
}

type PaymentMethod = "card" | "mtn-momo" | "paypal" | "bank" | "cash-app" | "amazon-pay";

export function StripePaymentForm(props: StripePaymentFormProps) {
  const { amount, serviceTitle, onError, clientSecret: propClientSecret } = props;
  const onErrorRef = useRef(onError);
  const [internalClientSecret, setInternalClientSecret] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");

  const clientSecret = propClientSecret || internalClientSecret;

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Only fetch internally if clientSecret is not provided as a prop
  useEffect(() => {
    if (propClientSecret) return;

    let cancelled = false;
    if (!PUBLISHABLE_KEY) {
      const message = "Stripe publishable key is not configured.";
      console.error(message);
      setInitError(message);
      onErrorRef.current?.(message);
      return;
    }
    setInitError(null);
    setInternalClientSecret(null);
    async function preparePaymentIntent() {
      const response = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          metadata: { serviceTitle, ...props.metadata },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        clientSecret?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Payment setup failed");
      }

      if (!payload.clientSecret) {
        throw new Error("Stripe checkout could not be prepared. Please try again.");
      }

      return payload.clientSecret;
    }

    preparePaymentIntent()
      .then((secret) => {
        if (cancelled) return;
        setInternalClientSecret(secret);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          const message = e.message || "Could not prepare Stripe checkout.";
          console.error("Stripe payment intent creation failed", e);
          setInitError(message);
          onErrorRef.current?.(message, e);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [amount, serviceTitle, propClientSecret]);

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

  const rwfAmount = Math.round(amount * 1285);

  return (
    <Card className="border-0 bg-linear-to-br from-background to-muted/30 shadow-xl ring-1 ring-border/60 backdrop-blur w-full max-w-xl mx-auto">
      <CardContent className="w-full p-4 sm:p-6 lg:p-7">
        <Header serviceTitle={props.serviceTitle} description={props.description} />

        {/* Amount Display */}
        <div className="mb-6 rounded-lg bg-primary/5 p-3 sm:p-4 border border-primary/20">
          <div className="text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Total Amount
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-primary">${amount.toFixed(2)} USD</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-2">
              ≈ RWF {rwfAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {initError ? (
          <ErrorState message={initError} onCancel={props.onCancel} />
        ) : !options ? (
          <LoadingState />
        ) : (
          <>
            {/* Payment Method Selector */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 block">Select Payment Method</Label>
              <PaymentMethodGrid
                selectedMethod={selectedMethod}
                onSelectMethod={setSelectedMethod}
              />
            </div>

            {/* Payment Form Based on Selected Method */}
            <div className="mb-6">
              {selectedMethod === "card" && (
                <Elements stripe={getStripe()} options={options}>
                  <InnerForm {...props} clientSecret={clientSecret} selectedMethod={selectedMethod} />
                </Elements>
              )}
              {selectedMethod === "mtn-momo" && (
                <MTNMoMoForm amount={amount} rwfAmount={rwfAmount} />
              )}
              {selectedMethod === "paypal" && <PayPalForm />}
              {selectedMethod === "bank" && <BankTransferForm amount={amount} />}
              {selectedMethod === "cash-app" && <CashAppForm amount={amount} />}
              {selectedMethod === "amazon-pay" && <AmazonPayForm amount={amount} />}
            </div>
          </>
        )}

        <SecureFooter />
      </CardContent>
    </Card>
  );
}

function Header({ serviceTitle, description }: Pick<StripePaymentFormProps, "serviceTitle" | "description">) {
  return (
    <div className="mb-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Secure checkout
      </div>
      <h3 className="mt-1 text-lg font-semibold">{serviceTitle}</h3>
      {description ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      ) : null}
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

function PaymentMethodGrid({
  selectedMethod,
  onSelectMethod,
}: {
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
}) {
  const methods: Array<{
    id: PaymentMethod;
    name: string;
    icon: React.ReactNode;
    comingSoon?: boolean;
  }> = [
    { id: "card", name: "Card", icon: <CreditCard className="h-6 w-6" /> },
    {
      id: "mtn-momo",
      name: "MTN MoMo",
      icon: <span className="text-lg font-bold">MoMo</span>,
      comingSoon: true,
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: <span className="text-lg font-bold text-blue-600">PP</span>,
      comingSoon: true,
    },
    { id: "bank", name: "Bank Transfer", icon: <Building2 className="h-6 w-6" /> },
    { id: "cash-app", name: "Cash App", icon: <DollarSign className="h-6 w-6" /> },
    {
      id: "amazon-pay",
      name: "Amazon Pay",
      icon: <span className="text-lg font-bold text-orange-500">a</span>,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onSelectMethod(method.id)}
          className={cn(
            "relative flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 sm:p-4 transition-all duration-200",
            selectedMethod === method.id
              ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
              : "border-border/50 bg-background/50 hover:border-border hover:bg-muted/50",
            method.comingSoon && "opacity-70",
          )}
        >
          {method.comingSoon && (
            <div className="absolute top-1 right-1 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
              Soon
            </div>
          )}
          <div className="text-foreground flex items-center justify-center">{method.icon}</div>
          <div className="text-center">
            <div className="text-xs sm:text-sm font-medium text-foreground">{method.name}</div>
          </div>
          {selectedMethod === method.id && (
            <CheckCircle2 className="absolute top-1 left-1 h-4 w-4 text-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

function MTNMoMoForm({ amount, rwfAmount }: { amount: number; rwfAmount: number }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handlePayment = async () => {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length !== 9) {
      toast.error("Please enter a valid 9-digit phone number");
      return;
    }
    if (!digits.startsWith("078") && !digits.startsWith("079")) {
      toast.error("Phone number must start with 078 or 079");
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    toast.error("MTN MoMo is not yet available. Please use Card payment or contact us.");
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📱</span>
        <h4 className="font-semibold">MTN Mobile Money</h4>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Enter your MTN number</Label>
        <div className="flex gap-2">
          <div className="flex items-center rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
            🇷🇼 +250
          </div>
          <Input
            type="tel"
            placeholder="078X XXX XXX"
            value={phoneNumber}
            onChange={handlePhoneChange}
            maxLength={11}
            className="flex-1"
          />
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={loading || phoneNumber.replace(/\D/g, "").length !== 9}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending payment request...
          </>
        ) : (
          `Pay RWF ${Math.round(amount * 1285).toLocaleString()} with MTN MoMo`
        )}
      </Button>

      <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-400">
        <p className="font-medium">ℹ️ You will receive a payment prompt on your phone.</p>
        <p className="text-xs mt-1">Approve it to complete payment.</p>
      </div>

      <div className="rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
        <p className="font-medium">⚠️ MTN MoMo coming soon!</p>
        <p className="text-xs mt-1">Currently unavailable.</p>
      </div>
    </div>
  );
}

function PayPalForm() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    toast.error("PayPal is not yet available. Please use Card payment.");
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">💙</span>
        <h4 className="font-semibold">PayPal</h4>
      </div>

      <p className="text-sm text-muted-foreground">
        Pay securely with your PayPal account or credit card.
      </p>

      <Button onClick={handlePayment} disabled={loading} className="w-full" variant="outline">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "🔵 Pay with PayPal"
        )}
      </Button>

      <div className="rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
        <p className="font-medium">⚠️ PayPal coming soon!</p>
        <p className="text-xs mt-1">Currently unavailable.</p>
      </div>
    </div>
  );
}

function BankTransferForm({ amount }: { amount: number }) {
  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h4 className="font-semibold">Bank Transfer</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        Bank transfer details will be provided after you proceed. Please contact support for
        assistance.
      </p>
      <Button className="w-full" disabled>
        Bank Transfer (Coming Soon)
      </Button>
    </div>
  );
}

function CashAppForm({ amount }: { amount: number }) {
  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        <h4 className="font-semibold">Cash App</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        Cash App payments will be available soon. Please use another payment method for now.
      </p>
      <Button className="w-full" disabled>
        Cash App (Coming Soon)
      </Button>
    </div>
  );
}

function AmazonPayForm({ amount }: { amount: number }) {
  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-orange-500">a</span>
        <h4 className="font-semibold">Amazon Pay</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        Amazon Pay will be available soon. Please use another payment method for now.
      </p>
      <Button className="w-full" disabled>
        Amazon Pay (Coming Soon)
      </Button>
    </div>
  );
}

function SecureFooter() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1">
        <Lock className="h-3 w-3" />
        <span>256-bit SSL</span>
      </div>
      <span>|</span>
      <div className="flex items-center gap-1">
        <ShieldCheck className="h-3 w-3" />
        <span>Secured by Stripe</span>
      </div>
      <span>|</span>
      <span>✓ PCI Compliant</span>
    </div>
  );
}

function InnerForm({ amount, onSuccess, onCancel, onError, selectedMethod, clientSecret }: StripePaymentFormProps & { selectedMethod?: PaymentMethod }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (!elements) return;
      const cardElement = elements.getElement(CardElement) as StripeCardElement | null;
      if (cardElement?.unmount) {
        try {
          cardElement.unmount();
        } catch (err) {
          console.warn("Failed to unmount Stripe CardElement", err);
        }
      }
    };
  }, [elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      const message = "Card input is not ready. Please refresh and try again.";
      console.error(message);
      setError(message);
      onError?.(message);
      return;
    }

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

    if (!clientSecret) {
      const message = "Payment session is not available. Please try again.";
      console.error(message);
      setError(message);
      onError?.(message);
      setSubmitting(false);
      return;
    }

    const { error: payErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
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
      <div className="w-full rounded-xl border bg-background/60 p-3 sm:p-4">
        <CardElement options={{
          style: {
            base: {
              fontSize: '14px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#fa755a',
            },
          },
          hidePostalCode: true,
        }} />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={!stripe || submitting}
        className={cn(
          "w-full bg-linear-to-r from-primary via-primary to-indigo-500",
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
    </form>
  );
}
