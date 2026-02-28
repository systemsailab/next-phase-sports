import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "next-phase-sports",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// ─── Event type definitions ───────────────────────────────────────────────────

export type BookingCreatedEvent = {
  name: "booking/created";
  data: {
    bookingId: string;
    startTime: string; // ISO string
    endTime: string;
    customerEmail: string;
    customerName: string;
    spaceName: string;
    facilityName: string;
    facilityTimezone: string;
  };
};

export type BookingCancelledEvent = {
  name: "booking/cancelled";
  data: {
    bookingId: string;
    spaceId: string;
    startTime: string;
    endTime: string;
    facilityId: string;
  };
};

export type Events = BookingCreatedEvent | BookingCancelledEvent;
