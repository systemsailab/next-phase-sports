"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { adminRefundPayment } from "@/lib/actions/payments";
import { formatCents } from "@/lib/booking-utils";

interface RefundButtonProps {
  paymentId: string;
  amount: number; // cents
  customerName: string;
}

export function RefundButton({ paymentId, amount, customerName }: RefundButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <span className="text-xs text-emerald-600 font-medium">Refunded</span>
    );
  }

  if (!showConfirm) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={() => setShowConfirm(true)}
      >
        Refund
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <p className="text-xs text-slate-500 text-right">
        Refund {formatCents(amount)} to {customerName || "customer"}?
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => {
            setShowConfirm(false);
            setError(null);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="text-xs h-7"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await adminRefundPayment(paymentId, {
                  reason: "Admin dashboard refund",
                });
                setSuccess(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Refund failed");
              }
            });
          }}
        >
          {isPending ? "Processing…" : "Confirm Refund"}
        </Button>
      </div>
    </div>
  );
}
