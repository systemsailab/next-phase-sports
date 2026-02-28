"use server";

import { db } from "@/lib/db";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getCurrentFacilityId } from "./facility";
import type { DayAvailability } from "@/lib/booking-utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "HH:MM" → minutes from midnight */
function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Get the day key from a Date in a given IANA timezone */
function getDayKey(date: Date, timezone: string): string {
  // "monday", "tuesday", etc.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  })
    .format(date)
    .toLowerCase();
}

/** Convert "YYYY-MM-DD" + IANA timezone → UTC Date for start of that local day */
function startOfLocalDay(dateStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, timezone);
}

/** Convert "YYYY-MM-DD" + IANA timezone → UTC Date for end of that local day */
function endOfLocalDay(dateStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59`, timezone);
}

/** Given a UTC datetime, return minutes from midnight in the given timezone */
function utcToLocalMinutes(utc: Date, timezone: string): number {
  const local = toZonedTime(utc, timezone);
  return local.getHours() * 60 + local.getMinutes();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Get availability for a specific space on a specific date.
 * @param spaceId  The space to check
 * @param dateStr  "YYYY-MM-DD" in facility local timezone
 */
export async function getAvailability(
  spaceId: string,
  dateStr: string
): Promise<DayAvailability | null> {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return null;

  // Load space + facility in one query
  const space = await db.space.findFirst({
    where: { id: spaceId, facilityId },
    include: { facility: true },
  });

  if (!space) return null;

  const tz = space.facility.timezone;
  const dayKey = getDayKey(startOfLocalDay(dateStr, tz), tz);

  // Determine operating hours: space override → facility hours → closed
  const facilityHours = space.facility.operatingHours as Record<
    string,
    { open: string; close: string; closed: boolean }
  > | null;

  const spaceHours = space.operatingHours as Record<
    string,
    { open: string; close: string; closed: boolean }
  > | null;

  const dayHours = spaceHours?.[dayKey] ?? facilityHours?.[dayKey] ?? null;

  const isClosed = !dayHours || dayHours.closed === true;

  if (isClosed) {
    return {
      isOpen: false,
      openMinutes: null,
      closeMinutes: null,
      bookedIntervals: [],
      minBookingMinutes: space.minBookingMinutes,
      maxBookingMinutes: space.maxBookingMinutes,
      bookingIncrements: space.bookingIncrements,
      bufferMinutes: space.bufferMinutes ?? space.facility.bookingBufferMin,
      hourlyRate: space.hourlyRate,
      halfHourRate: space.halfHourRate,
      memberHourlyRate: space.memberHourlyRate,
      timezone: tz,
      spaceName: space.name,
    };
  }

  const openMinutes = timeStringToMinutes(dayHours.open);
  const closeMinutes = timeStringToMinutes(dayHours.close);

  // Query existing bookings for this space on this date
  const dayStart = startOfLocalDay(dateStr, tz);
  const dayEnd = endOfLocalDay(dateStr, tz);

  const existingBookings = await db.booking.findMany({
    where: {
      spaceId,
      facilityId,
      status: { in: ["CONFIRMED", "PENDING", "CHECKED_IN"] },
      startTime: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  const buffer = space.bufferMinutes ?? space.facility.bookingBufferMin;

  // Convert DB UTC times to local minutes, expanding by buffer
  const bookedIntervals = existingBookings.map((b) => ({
    bookingId: b.id,
    startMinutes: Math.max(0, utcToLocalMinutes(b.startTime, tz) - buffer),
    endMinutes: utcToLocalMinutes(b.endTime, tz) + buffer,
  }));

  return {
    isOpen: true,
    openMinutes,
    closeMinutes,
    bookedIntervals,
    minBookingMinutes: space.minBookingMinutes,
    maxBookingMinutes: space.maxBookingMinutes,
    bookingIncrements: space.bookingIncrements,
    bufferMinutes: buffer,
    hourlyRate: space.hourlyRate,
    halfHourRate: space.halfHourRate,
    memberHourlyRate: space.memberHourlyRate,
    timezone: tz,
    spaceName: space.name,
  };
}

/**
 * Returns availability for all spaces in the facility on a given date.
 * Used for admin calendar day view.
 */
export async function getAllSpacesAvailability(dateStr: string) {
  const facilityId = await getCurrentFacilityId();
  if (!facilityId) return [];

  const spaces = await db.space.findMany({
    where: { facilityId, isActive: true },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const results = await Promise.all(
    spaces.map(async (s) => ({
      spaceId: s.id,
      spaceName: s.name,
      availability: await getAvailability(s.id, dateStr),
    }))
  );

  return results;
}
