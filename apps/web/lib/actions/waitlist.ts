"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentFacilityId } from "./facility";
export { notifyWaitlistForSlot } from "@/lib/waitlist-helpers";

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

// notifyWaitlistForSlot is re-exported from @/lib/waitlist-helpers above
