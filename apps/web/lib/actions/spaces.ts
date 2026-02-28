"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";
import { getCurrentFacilityId } from "./facility";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const SPACE_TYPES = [
  { value: "TURF_FIELD", label: "Turf Field" },
  { value: "GRASS_FIELD", label: "Grass Field" },
  { value: "COURT", label: "Court" },
  { value: "BATTING_CAGE", label: "Batting Cage" },
  { value: "PITCHING_TUNNEL", label: "Pitching Tunnel" },
  { value: "WEIGHT_ROOM", label: "Weight Room" },
  { value: "TRAINING_ROOM", label: "Training Room" },
  { value: "CLASSROOM", label: "Classroom" },
  { value: "PARTY_ROOM", label: "Party Room" },
  { value: "POOL", label: "Pool" },
  { value: "TRACK", label: "Track" },
  { value: "RINK", label: "Rink" },
  { value: "OTHER", label: "Other" },
] as const;

export const SpaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "TURF_FIELD", "GRASS_FIELD", "COURT", "BATTING_CAGE",
    "PITCHING_TUNNEL", "WEIGHT_ROOM", "TRAINING_ROOM", "CLASSROOM",
    "PARTY_ROOM", "POOL", "TRACK", "RINK", "OTHER",
  ]),
  description: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  squareFootage: z.coerce.number().int().positive().optional().nullable(),

  // Pricing (dollars → store as cents)
  hourlyRate: z.coerce.number().positive("Hourly rate is required"),
  halfHourRate: z.coerce.number().positive().optional().nullable(),
  memberHourlyRate: z.coerce.number().positive().optional().nullable(),

  // Scheduling
  minBookingMinutes: z.coerce.number().int().positive().default(60),
  maxBookingMinutes: z.coerce.number().int().positive().default(180),
  bookingIncrements: z.coerce.number().int().positive().default(30),
  bufferMinutes: z.coerce.number().int().nonnegative().optional().nullable(),

  // Grouping
  groupName: z.string().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export type SpaceInput = z.infer<typeof SpaceSchema>;

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
