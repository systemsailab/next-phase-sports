"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { leaveWaitlist } from "@/lib/actions/waitlist";

export function LeaveWaitlistButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-slate-400 hover:text-red-500 text-xs"
      disabled={pending}
      onClick={() => {
        startTransition(() => leaveWaitlist(entryId));
      }}
    >
      {pending ? "Removing..." : "Leave"}
    </Button>
  );
}
