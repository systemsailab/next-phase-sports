"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/actions/bookings";

interface Props {
  bookingId: string;
}

export function CancelBookingButton({ bookingId }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirmed) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
        onClick={() => setConfirmed(true)}
      >
        Cancel
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400"
        disabled={pending}
        onClick={() => setConfirmed(false)}
      >
        Keep
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              await cancelBooking(bookingId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to cancel");
              setConfirmed(false);
            }
          });
        }}
      >
        {pending ? "Cancelling..." : "Confirm Cancel"}
      </Button>
    </div>
  );
}
