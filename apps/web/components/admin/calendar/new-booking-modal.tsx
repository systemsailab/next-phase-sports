"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAvailability } from "@/lib/actions/availability";
import {
  searchCustomers,
  adminCreateBooking,
  adminCreateCustomer,
} from "@/lib/actions/admin-bookings";
import { computeAvailableSlots, getDurationOptions, minutesToTimeLabel, formatCents } from "@/lib/booking-utils";
import type { DayAvailability } from "@/lib/booking-utils";

interface Space {
  id: string;
  name: string;
  type: string;
  minBookingMinutes: number;
}

interface CustomerResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Props {
  spaces: Space[];
  defaultDate?: string;
  children?: React.ReactNode;
}

export function NewBookingModal({ spaces, defaultDate, children }: Props) {
  const [open, setOpen] = useState(false);
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [availLoading, startAvailTransition] = useTransition();

  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  // Customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [searchPending, startSearchTransition] = useTransition();

  // New customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creatingCustomer, startCreateCustomer] = useTransition();

  const [source, setSource] = useState<"admin" | "walk-in">("admin");
  const [adminNotes, setAdminNotes] = useState("");

  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load availability when spaceId or date changes
  useEffect(() => {
    if (!spaceId || !date) return;
    setAvailability(null);
    setSelectedStart(null);
    setSelectedDuration(null);
    startAvailTransition(async () => {
      const result = await getAvailability(spaceId, date);
      setAvailability(result);
    });
  }, [spaceId, date]);

  // Debounced customer search
  useEffect(() => {
    if (customerQuery.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startSearchTransition(async () => {
        const results = await searchCustomers(customerQuery);
        setCustomerResults(results);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerQuery]);

  const handleCreateCustomer = useCallback(() => {
    if (!newFirst || !newLast) return;
    startCreateCustomer(async () => {
      const customer = await adminCreateCustomer({
        firstName: newFirst,
        lastName: newLast,
        email: newEmail || undefined,
        phone: newPhone || undefined,
      });
      setSelectedCustomer(customer);
      setShowNewCustomer(false);
      setCustomerQuery(`${customer.firstName} ${customer.lastName}`);
    });
  }, [newFirst, newLast, newEmail, newPhone]);

  const handleSubmit = () => {
    if (!selectedCustomer || selectedStart === null || !selectedDuration) return;
    setError(null);

    startSubmit(async () => {
      try {
        await adminCreateBooking({
          spaceId,
          customerId: selectedCustomer.id,
          date,
          startMinutes: selectedStart,
          durationMinutes: selectedDuration,
          source,
          adminNotes: adminNotes || undefined,
        });
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create booking");
      }
    });
  };

  const resetForm = () => {
    setSelectedStart(null);
    setSelectedDuration(null);
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerResults([]);
    setShowNewCustomer(false);
    setAdminNotes("");
    setError(null);
    setSuccess(false);
  };

  const slots = availability
    ? computeAvailableSlots(availability, availability.minBookingMinutes)
    : [];
  const startTimes = Array.from(
    new Set(slots.filter((s) => s.available).map((s) => s.startMinutes))
  ).sort((a, b) => a - b);

  const durationOptions =
    availability && selectedStart !== null
      ? getDurationOptions(availability, selectedStart)
      : [];

  const selectedPrice =
    durationOptions.find((d) => d.value === selectedDuration)?.price ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            + New Booking
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-8 space-y-2">
            <div className="text-3xl">✅</div>
            <p className="font-semibold text-slate-800">Booking created!</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Space + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Space</label>
                <select
                  value={spaceId}
                  onChange={(e) => setSpaceId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Start Time
                {availLoading && <span className="text-slate-400 ml-2">Loading...</span>}
              </label>
              {!availability && !availLoading && (
                <p className="text-xs text-slate-400">Select a space and date to load times</p>
              )}
              {availability && !availability.isOpen && (
                <p className="text-xs text-red-500">Space is closed on this date</p>
              )}
              {startTimes.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {startTimes.map((start) => (
                    <button
                      key={start}
                      onClick={() => { setSelectedStart(start); setSelectedDuration(null); }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        selectedStart === start
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                      }`}
                    >
                      {minutesToTimeLabel(start)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Duration */}
            {durationOptions.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Duration</label>
                <div className="flex flex-wrap gap-1.5">
                  {durationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedDuration(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedDuration === opt.value
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                      }`}
                    >
                      {opt.label} · {formatCents(opt.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600">Customer</label>
                <button
                  className="text-xs text-emerald-600 hover:underline"
                  onClick={() => setShowNewCustomer((v) => !v)}
                >
                  {showNewCustomer ? "Search Existing" : "+ New Customer"}
                </button>
              </div>

              {showNewCustomer ? (
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="First name *"
                      value={newFirst}
                      onChange={(e) => setNewFirst(e.target.value)}
                      className="border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      placeholder="Last name *"
                      value={newLast}
                      onChange={(e) => setNewLast(e.target.value)}
                      className="border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <input
                    placeholder="Email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    placeholder="Phone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Button
                    size="sm"
                    disabled={!newFirst || !newLast || creatingCustomer}
                    onClick={handleCreateCustomer}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                  >
                    {creatingCustomer ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between border border-emerald-300 bg-emerald-50 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-slate-900">
                          {selectedCustomer.firstName} {selectedCustomer.lastName}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">{selectedCustomer.email}</span>
                      </div>
                      <button
                        className="text-slate-400 hover:text-slate-600 text-xs"
                        onClick={() => { setSelectedCustomer(null); setCustomerQuery(""); }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        placeholder="Search by name, email, or phone..."
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {searchPending && (
                        <p className="text-xs text-slate-400 mt-1">Searching...</p>
                      )}
                      {customerResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg divide-y">
                          {customerResults.map((c) => (
                            <button
                              key={c.id}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setCustomerResults([]);
                                setCustomerQuery(`${c.firstName} ${c.lastName}`);
                              }}
                            >
                              <span className="font-medium">{c.firstName} {c.lastName}</span>
                              <span className="text-slate-400 ml-2 text-xs">{c.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Source */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-slate-600">Source:</label>
              <div className="flex gap-2">
                {(["admin", "walk-in"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      source === s
                        ? "bg-slate-800 text-white border-slate-800"
                        : "text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {s === "walk-in" ? "Walk-in" : "Admin"}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Admin Notes (optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Summary */}
            {selectedStart !== null && selectedDuration !== null && selectedCustomer && (
              <div className="bg-emerald-50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time</span>
                  <span className="font-medium">
                    {minutesToTimeLabel(selectedStart)} – {minutesToTimeLabel(selectedStart + selectedDuration)}
                  </span>
                </div>
                {selectedPrice !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-emerald-700">{formatCents(selectedPrice)}</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-600 text-xs">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                disabled={
                  submitting ||
                  !selectedCustomer ||
                  selectedStart === null ||
                  !selectedDuration
                }
                onClick={handleSubmit}
              >
                {submitting ? "Booking..." : "Create Booking"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
