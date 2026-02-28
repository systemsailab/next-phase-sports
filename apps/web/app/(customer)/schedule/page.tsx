import { getMyBookings } from "@/lib/actions/bookings";
import { getMyWaitlist } from "@/lib/actions/waitlist";
import { getMyPayments } from "@/lib/actions/payments";
import { db } from "@/lib/db";
import { getCurrentFacilityId } from "@/lib/actions/facility";
import { Badge } from "@/components/ui/badge";
import { CancelBookingButton } from "@/components/booking/cancel-button";
import { LeaveWaitlistButton } from "@/components/booking/leave-waitlist-button";
import { spaceTypeLabel, formatCents } from "@/lib/booking-utils";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  CreditCard,
  Bell,
  ArrowRight,
  Zap,
} from "lucide-react";

function statusBadgeConfig(status: string) {
  switch (status) {
    case "CONFIRMED":
      return { variant: "default" as const, className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Confirmed" };
    case "CHECKED_IN":
      return { variant: "default" as const, className: "bg-blue-50 text-blue-700 border-blue-200", label: "Checked In" };
    case "COMPLETED":
      return { variant: "secondary" as const, className: "bg-slate-100 text-slate-600", label: "Completed" };
    case "CANCELLED":
      return { variant: "destructive" as const, className: "bg-red-50 text-red-600 border-red-200", label: "Cancelled" };
    default:
      return { variant: "outline" as const, className: "", label: status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ") };
  }
}

function paymentStatusBadge(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return { variant: "default" as const, className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Paid" };
    case "PENDING":
    case "PROCESSING":
      return { variant: "outline" as const, className: "border-amber-200 text-amber-700 bg-amber-50", label: "Pending" };
    case "FAILED":
      return { variant: "destructive" as const, className: "bg-red-50 text-red-600 border-red-200", label: "Failed" };
    case "REFUNDED":
      return { variant: "outline" as const, className: "border-blue-200 text-blue-700 bg-blue-50", label: "Refunded" };
    case "PARTIALLY_REFUNDED":
      return { variant: "outline" as const, className: "border-blue-200 text-blue-700 bg-blue-50", label: "Partial Refund" };
    default:
      return { variant: "outline" as const, className: "", label: status };
  }
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

function SectionHeader({
  icon: Icon,
  title,
  count,
  iconColor = "text-slate-400",
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100">
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Schedule</h1>
          <p className="text-slate-500 mt-1 text-sm">Your upcoming and past sessions.</p>
        </div>
        <Link
          href="/book"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20"
        >
          Book a Space
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Upcoming */}
      <section>
        <SectionHeader icon={CalendarDays} title="Upcoming" count={upcoming.length} iconColor="text-emerald-500" />
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-7 h-7 text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">No upcoming bookings</p>
            <p className="text-sm text-slate-400 mt-1">Your next session will appear here.</p>
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 mt-4 transition-colors"
            >
              Book a Space <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((booking) => {
              const badge = statusBadgeConfig(booking.status);
              return (
                <div
                  key={booking.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex gap-3.5 flex-1 min-w-0">
                    <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">
                          {booking.space.name}
                        </span>
                        <Badge variant="secondary" className="text-[11px] font-medium shrink-0">
                          {spaceTypeLabel(booking.space.type)}
                        </Badge>
                        <Badge variant={badge.variant} className={`text-[11px] font-medium shrink-0 ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {formatLocalTime(booking.startTime, tz)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {booking.duration} min
                        </span>
                        {booking.payment && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> {formatCents(booking.payment.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {["CONFIRMED", "PENDING"].includes(booking.status) && (
                    <CancelBookingButton bookingId={booking.id} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <section>
          <SectionHeader icon={Bell} title="Waitlist" count={waitlist.length} iconColor="text-amber-500" />
          <div className="space-y-2.5">
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 sm:p-5"
              >
                <div className="flex gap-3.5 flex-1 min-w-0">
                  <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 truncate">
                        {entry.space?.name ?? "Any space"}
                      </span>
                      <Badge variant="outline" className="text-[11px] font-medium shrink-0 border-amber-300 text-amber-700 bg-amber-50">
                        {entry.status === "NOTIFIED" ? (
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Slot Available!</span>
                        ) : "Waiting"}
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
                      <p className="text-xs text-slate-400 mt-0.5">
                        {entry.preferredTimeStart} – {entry.preferredTimeEnd}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Joined {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
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
          <SectionHeader icon={CreditCard} title="Payment History" count={payments.length} iconColor="text-violet-500" />
          <div className="space-y-2.5">
            {payments.map((payment) => {
              const badge = paymentStatusBadge(payment.status);
              return (
                <div
                  key={payment.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
                >
                  <div className="flex gap-3.5 flex-1 min-w-0">
                    <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-violet-50 text-violet-500 shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-extrabold text-slate-900">
                          {formatCents(payment.amount)}
                        </span>
                        <Badge variant={badge.variant} className={`text-[11px] font-medium shrink-0 ${badge.className}`}>
                          {badge.label}
                        </Badge>
                        {payment.refundedAmount > 0 && payment.status !== "REFUNDED" && (
                          <span className="text-xs text-blue-600 font-medium">
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
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <SectionHeader icon={Clock} title="Past" count={past.length} iconColor="text-slate-400" />
          <div className="space-y-2.5">
            {past.map((booking) => {
              const badge = statusBadgeConfig(booking.status);
              return (
                <div
                  key={booking.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 sm:p-5"
                >
                  <div className="flex gap-3.5 flex-1 min-w-0">
                    <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-slate-100 text-slate-400 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-600 truncate">
                          {booking.space.name}
                        </span>
                        <Badge variant={badge.variant} className={`text-[11px] shrink-0 ${badge.className}`}>
                          {badge.label}
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
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

