"use client";

import { useTransition } from "react";
import { adminUpdateBookingStatus } from "@/lib/actions/admin-bookings";
import { formatCents } from "@/lib/booking-utils";

const VIEW_START = 6 * 60;  // 6:00 AM
const VIEW_END = 23 * 60;   // 11:00 PM
const TOTAL_MINS = VIEW_END - VIEW_START;
const PX_PER_MIN = 1.4;
const TOTAL_HEIGHT = TOTAL_MINS * PX_PER_MIN;

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""} ${ampm}`;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 border-emerald-400 text-emerald-900",
  CHECKED_IN: "bg-blue-100 border-blue-400 text-blue-900",
  COMPLETED: "bg-slate-100 border-slate-300 text-slate-600",
  CANCELLED: "bg-red-100 border-red-300 text-red-700 opacity-50",
  NO_SHOW: "bg-orange-100 border-orange-300 text-orange-800 opacity-60",
  PENDING: "bg-yellow-100 border-yellow-400 text-yellow-900",
};

interface BookingBlock {
  id: string;
  startMinutes: number; // local minutes from midnight
  duration: number;
  status: string;
  customerName: string;
  total: number;
  spaceId: string;
}

interface SpaceColumn {
  id: string;
  name: string;
}

interface Props {
  spaces: SpaceColumn[];
  bookings: BookingBlock[];
  timezone: string;
}

function BookingCard({ booking }: { booking: BookingBlock }) {
  const [, startTransition] = useTransition();
  const colorClass = STATUS_COLORS[booking.status] ?? "bg-slate-100 border-slate-300";
  const heightPx = Math.max(booking.duration * PX_PER_MIN, 28);
  const topPx = (booking.startMinutes - VIEW_START) * PX_PER_MIN;

  return (
    <div
      className={`absolute left-1 right-1 rounded border px-1.5 py-1 text-xs overflow-hidden cursor-pointer hover:z-10 hover:shadow-md transition-shadow ${colorClass}`}
      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
      title={`${booking.customerName} — ${minutesToTimeStr(booking.startMinutes)} (${booking.duration}min)`}
    >
      <div className="font-semibold truncate leading-tight">{booking.customerName}</div>
      {heightPx > 40 && (
        <div className="opacity-70 truncate leading-tight">
          {minutesToTimeStr(booking.startMinutes)} · {formatCents(booking.total)}
        </div>
      )}
      {heightPx > 60 && booking.status === "CONFIRMED" && (
        <button
          className="mt-1 text-blue-600 hover:underline text-xs"
          onClick={(e) => {
            e.stopPropagation();
            startTransition(async () => { await adminUpdateBookingStatus(booking.id, "CHECKED_IN"); });
          }}
        >
          Check In
        </button>
      )}
    </div>
  );
}

export function ResourceDayView({ spaces, bookings, timezone }: Props) {
  // Generate hour labels
  const hourLabels: number[] = [];
  for (let m = VIEW_START; m <= VIEW_END; m += 60) {
    hourLabels.push(m);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Header: time gutter + space column headers */}
        <div
          className="grid border-b border-slate-200 bg-slate-50"
          style={{
            gridTemplateColumns: `64px repeat(${spaces.length}, minmax(120px, 1fr))`,
          }}
        >
          <div className="py-2 px-2 text-xs text-slate-400" />
          {spaces.map((space) => (
            <div
              key={space.id}
              className="py-2 px-2 text-center text-xs font-semibold text-slate-700 border-l border-slate-200 truncate"
            >
              {space.name}
            </div>
          ))}
        </div>

        {/* Body: time axis + space columns */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `64px repeat(${spaces.length}, minmax(120px, 1fr))`,
            height: `${TOTAL_HEIGHT}px`,
          }}
        >
          {/* Time gutter */}
          <div className="relative border-r border-slate-200">
            {hourLabels.map((m) => (
              <div
                key={m}
                className="absolute left-0 right-0 flex items-start"
                style={{ top: `${(m - VIEW_START) * PX_PER_MIN}px` }}
              >
                <span className="text-xs text-slate-400 pr-2 leading-none w-full text-right">
                  {minutesToTimeStr(m)}
                </span>
              </div>
            ))}
          </div>

          {/* Space columns */}
          {spaces.map((space) => {
            const spaceBookings = bookings.filter((b) => b.spaceId === space.id);
            return (
              <div
                key={space.id}
                className="relative border-l border-slate-200"
                style={{ height: `${TOTAL_HEIGHT}px` }}
              >
                {/* Hour grid lines */}
                {hourLabels.map((m) => (
                  <div
                    key={m}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: `${(m - VIEW_START) * PX_PER_MIN}px` }}
                  />
                ))}
                {/* Bookings */}
                {spaceBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
