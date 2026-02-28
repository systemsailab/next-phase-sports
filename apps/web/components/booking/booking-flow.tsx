"use client";

import { useState, useTransition, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useUser, SignInButton } from "@clerk/nextjs";
import { getAvailability } from "@/lib/actions/availability";
import { createBooking } from "@/lib/actions/bookings";
import type { DayAvailability } from "@/lib/booking-utils";
import {
  computeAvailableSlots,
  getDurationOptions,
  minutesToTimeLabel,
  formatCents,
} from "@/lib/booking-utils";

type Step = "date" | "time" | "confirm" | "done";

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
  ];
  const idx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center ${
              i < idx
                ? "bg-emerald-500 text-white"
                : i === idx
                ? "bg-emerald-500 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </div>
          <span
            className={`text-sm ${
              i === idx ? "text-slate-900 font-medium" : "text-slate-400"
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className="w-6 h-px bg-slate-200 mx-1" />
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
        const result = await createBooking({
          spaceId: space.id,
          date: dateStr,
          startMinutes: selectedStart,
          durationMinutes: selectedDuration,
        });
        if (result.success) {
          setBookingResult({ id: result.bookingId });
          setStep("done");
        }
      } catch (err) {
        setBookingError(
          err instanceof Error ? err.message : "Failed to create booking. Please try again."
        );
      }
    });
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  if (step === "done" && bookingResult && availability && selectedStart !== null && selectedDuration !== null) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Booking Confirmed!</h2>
            <p className="text-slate-500 text-sm mt-1">
              Your session has been reserved.
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-sm text-left space-y-2 max-w-xs mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Space</span>
              <span className="font-medium text-slate-900">{space.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-900">
                {selectedDate?.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-900">
                {minutesToTimeLabel(selectedStart)} – {minutesToTimeLabel(selectedStart + selectedDuration)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration</span>
              <span className="font-medium text-slate-900">{selectedDuration} min</span>
            </div>
            {selectedPrice !== null && (
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-slate-500">Total</span>
                <span className="font-semibold text-emerald-600">{formatCents(selectedPrice)}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Booking ID: <span className="font-mono">{bookingResult.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" asChild>
              <a href="/schedule">My Schedule</a>
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" asChild>
              <a href="/book">Book Another</a>
            </Button>
          </div>
        </CardContent>
      </Card>
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
                <p className="text-slate-400 text-sm text-center py-8">
                  No available times on this date.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {uniqueStartTimes.map((start) => (
                    <button
                      key={start}
                      onClick={() => { setSelectedStart(start); setSelectedDuration(null); }}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        selectedStart === start
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-600"
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
                      className={`py-3 px-4 rounded-lg text-sm border transition-colors flex flex-col items-center ${
                        selectedDuration === opt.value
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                      }`}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <span
                        className={`text-xs ${
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
                    className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
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
                  <span className="text-slate-700 font-semibold">Total</span>
                  <span className="font-bold text-emerald-600 text-base">
                    {formatCents(selectedPrice)}
                  </span>
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
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
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
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? "Confirming..." : "Confirm Booking"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
