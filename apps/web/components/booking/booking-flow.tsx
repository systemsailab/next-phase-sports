"use client";

import { useState, useTransition, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useUser, SignInButton } from "@clerk/nextjs";
import { getAvailability } from "@/lib/actions/availability";
import { createBooking } from "@/lib/actions/bookings";
import { createRecurringBookings } from "@/lib/actions/recurring-bookings";
import { joinWaitlist } from "@/lib/actions/waitlist";
import { PaymentForm } from "@/components/booking/payment-form";
import type { DayAvailability } from "@/lib/booking-utils";
import {
  computeAvailableSlots,
  getDurationOptions,
  minutesToTimeLabel,
  formatCents,
} from "@/lib/booking-utils";

type Step = "date" | "time" | "confirm" | "payment" | "done" | "waitlisted";

interface SpaceInfo {
  id: string;
  name: string;
  type: string;
  hourlyRate: number;
  halfHourRate: number | null;
  memberHourlyRate: number | null;
  minBookingMinutes: number;
  maxBookingMinutes: number | null;
  bookingIncrements: number;
}

interface Props {
  space: SpaceInfo;
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "date", label: "Date" },
    { key: "time", label: "Time & Duration" },
    { key: "confirm", label: "Confirm" },
    { key: "payment", label: "Payment" },
  ];
  const idx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-8 bg-slate-100/80 rounded-2xl p-2 sm:p-3">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1.5 sm:gap-2 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 transition-all duration-200 ${
                i < idx
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                  : i === idx
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                  : "bg-white text-slate-400 border border-slate-200"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs sm:text-sm truncate transition-colors ${
                i === idx ? "text-slate-900 font-semibold" : i < idx ? "text-emerald-600 font-medium" : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-4 sm:w-8 h-px shrink-0 ${i < idx ? "bg-emerald-300" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function BookingFlow({ space }: Props) {
  const { isSignedIn, user } = useUser();

  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dateStr, setDateStr] = useState<string>("");
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [availError, setAvailError] = useState<string | null>(null);

  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [recurringCount, setRecurringCount] = useState<number | null>(null);

  // Waitlist
  const [waitlistPending, startWaitlistTransition] = useTransition();
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const [confirming, startConfirming] = useTransition();
  const [bookingResult, setBookingResult] = useState<{
    id: string;
  } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [loadingAvail, startAvailTransition] = useTransition();

  // ─── STEP 1: date ────────────────────────────────────────────────────────────

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      setSelectedDate(date);
      setSelectedStart(null);
      setSelectedDuration(null);
      setAvailability(null);
      setAvailError(null);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const ds = `${year}-${month}-${day}`;
      setDateStr(ds);

      startAvailTransition(async () => {
        const result = await getAvailability(space.id, ds);
        if (!result || !result.isOpen) {
          setAvailError("This space is closed on the selected date.");
          setAvailability(null);
        } else {
          setAvailability(result);
          setAvailError(null);
          setStep("time");
        }
      });
    },
    [space.id]
  );

  // ─── STEP 2: time / duration ──────────────────────────────────────────────

  const slots30 = availability
    ? computeAvailableSlots(availability, availability.minBookingMinutes)
    : [];

  const uniqueStartTimes = Array.from(
    new Set(slots30.filter((s) => s.available).map((s) => s.startMinutes))
  ).sort((a, b) => a - b);

  const durationOptions =
    availability && selectedStart !== null
      ? getDurationOptions(availability, selectedStart)
      : [];

  const selectedPrice =
    durationOptions.find((d) => d.value === selectedDuration)?.price ?? null;

  // ─── STEP 3: confirm ──────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!selectedDate || selectedStart === null || !selectedDuration || !availability) return;
    setBookingError(null);

    startConfirming(async () => {
      try {
        if (isRecurring) {
          const result = await createRecurringBookings({
            spaceId: space.id,
            startDate: dateStr,
            startMinutes: selectedStart,
            durationMinutes: selectedDuration,
            weeks: recurringWeeks,
          });
          if (result.success) {
            setRecurringCount(result.count ?? null);
            setBookingResult({ id: result.firstBookingId ?? "" });
            // Recurring bookings: go to payment for first session
            setStep("payment");
          } else {
            setBookingError(result.error ?? "Failed to create recurring bookings.");
          }
        } else {
          const result = await createBooking({
            spaceId: space.id,
            date: dateStr,
            startMinutes: selectedStart,
            durationMinutes: selectedDuration,
          });
          if (result.success) {
            setBookingResult({ id: result.bookingId });
            // Go to payment step instead of done
            setStep("payment");
          }
        }
      } catch (err) {
        setBookingError(
          err instanceof Error ? err.message : "Failed to create booking. Please try again."
        );
      }
    });
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // Waitlisted confirmation screen
  if (step === "waitlisted") {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-10 pb-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
            <span className="text-3xl">📋</span>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">You&apos;re on the waitlist!</h2>
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
              We&apos;ll email you if a slot opens up on{" "}
              {selectedDate?.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-5 text-sm max-w-xs mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Space</span>
              <span className="font-semibold text-slate-900">{space.name}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <a href="/schedule">My Schedule</a>
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20" asChild>
              <a href="/book">Browse Spaces</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Done / confirmation screen
  if (step === "done" && bookingResult) {
    const isRec = recurringCount !== null && recurringCount > 1;
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-10 pb-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
            <span className="text-3xl">{isRec ? "🔁" : "🎉"}</span>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {isRec ? `${recurringCount} Sessions Booked!` : "Booking Confirmed!"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isRec
                ? `Repeating every week for ${recurringCount} weeks. Check your email for confirmation.`
                : "Your session has been reserved. Check your email for confirmation."}
            </p>
          </div>
          <div className="bg-emerald-50/60 rounded-2xl p-5 text-sm text-left space-y-2.5 max-w-xs mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Space</span>
              <span className="font-medium text-slate-900">{space.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isRec ? "First Date" : "Date"}</span>
              <span className="font-medium text-slate-900">
                {selectedDate?.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            {selectedStart !== null && selectedDuration !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-medium text-slate-900">
                  {minutesToTimeLabel(selectedStart)} – {minutesToTimeLabel(selectedStart + selectedDuration)}
                </span>
              </div>
            )}
            {selectedDuration !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-900">{selectedDuration} min</span>
              </div>
            )}
            {selectedPrice !== null && (
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-slate-500">{isRec ? "Per Session" : "Total"}</span>
                <span className="font-semibold text-emerald-600">{formatCents(selectedPrice)}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Booking ID: <span className="font-mono">{bookingResult!.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <a href="/schedule">My Schedule</a>
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20" asChild>
              <a href="/book">Book Another</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── STEP: PAYMENT ─────────────────────────────────────────────────────────
  if (step === "payment" && bookingResult) {
    const paymentAmount = isRecurring && selectedPrice
      ? selectedPrice * recurringWeeks
      : selectedPrice ?? 0;

    return (
      <div className="space-y-6">
        <StepIndicator current={step} />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center mb-2">
              <h2 className="font-semibold text-slate-800 text-lg">Complete Payment</h2>
              <p className="text-slate-500 text-sm mt-1">
                {space.name} — {selectedDuration} min{isRecurring ? ` × ${recurringWeeks} weeks` : ""}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-900">
                  {selectedDate?.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-medium text-slate-900">
                  {selectedStart !== null && selectedDuration
                    ? `${minutesToTimeLabel(selectedStart)} – ${minutesToTimeLabel(selectedStart + selectedDuration)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold text-slate-700">Total</span>
                <span className="font-bold text-emerald-600 text-base">
                  {formatCents(paymentAmount)}
                </span>
              </div>
            </div>

            <PaymentForm
              bookingId={bookingResult.id}
              amount={paymentAmount}
              onSuccess={() => setStep("done")}
              onError={(msg) => setBookingError(msg)}
            />

            {bookingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm text-center">
                {bookingError}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step !== "done" && <StepIndicator current={step} />}

      {/* ── STEP: DATE ── */}
      {step === "date" && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold text-slate-800 mb-4">Select a Date</h2>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={{ before: new Date() }}
                className="rounded-md"
              />
            </div>
            {loadingAvail && (
              <p className="text-center text-sm text-slate-400 mt-4">
                Checking availability...
              </p>
            )}
            {availError && (
              <p className="text-center text-sm text-red-500 mt-4">{availError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP: TIME + DURATION ── */}
      {step === "time" && availability && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">Select a Start Time</h2>
                <button
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => { setStep("date"); setSelectedStart(null); setSelectedDuration(null); }}
                >
                  ← Change Date
                </button>
              </div>

              {uniqueStartTimes.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-slate-400 text-sm">No available times on this date.</p>
                  {isSignedIn ? (
                    <>
                      <p className="text-slate-400 text-xs">
                        Join the waitlist and we'll notify you if a slot opens up.
                      </p>
                      {waitlistError && (
                        <p className="text-xs text-red-500">{waitlistError}</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={waitlistPending}
                        onClick={() => {
                          setWaitlistError(null);
                          startWaitlistTransition(async () => {
                            try {
                              await joinWaitlist({
                                spaceId: space.id,
                                preferredDate: dateStr,
                                preferredTimeStart: "00:00",
                                preferredTimeEnd: "23:59",
                              });
                              setStep("waitlisted");
                            } catch (err) {
                              setWaitlistError(
                                err instanceof Error ? err.message : "Failed to join waitlist"
                              );
                            }
                          });
                        }}
                      >
                        {waitlistPending ? "Joining..." : "📋 Join Waitlist"}
                      </Button>
                    </>
                  ) : (
                    <SignInButton mode="modal">
                      <Button size="sm" variant="outline">
                        Sign in to join waitlist
                      </Button>
                    </SignInButton>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {uniqueStartTimes.map((start) => (
                    <button
                      key={start}
                      onClick={() => { setSelectedStart(start); setSelectedDuration(null); }}
                      className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                        selectedStart === start
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                    >
                      {minutesToTimeLabel(start)}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedStart !== null && durationOptions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="font-semibold text-slate-800 mb-4">Select Duration</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {durationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedDuration(opt.value)}
                      className={`py-3.5 px-4 rounded-xl text-sm border transition-all duration-200 flex flex-col items-center gap-0.5 ${
                        selectedDuration === opt.value
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      <span
                        className={`text-xs font-medium ${
                          selectedDuration === opt.value ? "text-emerald-100" : "text-slate-400"
                        }`}
                      >
                        {formatCents(opt.price)}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedDuration !== null && (
                  <Button
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-600/20"
                    onClick={() => setStep("confirm")}
                  >
                    Review Booking →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── STEP: CONFIRM ── */}
      {step === "confirm" && availability && selectedStart !== null && selectedDuration !== null && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Review &amp; Confirm</h2>
              <button
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setStep("time")}
              >
                ← Change Time
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Space</span>
                <span className="font-medium text-slate-900">{space.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-900">
                  {selectedDate?.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start Time</span>
                <span className="font-medium text-slate-900">
                  {minutesToTimeLabel(selectedStart)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">End Time</span>
                <span className="font-medium text-slate-900">
                  {minutesToTimeLabel(selectedStart + selectedDuration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-900">{selectedDuration} minutes</span>
              </div>
              {selectedPrice !== null && (
                <div className="flex justify-between border-t pt-3 mt-1">
                  <span className="text-slate-700 font-semibold">
                    {isRecurring ? `Per Session \u00d7 ${recurringWeeks}` : "Total"}
                  </span>
                  <span className="font-bold text-emerald-600 text-base">
                    {isRecurring
                      ? formatCents(selectedPrice * recurringWeeks)
                      : formatCents(selectedPrice)}
                  </span>
                </div>
              )}
            </div>

            {/* Recurring toggle */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">🔁 Repeat Weekly</p>
                  <p className="text-xs text-slate-400 mt-0.5">Same time, every week</p>
                </div>
                <button
                  onClick={() => setIsRecurring((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    isRecurring ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isRecurring ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {isRecurring && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">How many weeks?</p>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 4, 6, 8, 10, 12].map((w) => (
                      <button
                        key={w}
                        onClick={() => setRecurringWeeks(w)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          recurringWeeks === w
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "text-slate-700 border-slate-200 hover:border-emerald-400"
                        }`}
                      >
                        {w}w
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    Ends{" "}
                    {(() => {
                      if (!selectedDate) return "";
                      const end = new Date(selectedDate);
                      end.setDate(end.getDate() + (recurringWeeks - 1) * 7);
                      return end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                    })()}
                  </p>
                </div>
              )}
            </div>

            {bookingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                {bookingError}
              </div>
            )}

            {!isSignedIn ? (
              <div className="space-y-3">
                <p className="text-slate-500 text-sm text-center">
                  Sign in to complete your booking
                </p>
                <SignInButton mode="modal">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-600/20">
                    Sign In to Confirm
                  </Button>
                </SignInButton>
              </div>
            ) : (
              <div className="space-y-2">
                {user?.fullName && (
                  <p className="text-slate-400 text-xs text-center">
                    Booking as{" "}
                    <span className="text-slate-600 font-medium">{user.fullName}</span>
                  </p>
                )}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-600/20"
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming
                    ? "Confirming..."
                    : isRecurring
                    ? `Confirm ${recurringWeeks} Weekly Sessions`
                    : "Confirm Booking"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
