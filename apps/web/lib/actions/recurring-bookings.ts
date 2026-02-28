"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { getCurrentFacilityId } from "./facility";
import { getAvailability } from "./availability";
import { sendBookingConfirmation } from "@/lib/email";
import { inngest } from "@/lib/inngest/client";

export const CreateRecurringBookingSchema = z.object({
  spaceId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // first occurrence
  startMinutes: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  weeks: z.number().int().min(2).max(26), // 2–26 weeks
  customerNotes: z.string().optional(),
});

export type CreateRecurringBookingInput = z.infer<typeof CreateRecurringBookingSchema>;

export async function createRecurringBookings(input: CreateRecurringBookingInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const { userId } = await auth();
  if (!userId) throw new Error("Must be logged in to book");

  const data = CreateRecurringBookingSchema.parse(input);

  const space = await db.space.findFirst({
    where: { id: data.spaceId, facilityId, isActive: true },
    include: { facility: { select: { timezone: true, bookingBufferMin: true, name: true } } },
  });
  if (!space) throw new Error("Space not found");

  const tz = space.facility.timezone;

  // Customer lookup
  const customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!customer) throw new Error("Customer account not found");

  // Calculate all occurrence dates
  const [year, month, day] = data.startDate.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 0; i < data.weeks; i++) {
    const d = new Date(year, month - 1, day + i * 7);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dates.push(dateStr);
  }

  // Check availability for ALL dates before creating any
  const conflicts: string[] = [];
  for (const dateStr of dates) {
    const avail = await getAvailability(data.spaceId, dateStr);
    if (!avail?.isOpen) {
      conflicts.push(dateStr);
      continue;
    }

    const buffer = space.bufferMinutes ?? space.facility.bookingBufferMin;
    const endMins = data.startMinutes + data.durationMinutes;
    const hasConflict = avail.bookedIntervals.some(
      (b) => data.startMinutes < b.endMinutes + buffer && endMins > b.startMinutes - buffer
    );
    if (hasConflict) conflicts.push(dateStr);
  }

  if (conflicts.length > 0) {
    return {
      success: false,
      error: `Conflicts exist on: ${conflicts.join(", ")}. Please choose different dates.`,
    };
  }

  // Price calculation
  const subtotal = Math.round((data.durationMinutes / 60) * space.hourlyRate);
  const recurringGroupId = `rcr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Create all bookings in a transaction
  const bookings = await db.$transaction(async (tx) => {
    const created = [];

    for (const dateStr of dates) {
      const dayStart = fromZonedTime(`${dateStr}T00:00:00`, tz);
      const startTime = new Date(dayStart.getTime() + data.startMinutes * 60_000);
      const endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000);

      const bk = await tx.booking.create({
        data: {
          facilityId,
          spaceId: data.spaceId,
          customerId: customer.id,
          startTime,
          endTime,
          duration: data.durationMinutes,
          type: "RECURRING",
          recurringGroupId,
          recurringRule: { frequency: "weekly", weeks: data.weeks },
          subtotal,
          total: subtotal,
          status: "CONFIRMED",
          source: "web",
          customerNotes: data.customerNotes,
        },
      });

      await tx.payment.create({
        data: {
          facilityId,
          customerId: customer.id,
          bookingId: bk.id,
          type: "BOOKING",
          amount: subtotal,
          status: "PENDING",
          description: `${space.name} — ${data.durationMinutes} min recurring rental`,
        },
      });

      created.push(bk);
    }

    // Update customer stats
    await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalBookings: { increment: data.weeks },
        lastBookingDate: new Date(),
      },
    });

    return created;
  });

  // Send confirmation email for first occurrence
  const firstBooking = bookings[0];
  if (firstBooking && customer.email) {
    const startTime = firstBooking.startTime;
    await sendBookingConfirmation({
      to: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      spaceName: space.name,
      facilityName: space.facility.name,
      date: new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(startTime),
      startTime: new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(startTime),
      endTime: new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(firstBooking.endTime),
      duration: data.durationMinutes,
      total: subtotal * data.weeks,
      bookingId: firstBooking.id,
      isRecurring: true,
      recurringWeeks: data.weeks,
    }).catch((err) => console.error("[email] Failed to send confirmation:", err));
  }

  // Schedule reminders for each occurrence via Inngest
  for (const booking of bookings) {
    if (customer.email) {
      await inngest
        .send({
          name: "booking/created",
          data: {
            bookingId: booking.id,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            customerEmail: customer.email,
            customerName: `${customer.firstName} ${customer.lastName}`.trim(),
            spaceName: space.name,
            facilityName: space.facility.name,
            facilityTimezone: tz,
          },
        })
        .catch((err) => console.error("[inngest] Failed to send event:", err));
    }
  }

  revalidatePath("/admin/calendar");
  revalidatePath("/schedule");

  return {
    success: true,
    recurringGroupId,
    count: bookings.length,
    firstBookingId: bookings[0]?.id,
  };
}

// Cancel all bookings in a recurring group
export async function cancelRecurringGroup(recurringGroupId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true },
  });

  const adminCheck = await db.facilityAdmin.findFirst({
    where: { facilityId, clerkUserId: userId },
  });

  if (!customer && !adminCheck) throw new Error("Unauthorized");

  // Find all future bookings in group
  const bookings = await db.booking.findMany({
    where: {
      recurringGroupId,
      facilityId,
      status: { in: ["CONFIRMED", "PENDING"] },
      startTime: { gte: new Date() },
      ...(customer && !adminCheck ? { customerId: customer.id } : {}),
    },
    include: { payment: { select: { id: true, status: true } } },
  });

  await db.$transaction(async (tx) => {
    for (const booking of bookings) {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: adminCheck ? "admin" : "customer",
        },
      });

      if (booking.payment?.status === "PENDING") {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "REFUNDED" },
        });
      }
    }

    if (customer) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { totalBookings: { decrement: bookings.length } },
      });
    }
  });

  revalidatePath("/admin/calendar");
  revalidatePath("/schedule");

  return { success: true, cancelled: bookings.length };
}
