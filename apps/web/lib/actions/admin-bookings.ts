"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { getCurrentFacilityId } from "./facility";
import { getAvailability } from "./availability";
import { sendBookingConfirmation } from "@/lib/email";
import { inngest } from "@/lib/inngest/client";

// ─── Admin: Search customers ─────────────────────────────────────────────────

export async function searchCustomers(query: string) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return [];

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (!["owner", "admin", "staff"].includes(role ?? "")) return [];

  return db.customer.findMany({
    where: {
      facilityId,
      status: { not: "ARCHIVED" },
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
    take: 10,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

// ─── Admin: Create customer (quick) ─────────────────────────────────────────

export async function adminCreateCustomer({
  firstName,
  lastName,
  email,
  phone,
}: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (!["owner", "admin", "staff"].includes(role ?? "")) throw new Error("Unauthorized");

  return db.customer.create({
    data: {
      facilityId,
      firstName,
      lastName,
      email: email ?? "",
      phone: phone ?? "",
      status: "ACTIVE",
      source: "admin",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });
}

// ─── Admin: Create booking for any customer ──────────────────────────────────

export const AdminCreateBookingSchema = z.object({
  spaceId: z.string(),
  customerId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinutes: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  source: z.enum(["admin", "walk-in"]).default("admin"),
  adminNotes: z.string().optional(),
  skipConflictCheck: z.boolean().default(false),
});

export type AdminCreateBookingInput = z.infer<typeof AdminCreateBookingSchema>;

export async function adminCreateBooking(input: AdminCreateBookingInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (!["owner", "admin", "staff"].includes(role ?? "")) throw new Error("Unauthorized");

  const data = AdminCreateBookingSchema.parse(input);

  const space = await db.space.findFirst({
    where: { id: data.spaceId, facilityId, isActive: true },
    include: { facility: { select: { timezone: true, bookingBufferMin: true, name: true } } },
  });
  if (!space) throw new Error("Space not found");

  const tz = space.facility.timezone;
  const dayStart = fromZonedTime(`${data.date}T00:00:00`, tz);
  const startTime = new Date(dayStart.getTime() + data.startMinutes * 60_000);
  const endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000);

  if (!data.skipConflictCheck) {
    const avail = await getAvailability(data.spaceId, data.date);
    if (!avail?.isOpen) throw new Error("Space is not available on this date");

    const buffer = space.bufferMinutes ?? space.facility.bookingBufferMin;
    const endMins = data.startMinutes + data.durationMinutes;
    const hasConflict = avail.bookedIntervals.some(
      (b) =>
        data.startMinutes < b.endMinutes + buffer &&
        endMins > b.startMinutes - buffer
    );
    if (hasConflict)
      throw new Error("This time slot conflicts with an existing booking.");
  }

  const subtotal = Math.round((data.durationMinutes / 60) * space.hourlyRate);

  const customer = await db.customer.findUnique({
    where: { id: data.customerId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!customer) throw new Error("Customer not found");

  const booking = await db.$transaction(async (tx) => {
    const bk = await tx.booking.create({
      data: {
        facilityId,
        spaceId: data.spaceId,
        customerId: data.customerId,
        startTime,
        endTime,
        duration: data.durationMinutes,
        type: data.source === "walk-in" ? "WALK_IN" : "RENTAL",
        subtotal,
        total: subtotal,
        status: "CONFIRMED",
        source: data.source,
        adminNotes: data.adminNotes,
      },
    });

    await tx.payment.create({
      data: {
        facilityId,
        customerId: data.customerId,
        bookingId: bk.id,
        type: "BOOKING",
        amount: subtotal,
        status: "PENDING",
        description: `${space.name} — ${data.durationMinutes} min (${data.source})`,
      },
    });

    await tx.customer.update({
      where: { id: data.customerId },
      data: { totalBookings: { increment: 1 }, lastBookingDate: new Date() },
    });

    return bk;
  });

  // Send confirmation if customer has email
  if (customer.email) {
    const fmtDate = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric",
    }).format(startTime);
    const fmtStart = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
    }).format(startTime);
    const fmtEnd = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
    }).format(endTime);

    sendBookingConfirmation({
      to: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      spaceName: space.name,
      facilityName: space.facility.name,
      date: fmtDate,
      startTime: fmtStart,
      endTime: fmtEnd,
      duration: data.durationMinutes,
      total: subtotal,
      bookingId: booking.id,
    }).catch(() => {});

    inngest.send({
      name: "booking/created",
      data: {
        bookingId: booking.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        spaceName: space.name,
        facilityName: space.facility.name,
        facilityTimezone: tz,
      },
    }).catch(() => {});
  }

  revalidatePath("/admin/calendar");
  return { success: true, bookingId: booking.id };
}

// ─── Admin: Update booking status ────────────────────────────────────────────

export async function adminUpdateBookingStatus(
  bookingId: string,
  status: "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "NO_SHOW" | "CANCELLED"
) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (!["owner", "admin", "staff"].includes(role ?? "")) throw new Error("Unauthorized");

  await db.booking.updateMany({
    where: { id: bookingId, facilityId },
    data: {
      status,
      ...(status === "CHECKED_IN" ? { checkedIn: true, checkInTime: new Date() } : {}),
      ...(status === "COMPLETED" ? { checkOutTime: new Date() } : {}),
      ...(status === "CANCELLED" ? { cancelledAt: new Date(), cancelledBy: "admin" } : {}),
    },
  });

  revalidatePath("/admin/calendar");
  return { success: true };
}
