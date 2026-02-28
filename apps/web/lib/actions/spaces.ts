"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentFacilityId } from "./facility";
import { SpaceSchema, type SpaceInput } from "@/lib/schemas/spaces";

// Convert dollar string from form to cents
function dollarsToCents(val: number | null | undefined): number | undefined {
  if (val == null) return undefined;
  return Math.round(val * 100);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSpaces() {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return [];

  return db.space.findMany({
    where: { facilityId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { bookings: true } },
    },
  });
}

export async function getSpace(spaceId: string) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return null;

  return db.space.findFirst({
    where: { id: spaceId, facilityId },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSpace(input: SpaceInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const data = SpaceSchema.parse(input);

  const space = await db.space.create({
    data: {
      facilityId,
      name: data.name,
      type: data.type,
      description: data.description,
      capacity: data.capacity,
      squareFootage: data.squareFootage,
      hourlyRate: dollarsToCents(data.hourlyRate)!,
      halfHourRate: dollarsToCents(data.halfHourRate),
      memberHourlyRate: dollarsToCents(data.memberHourlyRate),
      minBookingMinutes: data.minBookingMinutes,
      maxBookingMinutes: data.maxBookingMinutes,
      bookingIncrements: data.bookingIncrements,
      bufferMinutes: data.bufferMinutes,
      groupName: data.groupName,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });

  revalidatePath("/admin/settings/spaces");
  return { success: true, space };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateSpace(spaceId: string, input: SpaceInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const data = SpaceSchema.parse(input);

  const space = await db.space.updateMany({
    where: { id: spaceId, facilityId },
    data: {
      name: data.name,
      type: data.type,
      description: data.description,
      capacity: data.capacity,
      squareFootage: data.squareFootage,
      hourlyRate: dollarsToCents(data.hourlyRate)!,
      halfHourRate: dollarsToCents(data.halfHourRate),
      memberHourlyRate: dollarsToCents(data.memberHourlyRate),
      minBookingMinutes: data.minBookingMinutes,
      maxBookingMinutes: data.maxBookingMinutes,
      bookingIncrements: data.bookingIncrements,
      bufferMinutes: data.bufferMinutes,
      groupName: data.groupName,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });

  revalidatePath("/admin/settings/spaces");
  revalidatePath(`/admin/settings/spaces/${spaceId}`);
  return { success: true };
}

// ─── Toggle Active ────────────────────────────────────────────────────────────

export async function toggleSpaceActive(spaceId: string, isActive: boolean) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  await db.space.updateMany({
    where: { id: spaceId, facilityId },
    data: { isActive },
  });

  revalidatePath("/admin/settings/spaces");
  return { success: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSpace(spaceId: string) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  // Check for existing bookings
  const bookingCount = await db.booking.count({
    where: { spaceId, facilityId },
  });

  if (bookingCount > 0) {
    return {
      success: false,
      error: `Cannot delete — this space has ${bookingCount} existing booking(s). Deactivate it instead.`,
    };
  }

  await db.space.deleteMany({
    where: { id: spaceId, facilityId },
  });

  revalidatePath("/admin/settings/spaces");
  return { success: true };
}
