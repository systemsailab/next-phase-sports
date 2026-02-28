import Stripe from "stripe";

// Guard: if no Stripe key, we still export a typed stripe object
// but it will throw on actual API calls.
const key = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";

export const stripe = new Stripe(key, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

export const PLATFORM_FEE_PERCENT = 2.9; // 2.9%
export const PLATFORM_FEE_FIXED = 30; // $0.30 in cents

/**
 * Calculate platform fee for a given amount (in cents)
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100) + PLATFORM_FEE_FIXED);
}

/**
 * Create a PaymentIntent for a booking.
 * Returns the client secret so the frontend can confirm via Stripe Elements.
 */
export async function createPaymentIntent({
  amount,
  currency = "usd",
  metadata,
  description,
  stripeAccountId,
}: {
  amount: number; // cents
  currency?: string;
  metadata: Record<string, string>;
  description: string;
  stripeAccountId?: string | null;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const params: Stripe.PaymentIntentCreateParams = {
    amount,
    currency,
    metadata,
    description,
    automatic_payment_methods: { enabled: true },
  };

  // If facility has Stripe Connect, do a destination charge
  const opts: Stripe.RequestOptions = {};
  if (stripeAccountId) {
    const platformFee = calculatePlatformFee(amount);
    params.application_fee_amount = platformFee;
    params.transfer_data = { destination: stripeAccountId };
  }

  const intent = await stripe.paymentIntents.create(params, opts);
  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}

/**
 * Refund a payment (full or partial).
 */
export async function refundPayment({
  paymentIntentId,
  amount,
  reason,
}: {
  paymentIntentId: string;
  amount?: number; // cents — omit for full refund
  reason?: "requested_by_customer" | "duplicate" | "fraudulent";
}): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount ? { amount } : {}),
    ...(reason ? { reason } : {}),
  });
}

/**
 * Verify and construct a webhook event from the raw body.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  return stripe.webhooks.constructEvent(body, signature, secret);
}
