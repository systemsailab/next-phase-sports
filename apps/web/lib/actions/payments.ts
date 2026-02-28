"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { refundPayment } from "@/lib/stripe";
import { getCurrentFacilityId } from "./facility";
import { inngest } from "@/lib/inngest/client";

// ─── Customer: Get my payment history ────────────────────────────────────────

export async function getMyPayments() {
  const { userId } = await auth();
  if (!userId) return [];

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return [];

  const customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true },
  });
  if (!customer) return [];

  return db.payment.findMany({
    where: { facilityId, customerId: customer.id },
    include: {
      booking: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          duration: true,
          space: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ─── Admin: Get all payments for the facility ─────────────────────────────────

export async function getAdminPayments(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  const role = (user.publicMetadata as Record<string, unknown>)?.role as string;
  if (!["owner", "admin"].includes(role)) throw new Error("Admin access required");

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const { status, limit = 50, offset = 0 } = options ?? {};

  const where: Record<string, unknown> = { facilityId };
  if (status && status !== "all") {
    where.status = status;
  }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
        booking: {
          select: {
            id: true,
            startTime: true,
            space: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.payment.count({ where }),
  ]);

  return { payments, total };
}

// ─── Admin: Get revenue stats ─────────────────────────────────────────────────

export async function getRevenueStats() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  const role = (user.publicMetadata as Record<string, unknown>)?.role as string;
  if (!["owner", "admin"].includes(role)) throw new Error("Admin access required");

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [thisMonth, lastMonth, thisWeek, allTime, recentPayments] =
    await Promise.all([
      db.payment.aggregate({
        where: {
          facilityId,
          status: "SUCCEEDED",
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      db.payment.aggregate({
        where: {
          facilityId,
          status: "SUCCEEDED",
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      db.payment.aggregate({
        where: {
          facilityId,
          status: "SUCCEEDED",
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
        _count: true,
      }),
      db.payment.aggregate({
        where: { facilityId, status: "SUCCEEDED" },
        _sum: { amount: true, refundedAmount: true },
        _count: true,
      }),
      db.payment.findMany({
        where: { facilityId, status: "SUCCEEDED" },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          booking: { select: { space: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  return {
    thisMonth: {
      revenue: thisMonth._sum.amount ?? 0,
      count: thisMonth._count,
    },
    lastMonth: {
      revenue: lastMonth._sum.amount ?? 0,
      count: lastMonth._count,
    },
    thisWeek: {
      revenue: thisWeek._sum.amount ?? 0,
      count: thisWeek._count,
    },
    allTime: {
      revenue: allTime._sum.amount ?? 0,
      refunded: allTime._sum.refundedAmount ?? 0,
      count: allTime._count,
    },
    recentPayments,
  };
}

// ─── Admin: Issue refund ──────────────────────────────────────────────────────

export async function adminRefundPayment(
  paymentId: string,
  options?: { amount?: number; reason?: string }
) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  const role = (user.publicMetadata as Record<string, unknown>)?.role as string;
  if (!["owner", "admin"].includes(role)) throw new Error("Admin access required");

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const payment = await db.payment.findFirst({
    where: { id: paymentId, facilityId },
    include: { booking: true },
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "SUCCEEDED") {
    throw new Error("Can only refund succeeded payments");
  }
  if (!payment.stripePaymentIntentId) {
    // No Stripe intent — just mark as refunded in DB (free bookings / test)
    const refundAmt = options?.amount ?? payment.amount;
    const isFullRefund = refundAmt >= payment.amount;

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          refundedAmount: refundAmt,
        },
      });

      if (isFullRefund && payment.bookingId) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledBy: "admin",
            cancellationReason: options?.reason ?? "Admin refund",
          },
        });

        // Fire waitlist notification
        const booking = await tx.booking.findUnique({
          where: { id: payment.bookingId },
          select: { spaceId: true, startTime: true, endTime: true, facilityId: true },
        });
        if (booking) {
          inngest
            .send({
              name: "booking/cancelled",
              data: {
                bookingId: payment.bookingId,
                spaceId: booking.spaceId,
                startTime: booking.startTime.toISOString(),
                endTime: booking.endTime.toISOString(),
                facilityId: booking.facilityId,
              },
            })
            .catch(() => {});
        }
      }
    });

    revalidatePath("/admin/payments");
    return { success: true, refundedAmount: refundAmt };
  }

  // Issue Stripe refund
  const refundAmt = options?.amount ?? payment.amount;
  const stripeRefund = await refundPayment({
    paymentIntentId: payment.stripePaymentIntentId,
    amount: options?.amount, // undefined = full refund
    reason: "requested_by_customer",
  });

  // DB update will happen via webhook (charge.refunded), but also update immediately
  const isFullRefund = refundAmt >= payment.amount;
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      refundedAmount: refundAmt,
      stripeRefundId: stripeRefund.id,
    },
  });

  if (isFullRefund && payment.bookingId) {
    await db.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "admin",
        cancellationReason: options?.reason ?? "Admin refund",
      },
    });
  }

  revalidatePath("/admin/payments");
  return { success: true, refundedAmount: refundAmt, stripeRefundId: stripeRefund.id };
}
