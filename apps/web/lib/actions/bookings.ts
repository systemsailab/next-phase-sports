"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { getCurrentFacilityId } from "./facility";
import { getAvailability } from "./availability";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const CreateBookingSchema = z.object({
  spaceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startMinutes: z.number().int().nonnegative(), // minutes from midnight in facility TZ
  durationMinutes: z.number().int().positive(),
  customerNotes: z.string().optional(),
  // Optional: pass customerId directly (admin booking for someone)
  customerId: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

// ─── Create Booking ───────────────────────────────────────────────────────────

export async function createBooking(input: CreateBookingInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const data = CreateBookingSchema.parse(input);

  // Load space + facility for timezone and pricing
  const space = await db.space.findFirst({
    where: { id: data.spaceId, facilityId, isActive: true },
    include: { facility: { select: { timezone: true, bookingBufferMin: true } } },
  });
  if (!space) throw new Error("Space not found");

  const tz = space.facility.timezone;

  // Convert startMinutes → UTC datetime
  const dayStart = fromZonedTime(`${data.date}T00:00:00`, tz);
  const startTime = new Date(dayStart.getTime() + data.startMinutes * 60_000);
  const endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000);

  // Double-check availability (conflict detection)
  const avail = await getAvailability(data.spaceId, data.date);
  if (!avail?.isOpen) throw new Error("Space is not available on this date");

  const buffer = space.bufferMinutes ?? space.facility.bookingBufferMin;
  const startMins = data.startMinutes;
  const endMins = data.startMinutes + data.durationMinutes;

  const hasConflict = avail.bookedIntervals.some(
    (b) => startMins < b.endMinutes + buffer && endMins > b.startMinutes - buffer
  );
  if (hasConflict) throw new Error("This time slot is no longer available. Please choose another.");

  // Duration bounds check
  if (data.durationMinutes < space.minBookingMinutes) {
    throw new Error(`Minimum booking duration is ${space.minBookingMinutes} minutes`);
  }
  if (data.durationMinutes > space.maxBookingMinutes) {
    throw new Error(`Maximum booking duration is ${space.maxBookingMinutes} minutes`);
  }

  // Calculate price
  const subtotal = Math.round((data.durationMinutes / 60) * space.hourlyRate);

  // Resolve customer
  let customerId = data.customerId;
  if (!customerId) {
    const { userId } = await auth();
    if (!userId) throw new Error("Must be logged in to book");

    const customer = await db.customer.findFirst({
      where: { facilityId, clerkUserId: userId },
      select: { id: true },
    });
    if (!customer) throw new Error("Customer account not found for this facility");
    customerId = customer.id;
  }

  // Create booking + pending payment atomically
  const booking = await db.$transaction(async (tx) => {
    const bk = await tx.booking.create({
      data: {
        facilityId,
        spaceId: data.spaceId,
        customerId,
        startTime,
        endTime,
        duration: data.durationMinutes,
        type: "RENTAL",
        subtotal,
        total: subtotal,
        status: "CONFIRMED", // No payment yet in Phase 2 — confirm immediately
        source: "web",
        customerNotes: data.customerNotes,
      },
    });

    // Create a pending payment record
    await tx.payment.create({
      data: {
        facilityId,
        customerId: customerId!,
        bookingId: bk.id,
        type: "BOOKING",
        amount: subtotal,
        status: "PENDING",
        description: `${space.name} — ${data.durationMinutes} min rental`,
      },
    });

    // Update customer stats
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalBookings: { increment: 1 },
        lastBookingDate: new Date(),
      },
    });

    return bk;
  });

  revalidatePath("/admin/calendar");
  revalidatePath("/schedule");
  return { success: true, bookingId: booking.id };
}

// ─── Cancel Booking ───────────────────────────────────────────────────────────

export async function cancelBooking(bookingId: string, reason?: string) {
  const facilityId = await getCurrentFacilityId();
  const { userId } = await auth();
  if (!userId || !facilityId) throw new Error("Unauthorized");

  const booking = await db.booking.findFirst({
    where: { id: bookingId, facilityId },
    include: {
      customer: { select: { clerkUserId: true } },
      payment: { select: { id: true, status: true } },
    },
  });
  if (!booking) throw new Error("Booking not found");

  // Check permission: admin, or the customer who owns it
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const isAdmin = role === "owner" || role === "admin" || role === "staff";
  const isOwner = booking.customer.clerkUserId === userId;
  if (!isAdmin && !isOwner) throw new Error("Not authorized to cancel this booking");

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: isAdmin ? "admin" : "customer",
        cancellationReason: reason,
      },
    });

    // Void the pending payment if not yet charged
    if (booking.payment && booking.payment.status === "PENDING") {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { status: "REFUNDED" },
      });
    }

    // Update customer stats
    await tx.customer.update({
      where: { id: booking.customerId },
      data: { totalBookings: { decrement: 1 } },
    });
  });

  revalidatePath("/admin/calendar");
  revalidatePath("/schedule");
  return { success: true };
}

// ─── Read: Customer bookings ──────────────────────────────────────────────────

export async function getMyBookings(status?: "upcoming" | "past" | "all") {
  const { userId } = await auth();
  if (!userId) return [];

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return [];

  const customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true },
  });
  if (!customer) return [];

  const now = new Date();

  const where = {
    customerId: customer.id,
    facilityId,
    ...(status === "upcoming"
      ? { startTime: { gte: now }, status: { in: ["CONFIRMED", "PENDING", "CHECKED_IN"] as const } }
      : status === "past"
      ? { endTime: { lte: now } }
      : {}),
  };

  return db.booking.findMany({
    where,
    include: {
      space: { select: { id: true, name: true, type: true } },
      payment: { select: { status: true, amount: true } },
    },
    orderBy: { startTime: status === "past" ? "desc" : "asc" },
    take: 50,
  });
}

// ─── Read: Admin calendar bookings ───────────────────────────────────────────

export async function getCalendarBookings(startDate: string, endDate: string) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return [];

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);

  return db.booking.findMany({
    where: {
      facilityId,
      status: { not: "CANCELLED" },
      startTime: { gte: start },
      endTime: { lte: end },
    },
    include: {
      space: { select: { id: true, name: true, type: true } },
      customer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { startTime: "asc" },
  });
}

// ─── Read: Single booking ─────────────────────────────────────────────────────

export async function getBooking(bookingId: string) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return null;

  return db.booking.findFirst({
    where: { id: bookingId, facilityId },
    include: {
      space: true,
      customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      payment: true,
    },
  });
}

// ─── Admin: Get or create customer for booking ────────────────────────────────

export async function getOrCreateCustomerForCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return null;

  const user = await currentUser();
  if (!user) return null;

  // Try to find existing customer
  let customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true },
  });

  if (!customer) {
    // Create customer record from Clerk user
    customer = await db.customer.create({
      data: {
        facilityId,
        clerkUserId: userId,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.emailAddresses[0]?.emailAddress ?? "",
        phone: user.phoneNumbers[0]?.phoneNumber ?? "",
        status: "ACTIVE",
        source: "website",
      },
      select: { id: true },
    });
  }

  return customer.id;
}
