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
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");

    // Use fetch-based HTTP client so Stripe SDK works on Cloudflare Workers.
    const stripe = new Stripe(secret, {
      apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
      httpClient: Stripe.createFetchHttpClient(),
    });

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100),
      currency: data.currency || "usd",
      automatic_payment_methods: { enabled: true },
      metadata: data.metadata ?? {},
    });

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  });
