// Client-safe booking utilities — no "use server"
// These can be imported in both server components and client components.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayAvailability {
  isOpen: boolean;
  openMinutes: number | null;
  closeMinutes: number | null;
  bookedIntervals: { startMinutes: number; endMinutes: number; bookingId: string }[];
  minBookingMinutes: number;
  maxBookingMinutes: number;
  bookingIncrements: number;
  bufferMinutes: number;
  hourlyRate: number;   // cents
  halfHourRate: number | null;
  memberHourlyRate: number | null;
  timezone: string;
  spaceName: string;
}

export interface TimeSlot {
  startMinutes: number;
  endMinutes: number;
  available: boolean;
  price: number; // cents
}

// ─── Slot Computation ────────────────────────────────────────────────────────

/**
 * Pure function: given DayAvailability, compute all possible start-time slots
 * for a booking of `durationMinutes` length.
 */
export function computeAvailableSlots(
  avail: DayAvailability,
  durationMinutes: number
): TimeSlot[] {
  if (!avail.isOpen || avail.openMinutes == null || avail.closeMinutes == null) {
    return [];
  }

  const slots: TimeSlot[] = [];
  const { openMinutes, closeMinutes, bookedIntervals, bookingIncrements, hourlyRate } = avail;

  for (
    let start = openMinutes;
    start + durationMinutes <= closeMinutes;
    start += bookingIncrements
  ) {
    const end = start + durationMinutes;

    const blocked = bookedIntervals.some(
      (b) => start < b.endMinutes && end > b.startMinutes
    );

    const price = Math.round((durationMinutes / 60) * hourlyRate);
    slots.push({ startMinutes: start, endMinutes: end, available: !blocked, price });
  }

  return slots;
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/** Convert minutes-from-midnight → "9:00 AM" */
export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Format cents → "$75.00" */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Parse "HH:MM" → minutes from midnight */
export function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Compute valid duration options for a given availability + start time */
export function getDurationOptions(
  avail: DayAvailability,
  startMinutes: number
): { label: string; value: number; price: number }[] {
  if (!avail.isOpen || avail.closeMinutes == null) return [];

  const { bookedIntervals, minBookingMinutes, maxBookingMinutes, bookingIncrements, closeMinutes } =
    avail;

  // Find next blocking interval after startMinutes
  let latestEnd = closeMinutes;
  for (const b of bookedIntervals) {
    if (b.startMinutes > startMinutes && b.startMinutes < latestEnd) {
      latestEnd = b.startMinutes;
    }
  }

  const options: { label: string; value: number; price: number }[] = [];

  for (
    let dur = minBookingMinutes;
    dur <= Math.min(maxBookingMinutes, latestEnd - startMinutes);
    dur += bookingIncrements
  ) {
    const price = Math.round((dur / 60) * avail.hourlyRate);
    const label =
      dur < 60
        ? `${dur} min`
        : dur === 60
        ? "1 hr"
        : dur % 60 === 0
        ? `${dur / 60} hrs`
        : `${Math.floor(dur / 60)} hr ${dur % 60} min`;

    options.push({ label: `${label} — ${formatCents(price)}`, value: dur, price });
  }

  return options;
}

/** Format a datetime in a given timezone */
export function formatBookingTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Get today's date string "YYYY-MM-DD" in a target timezone */
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

/** Space type → display label */
export function spaceTypeLabel(type: string): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
