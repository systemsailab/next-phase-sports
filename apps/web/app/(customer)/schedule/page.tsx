import { getMyBookings } from "@/lib/actions/bookings";
import { getMyWaitlist } from "@/lib/actions/waitlist";
import { getMyPayments } from "@/lib/actions/payments";
import { db } from "@/lib/db";
import { getCurrentFacilityId } from "@/lib/actions/facility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/booking/cancel-button";
import { LeaveWaitlistButton } from "@/components/booking/leave-waitlist-button";
import { spaceTypeLabel, formatCents } from "@/lib/booking-utils";
import Link from "next/link";

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "CONFIRMED": return "default";
    case "CHECKED_IN": return "default";
    case "COMPLETED": return "secondary";
    case "CANCELLED": return "destructive";
    default: return "outline";
  }
}

function paymentStatusBadge(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return { variant: "default" as const, className: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Paid" };
    case "PENDING":
    case "PROCESSING":
      return { variant: "outline" as const, className: "border-amber-300 text-amber-700 bg-amber-50", label: "Pending" };
    case "FAILED":
      return { variant: "destructive" as const, className: "", label: "Failed" };
    case "REFUNDED":
      return { variant: "outline" as const, className: "border-blue-300 text-blue-700 bg-blue-50", label: "Refunded" };
    case "PARTIALLY_REFUNDED":
      return { variant: "outline" as const, className: "border-blue-300 text-blue-700 bg-blue-50", label: "Partial Refund" };
    default:
      return { variant: "outline" as const, className: "", label: status };
  }
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
}

function formatLocalTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default async function MySchedulePage() {
  const facilityId = await getCurrentFacilityId();
  const facility = facilityId
    ? await db.facility.findUnique({
        where: { id: facilityId },
        select: { timezone: true },
      })
    : null;

  const tz = facility?.timezone ?? "America/New_York";

  const [upcoming, past, waitlist, payments] = await Promise.all([
    getMyBookings("upcoming"),
    getMyBookings("past"),
    getMyWaitlist(),
    getMyPayments(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Schedule</h1>
        <p className="text-slate-500 mt-1">Your upcoming and past sessions.</p>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
            <p className="text-slate-400">No upcoming bookings.</p>
            <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" asChild>
              <Link href="/book">Book a Space →</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((booking) => (
              <div
                key={booking.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 truncate">
                      {booking.space.name}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {spaceTypeLabel(booking.space.type)}
                    </Badge>
                    <Badge
                      variant={statusBadgeVariant(booking.status)}
                      className="text-xs shrink-0"
                    >
                      {statusLabel(booking.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatLocalTime(booking.startTime, tz)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {booking.duration} min
                    {booking.payment && (
                      <> &middot; {formatCents(booking.payment.amount)}</>
                    )}
                  </p>
                </div>
                {["CONFIRMED", "PENDING"].includes(booking.status) && (
                  <CancelBookingButton bookingId={booking.id} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Waitlist ({waitlist.length})
          </h2>
          <div className="space-y-3">
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800 truncate">
                      {entry.space?.name ?? "Any space"}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0 border-amber-300 text-amber-700">
                      {entry.status === "NOTIFIED" ? "⚡ Slot Available!" : "Waiting"}
                    </Badge>
                  </div>
                  {entry.preferredDate && (
                    <p className="text-sm text-slate-500">
                      {new Date(entry.preferredDate).toLocaleDateString("en-US", {
                        weekday: "short", month: "long", day: "numeric",
                      })}
                    </p>
                  )}
                  {(entry.preferredTimeStart || entry.preferredTimeEnd) && (
                    <p className="text-xs text-slate-400">
                      {entry.preferredTimeStart} – {entry.preferredTimeEnd}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Joined {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <LeaveWaitlistButton entryId={entry.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Payment History ({payments.length})
          </h2>
          <div className="space-y-3">
            {payments.map((payment) => {
              const badge = paymentStatusBadge(payment.status);
              return (
                <div
                  key={payment.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">
                        {formatCents(payment.amount)}
                      </span>
                      <Badge variant={badge.variant} className={`text-xs shrink-0 ${badge.className}`}>
                        {badge.label}
                      </Badge>
                      {payment.refundedAmount > 0 && payment.status !== "REFUNDED" && (
                        <span className="text-xs text-blue-600">
                          ({formatCents(payment.refundedAmount)} refunded)
                        </span>
                      )}
                    </div>
                    {payment.booking && (
                      <p className="text-sm text-slate-500">
                        {payment.booking.space.name} &middot;{" "}
                        {formatLocalTime(payment.booking.startTime, tz)} &middot;{" "}
                        {payment.booking.duration} min
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(payment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {payment.stripeChargeId && <> &middot; Card</>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Past ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((booking) => (
              <div
                key={booking.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-700 truncate">
                      {booking.space.name}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {statusLabel(booking.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatLocalTime(booking.startTime, tz)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {booking.duration} min
                    {booking.payment && (
                      <> &middot; {formatCents(booking.payment.amount)}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

