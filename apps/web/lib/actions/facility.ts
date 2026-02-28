"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  FacilitySchema,
  OperatingHoursSchema,
  CancellationPolicySchema,
} from "@/lib/schemas/facility";
import type { FacilityInput, OperatingHoursInput, CancellationPolicyInput } from "@/lib/schemas/facility";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the facilityId for the current Clerk user.
 * Falls back to the demo facility (first facility) when metadata is empty.
 * If no facilities exist at all, returns null.
 */
export async function getCurrentFacilityId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metaFacilityId = user.publicMetadata?.facilityId as string | undefined;

  if (metaFacilityId) return metaFacilityId;

  // Auto-associate first user with demo facility
  const firstFacility = await db.facility.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (firstFacility) {
    // Cache it on the Clerk user so we don't hit DB every time
    await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        facilityId: firstFacility.id,
        role: user.publicMetadata?.role ?? "owner",
      },
    });
    return firstFacility.id;
  }

  return null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getFacility() {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return null;

  return db.facility.findUnique({
    where: { id: facilityId },
    include: {
      _count: {
        select: { spaces: true, customers: true, bookings: true },
      },
    },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createFacility(input: FacilityInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const data = FacilitySchema.parse(input);

  const facility = await db.facility.create({
    data: {
      ...data,
      operatingHours: {
        monday: { open: "06:00", close: "22:00", closed: false },
        tuesday: { open: "06:00", close: "22:00", closed: false },
        wednesday: { open: "06:00", close: "22:00", closed: false },
        thursday: { open: "06:00", close: "22:00", closed: false },
        friday: { open: "06:00", close: "22:00", closed: false },
        saturday: { open: "07:00", close: "22:00", closed: false },
        sunday: { open: "08:00", close: "21:00", closed: false },
      },
      cancellationPolicy: {
        fullRefundHours: 24,
        creditOnlyHours: 6,
        noRefundHours: 2,
      },
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
    },
  });

  // Associate this user with the new facility
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      facilityId: facility.id,
      role: "owner",
    },
  });

  revalidatePath("/admin");
  return facility;
}

// ─── Update: Facility Info ────────────────────────────────────────────────────

export async function updateFacilityInfo(input: FacilityInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const data = FacilitySchema.parse(input);

  const facility = await db.facility.update({
    where: { id: facilityId },
    data,
  });

  revalidatePath("/admin/settings");
  return { success: true, facility };
}

// ─── Update: Operating Hours ──────────────────────────────────────────────────

export async function updateOperatingHours(input: OperatingHoursInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const hours = OperatingHoursSchema.parse(input);

  const facility = await db.facility.update({
    where: { id: facilityId },
    data: { operatingHours: hours },
  });

  revalidatePath("/admin/settings");
  return { success: true, facility };
}

// ─── Update: Policies ────────────────────────────────────────────────────────

export async function updateFacilityPolicies(input: CancellationPolicyInput) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) throw new Error("No facility found");

  const data = CancellationPolicySchema.parse(input);

  const { bookingBufferMin, requireWaiver, allowWalkIns, unmannedMode, ...policy } = data;

  const facility = await db.facility.update({
    where: { id: facilityId },
    data: {
      cancellationPolicy: policy,
      bookingBufferMin,
      requireWaiver,
      allowWalkIns,
      unmannedMode,
    },
  });

  revalidatePath("/admin/settings");
  return { success: true, facility };
}
