
function PaymentStep({
  service,
  payMethod,
  payRef,
  processing,
  onChoose,
  onConfirm,
  onSkip,
}: {
  service: Service;
  payMethod: "momo" | "stripe" | "office" | null;
  payRef: string;
  processing: boolean;
  onChoose: (m: "momo" | "stripe" | "office") => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const min = service.price_min_rwf ?? 0;
  const max = service.price_max_rwf ?? min;
  const priceText =
    min && max && min !== max
      ? `${min.toLocaleString()} – ${max.toLocaleString()} RWF`
      : `${(min || max).toLocaleString()} RWF`;

  if (payMethod && payMethod !== "office") {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Payment initiated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border p-4 bg-muted/40">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-mono text-sm">{payRef}</p>
            </div>
            <p className="text-sm">
              {payMethod === "momo"
                ? "Complete the payment on your phone — check for the MoMo prompt."
                : "Complete the payment on your card terminal."}
            </p>
            <p className="text-sm text-muted-foreground">
              Method: <span className="font-medium">{payMethod === "momo" ? "MoMo (Flutterwave)" : "Card (Stripe)"}</span>
            </p>
            <p className="text-sm text-muted-foreground">Amount: {priceText}</p>
            <div className="flex gap-2">
              <Button onClick={onConfirm} disabled={processing} className="flex-1">
                {processing ? "Confirming…" : "I've completed payment"}
              </Button>
              <Button variant="ghost" onClick={onSkip}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Request submitted — choose payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{priceText}</p>
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => onChoose("momo")}
              disabled={processing}
              className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Smartphone className="mr-2 h-4 w-4" /> Pay with MoMo (Flutterwave)
            </Button>
            <Button
              onClick={() => onChoose("stripe")}
              disabled={processing}
              className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="mr-2 h-4 w-4" /> Pay with Card (Stripe)
            </Button>
            <Button
              onClick={() => onChoose("office")}
              disabled={processing}
              variant="secondary"
              className="w-full justify-start"
            >
              <Building2 className="mr-2 h-4 w-4" /> Pay Later / At Office
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
