/**
 * Plain (non-server-action) helper for notifying waitlist entries.
 * Safe to import from both server actions and Inngest functions.
 */

import { db } from "@/lib/db";
import { sendWaitlistNotification } from "@/lib/email";

export async function notifyWaitlistForSlot({
  facilityId,
  spaceId,
  startTime,
  endTime,
}: {
  facilityId: string;
  spaceId: string;
  startTime: Date;
  endTime: Date;
}) {
  const dateStr = startTime.toISOString().slice(0, 10);

  const entries = await db.waitlistEntry.findMany({
    where: {
      facilityId,
      spaceId,
      status: "WAITING",
      OR: [
        { preferredDate: null },
        { preferredDate: new Date(dateStr) },
      ],
    },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  if (entries.length === 0) return;

  const [facility, space] = await Promise.all([
    db.facility.findUnique({
      where: { id: facilityId },
      select: { name: true, timezone: true },
    }),
    db.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    }),
  ]);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: facility?.timezone ?? "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(startTime);

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: facility?.timezone ?? "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startTime);

  const endLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: facility?.timezone ?? "UTC",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(endTime);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const entry of entries) {
    await db.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: "NOTIFIED",
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      },
    });

    await sendWaitlistNotification({
      to: entry.customer.email,
      customerName: `${entry.customer.firstName} ${entry.customer.lastName}`.trim(),
      spaceName: space?.name ?? "The space",
      facilityName: facility?.name ?? "The facility",
      date: dateLabel,
      startTime: timeLabel,
      endTime: endLabel,
      expiresInHours: 4,
      bookingUrl: `${baseUrl}/book/${spaceId}`,
    });
  }
}
