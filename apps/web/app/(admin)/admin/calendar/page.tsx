import { getCalendarBookings } from "@/lib/actions/bookings";
import { db } from "@/lib/db";
import { getCurrentFacilityId } from "@/lib/actions/facility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { spaceTypeLabel, formatCents } from "@/lib/booking-utils";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ start?: string }>;
}

function getWeekStart(dateStr?: string): Date {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  if (isNaN(base.getTime())) return new Date();
  const day = base.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  const monday = new Date(base);
  monday.setDate(base.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatDayHeading(d: Date, tz: string): { weekday: string; date: string } {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
  const parts = fmt.formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return { weekday, date: `${month} ${day}` };
}

function formatTime(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function statusColor(status: string): string {
  switch (status) {
    case "CONFIRMED": return "bg-emerald-100 border-emerald-300 text-emerald-800";
    case "CHECKED_IN": return "bg-blue-100 border-blue-300 text-blue-800";
    case "COMPLETED": return "bg-slate-100 border-slate-300 text-slate-600";
    case "CANCELLED": return "bg-red-100 border-red-300 text-red-700";
    default: return "bg-yellow-100 border-yellow-300 text-yellow-800";
  }
}

export default async function CalendarPage({ searchParams }: Props) {
  const { start: startParam } = await searchParams;

  const weekStart = getWeekStart(startParam);
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = dateToStr(weekStart);
  const weekEndStr = dateToStr(weekEnd);

  const prevWeekStr = dateToStr(addDays(weekStart, -7));
  const nextWeekStr = dateToStr(addDays(weekStart, 7));

  const facilityId = await getCurrentFacilityId();
  const facility = facilityId
    ? await db.facility.findUnique({
        where: { id: facilityId },
        select: { timezone: true, name: true },
      })
    : null;
  const tz = facility?.timezone ?? "America/New_York";

  const bookings = await getCalendarBookings(weekStartStr, weekEndStr);

  // Build array of 7 day buckets
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayStr = dateToStr(day);

    const dayBookings = bookings.filter((b) => {
      const bDayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(b.startTime);
      return bDayStr === dayStr;
    });

    return { day, dayStr, dayBookings };
  });

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const totalBookings = bookings.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All bookings across your spaces
          </p>
        </div>
        <Badge variant="secondary">
          {totalBookings} booking{totalBookings !== 1 ? "s" : ""} this week
        </Badge>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/calendar?start=${prevWeekStr}`}>← Prev</Link>
        </Button>
        <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">
          {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          {" – "}
          {weekEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/calendar?start=${nextWeekStr}`}>Next →</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/calendar">Today</Link>
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(({ day, dayStr, dayBookings }) => {
          const isToday = dayStr === today;
          const { weekday, date } = formatDayHeading(day, tz);
          return (
            <div key={dayStr} className="min-h-[200px]">
              {/* Day header */}
              <div
                className={`text-center py-2 px-1 rounded-t-lg mb-2 ${
                  isToday ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-wide">{weekday}</div>
                <div className={`text-sm font-semibold ${isToday ? "text-white" : "text-slate-900"}`}>
                  {date}
                </div>
              </div>

              {/* Bookings */}
              <div className="space-y-1.5">
                {dayBookings.length === 0 && (
                  <div className="text-xs text-slate-300 text-center py-3">—</div>
                )}
                {dayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`rounded-md border px-2 py-1.5 text-xs ${statusColor(booking.status)}`}
                  >
                    <div className="font-medium truncate">{booking.space.name}</div>
                    <div className="opacity-75 truncate">
                      {formatTime(booking.startTime, tz)}
                    </div>
                    <div className="opacity-75 truncate">
                      {booking.customer.firstName} {booking.customer.lastName}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="opacity-60">{booking.duration}m</span>
                      <span className="font-medium">{formatCents(booking.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
        <span className="font-medium">Legend:</span>
        {[
          { label: "Confirmed", cls: "bg-emerald-100 border-emerald-300" },
          { label: "Checked In", cls: "bg-blue-100 border-blue-300" },
          { label: "Completed", cls: "bg-slate-100 border-slate-300" },
          { label: "Cancelled", cls: "bg-red-100 border-red-300" },
          { label: "Pending", cls: "bg-yellow-100 border-yellow-300" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${cls}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

