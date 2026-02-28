import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendBookingConfirmation } from "@/lib/email";
import { inngest } from "@/lib/inngest/client";
import type Stripe from "stripe";

// Disable body parsing — Stripe needs raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        // Unhandled event type — log but don't error
        console.log(`[stripe-webhook] Unhandled: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err);
    // Return 200 anyway to prevent Stripe retries on app-level errors
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  // Update payment record
  const payment = await db.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!payment) {
    console.warn("[stripe-webhook] No payment record for PI:", paymentIntent.id);
    return;
  }

  const stripeFee = paymentIntent.latest_charge
    ? await getStripeFee(paymentIntent.latest_charge as string)
    : 0;

  await db.$transaction(async (tx) => {
    // Update payment
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        stripeChargeId: paymentIntent.latest_charge as string ?? undefined,
        stripeFee,
        netAmount: payment.amount - stripeFee - payment.platformFee,
        receiptUrl: paymentIntent.latest_charge
          ? `https://dashboard.stripe.com/payments/${paymentIntent.latest_charge}`
          : undefined,
      },
    });

    // Confirm the booking
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });

    // Update customer stats
    await tx.customer.update({
      where: { id: payment.customerId },
      data: {
        lifetimeValue: { increment: payment.amount },
      },
    });
  });

  // Send confirmation email + schedule reminders
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true } },
      space: { select: { name: true } },
      facility: { select: { name: true, timezone: true } },
    },
  });

  if (booking?.customer?.email) {
    const tz = booking.facility.timezone;
    const fmtDate = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric",
    }).format(booking.startTime);
    const fmtStart = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
    }).format(booking.startTime);
    const fmtEnd = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
    }).format(booking.endTime);

    sendBookingConfirmation({
      to: booking.customer.email,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`.trim(),
      spaceName: booking.space.name,
      facilityName: booking.facility.name,
      date: fmtDate,
      startTime: fmtStart,
      endTime: fmtEnd,
      duration: booking.duration,
      total: booking.total,
      bookingId: booking.id,
    }).catch((err) => console.error("[email] confirmation failed:", err));

    inngest.send({
      name: "booking/created",
      data: {
        bookingId: booking.id,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        customerEmail: booking.customer.email,
        customerName: `${booking.customer.firstName} ${booking.customer.lastName}`.trim(),
        spaceName: booking.space.name,
        facilityName: booking.facility.name,
        facilityTimezone: tz,
      },
    }).catch((err) => console.error("[inngest] booking/created failed:", err));
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const payment = await db.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
  });
  if (!payment) return;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureReason:
        paymentIntent.last_payment_error?.message ?? "Payment failed",
      retryCount: { increment: 1 },
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const payment = await db.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (!payment) return;

  const refundedAmount = charge.amount_refunded;
  const isFullRefund = refundedAmount >= payment.amount;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      refundedAmount,
    },
  });

  // If fully refunded, cancel the booking
  if (isFullRefund && payment.bookingId) {
    await db.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "system",
        cancellationReason: "Payment refunded",
      },
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getStripeFee(chargeId: string): Promise<number> {
  try {
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["balance_transaction"],
    });
    const bt = charge.balance_transaction;
    if (bt && typeof bt !== "string") {
      const fee = bt.fee_details?.find((f) => f.type === "stripe_fee");
      return fee?.amount ?? 0;
    }
  } catch {
    // Ignore — fee tracking is optional
  }
  return 0;
}
