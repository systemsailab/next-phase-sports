import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const PLATFORM_FEE_PERCENT = 2.9; // 2.9%
export const PLATFORM_FEE_FIXED = 30; // $0.30 in cents

/**
 * Calculate platform fee for a given amount (in cents)
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100) + PLATFORM_FEE_FIXED);
}
