"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentFacilityId } from "./facility";
import { sendWaitlistNotification } from "@/lib/email";

// ─── Join Waitlist ──────────────────────────────────────────────────────────

export async function joinWaitlist({
  spaceId,
  preferredDate,
  preferredTimeStart,
  preferredTimeEnd,
}: {
  spaceId: string;
  preferredDate: string; // YYYY-MM-DD
  preferredTimeStart: string; // "HH:MM"
  preferredTimeEnd: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Must be logged in to join waitlist");

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true },
  });
  if (!customer) throw new Error("Customer account not found");

  // Check for existing active waitlist entry for same slot
  const existing = await db.waitlistEntry.findFirst({
    where: {
      facilityId,
      customerId: customer.id,
      spaceId,
      preferredDate: new Date(preferredDate),
      preferredTimeStart,
      status: { in: ["WAITING", "NOTIFIED"] },
    },
  });

  if (existing) {
    return { success: true, alreadyOnList: true };
  }

  await db.waitlistEntry.create({
    data: {
      facilityId,
      customerId: customer.id,
      spaceId,
      preferredDate: new Date(preferredDate),
      preferredTimeStart,
      preferredTimeEnd,
      status: "WAITING",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72hr default
    },
  });

  revalidatePath("/schedule");
  return { success: true, alreadyOnList: false };
}

// ─── Get my waitlist entries ─────────────────────────────────────────────────

export async function getMyWaitlist() {
  const { userId } = await auth();
  if (!userId) return [];

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return [];

  const customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true },
  });
  if (!customer) return [];

  const entries = await db.waitlistEntry.findMany({
    where: {
      facilityId,
      customerId: customer.id,
      status: { in: ["WAITING", "NOTIFIED"] },
    },
    orderBy: { createdAt: "asc" },
  });

  // Fetch space names for entries that have a spaceId
  const spaceIds = [...new Set(entries.map((e) => e.spaceId).filter(Boolean))] as string[];
  const spaces = spaceIds.length
    ? await db.space.findMany({
        where: { id: { in: spaceIds } },
        select: { id: true, name: true, type: true },
      })
    : [];
  const spaceMap = Object.fromEntries(spaces.map((s) => [s.id, s]));

  return entries.map((e) => ({
    ...e,
    space: e.spaceId ? (spaceMap[e.spaceId] ?? null) : null,
  }));
}

// ─── Leave Waitlist ──────────────────────────────────────────────────────────

export async function leaveWaitlist(waitlistEntryId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility");

  const customer = await db.customer.findFirst({
    where: { facilityId, clerkUserId: userId },
    select: { id: true },
  });
  if (!customer) throw new Error("No customer account");

  await db.waitlistEntry.updateMany({
    where: {
      id: waitlistEntryId,
      customerId: customer.id, // security: must own it
    },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/schedule");
  return { success: true };
}

// ─── Notify Waitlist on Slot Opening (called internally) ─────────────────────

export async function notifyWaitlistForSlot({
  facilityId,
  spaceId,
  startTime,
  endTime,
}: {
  facilityId: string;
  spaceId: string;
  startTime: Date;
  endTime: Date;
}) {
  // Find waiting entries that overlap with this freed slot
  const dateStr = startTime.toISOString().slice(0, 10);
  const startHHMM = startTime.toTimeString().slice(0, 5);
  const endHHMM = endTime.toTimeString().slice(0, 5);

  const entries = await db.waitlistEntry.findMany({
    where: {
      facilityId,
      spaceId,
      status: "WAITING",
      OR: [
        { preferredDate: null },
        { preferredDate: new Date(dateStr) },
      ],
    },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  if (entries.length === 0) return;

  const [facility, space] = await Promise.all([
    db.facility.findUnique({
      where: { id: facilityId },
      select: { name: true, timezone: true },
    }),
    db.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    }),
  ]);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: facility?.timezone ?? "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(startTime);

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: facility?.timezone ?? "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startTime);

  const endLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: facility?.timezone ?? "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(endTime);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const entry of entries) {
    // Mark as notified
    await db.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: "NOTIFIED",
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4hr to act
      },
    });

    await sendWaitlistNotification({
      to: entry.customer.email,
      customerName: `${entry.customer.firstName} ${entry.customer.lastName}`.trim(),
      spaceName: space?.name ?? "The space",
      facilityName: facility?.name ?? "The facility",
      date: dateLabel,
      startTime: timeLabel,
      endTime: endLabel,
      expiresInHours: 4,
      bookingUrl: `${baseUrl}/book/${spaceId}`,
    });
  }
}
