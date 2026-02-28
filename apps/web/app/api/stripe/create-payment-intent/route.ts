import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createPaymentIntent } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    // Load booking with customer validation
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, clerkUserId: true } },
        space: { select: { name: true } },
        facility: { select: { name: true, stripeAccountId: true } },
        payment: { select: { id: true, stripePaymentIntentId: true, status: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify ownership
    if (booking.customer.clerkUserId !== userId) {
      return NextResponse.json({ error: "Not your booking" }, { status: 403 });
    }

    // If payment already has a valid intent, return it
    if (
      booking.payment?.stripePaymentIntentId &&
      booking.payment.status === "PENDING"
    ) {
      // Retrieve existing intent to get fresh client_secret
      const { stripe } = await import("@/lib/stripe");
      const existing = await stripe.paymentIntents.retrieve(
        booking.payment.stripePaymentIntentId
      );
      if (existing.status !== "canceled" && existing.status !== "succeeded") {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          amount: booking.total,
        });
      }
    }

    // Create new PaymentIntent
    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      amount: booking.total,
      metadata: {
        bookingId: booking.id,
        facilityId: booking.facilityId,
        customerId: booking.customerId,
        spaceName: booking.space.name,
      },
      description: `${booking.space.name} booking at ${booking.facility.name}`,
      stripeAccountId: booking.facility.stripeAccountId,
    });

    // Update payment record with Stripe PaymentIntent ID
    if (booking.payment) {
      await db.payment.update({
        where: { id: booking.payment.id },
        data: {
          stripePaymentIntentId: paymentIntentId,
          status: "PROCESSING",
        },
      });
    }

    return NextResponse.json({
      clientSecret,
      paymentIntentId,
      amount: booking.total,
    });
  } catch (error) {
    console.error("[stripe/create-payment-intent]", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
