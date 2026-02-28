"use client";

import { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/booking-utils";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

// ─── Outer wrapper: fetches the PaymentIntent, then mounts Elements ──────────

interface PaymentFormProps {
  bookingId: string;
  amount: number; // cents
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function PaymentForm({
  bookingId,
  amount,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create payment");
        setClientSecret(data.clientSecret);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to initialize payment";
        setError(msg);
        onError(msg);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [bookingId, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        <span className="ml-3 text-slate-500 text-sm">
          Preparing payment…
        </span>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm text-center">
        {error ?? "Unable to initialize payment. Please try again."}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#10b981",
            borderRadius: "8px",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        },
      }}
    >
      <CheckoutForm amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

// ─── Inner form: renders Stripe PaymentElement + submit button ───────────────

function CheckoutForm({
  amount,
  onSuccess,
  onError,
}: {
  amount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/schedule?payment=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message ?? "Payment failed. Please try again.";
      setErrorMsg(msg);
      onError(msg);
      setProcessing(false);
    } else {
      // Payment succeeded (no redirect needed)
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {errorMsg && (
        <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm">
          {errorMsg}
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-base font-semibold"
      >
        {processing ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Processing…
          </span>
        ) : (
          `Pay ${formatCents(amount)}`
        )}
      </Button>

      <p className="text-center text-xs text-slate-400">
        Secured by Stripe. Your payment info is never stored on our servers.
      </p>
    </form>
  );
}
