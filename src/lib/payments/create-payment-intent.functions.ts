import { createServerFn } from "@tanstack/react-start";
import Stripe from "stripe";

interface CreateIntentInput {
  amount: number; // USD dollars
  currency?: string;
  metadata?: Record<string, string>;
}

export const createPaymentIntentFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreateIntentInput) => {
    if (typeof data?.amount !== "number" || data.amount <= 0) {
      throw new Error("Invalid amount");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const secret =
      import.meta.env.VITE_STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");

    // Use fetch-based HTTP client so Stripe SDK works on Cloudflare Workers.
    const stripe = new Stripe(secret, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100),
      currency: data.currency || "usd",
      automatic_payment_methods: { enabled: true },
      metadata: data.metadata ?? {},
    });

    if (!intent.client_secret) {
      console.error("Stripe created a PaymentIntent without a client secret", { id: intent.id });
      throw new Error("Stripe checkout could not be prepared. Please try again.");
    }

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  });
