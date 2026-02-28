import { inngest } from "./client";
import { sendBookingReminder } from "@/lib/email";
import { db } from "@/lib/db";
import { notifyWaitlistForSlot } from "@/lib/waitlist-helpers";

// ─── Send booking reminders (24hr + 1hr before) ───────────────────────────────

export const sendBookingReminders = inngest.createFunction(
  {
    id: "send-booking-reminders",
    name: "Send Booking Reminders",
  },
  { event: "booking/created" },
  async ({ event, step }) => {
    const {
      bookingId,
      startTime,
      customerEmail,
      customerName,
      spaceName,
      facilityName,
    } = event.data;

    const start = new Date(startTime);
    const reminder24 = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const reminder1 = new Date(start.getTime() - 60 * 60 * 1000);
    const now = new Date();

    // 24-hour reminder
    if (reminder24 > now) {
      await step.sleepUntil("wait-until-24hr-before", reminder24);
      await step.run("send-24hr-reminder", async () => {
        // Re-check booking still active
        const booking = await db.booking.findFirst({
          where: { id: bookingId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        });
        if (!booking) return { skipped: true };

        const formatted = new Intl.DateTimeFormat("en-US", {
          timeZone: event.data.facilityTimezone,
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(start);

        await sendBookingReminder({
          to: customerEmail,
          customerName,
          spaceName,
          facilityName,
          startTime: formatted,
          reminderType: "24hr",
          bookingId,
        });
        return { sent: true };
      });
    }

    // 1-hour reminder
    if (reminder1 > now) {
      await step.sleepUntil("wait-until-1hr-before", reminder1);
      await step.run("send-1hr-reminder", async () => {
        const booking = await db.booking.findFirst({
          where: { id: bookingId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        });
        if (!booking) return { skipped: true };

        const formatted = new Intl.DateTimeFormat("en-US", {
          timeZone: event.data.facilityTimezone,
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(start);

        await sendBookingReminder({
          to: customerEmail,
          customerName,
          spaceName,
          facilityName,
          startTime: formatted,
          reminderType: "1hr",
          bookingId,
        });
        return { sent: true };
      });
    }

    return { done: true };
  }
);

// ─── Handle booking cancellation → notify waitlist ────────────────────────────

export const handleBookingCancelled = inngest.createFunction(
  {
    id: "handle-booking-cancelled",
    name: "Notify Waitlist on Cancellation",
  },
  { event: "booking/cancelled" },
  async ({ event, step }) => {
    const { spaceId, startTime, endTime, facilityId } = event.data;

    await step.run("notify-waitlist", async () => {
      await notifyWaitlistForSlot({
        facilityId,
        spaceId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });
    });

    return { done: true };
  }
);
