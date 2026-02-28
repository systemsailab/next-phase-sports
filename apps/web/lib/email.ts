import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "bookings@nextphasesports.com";

export interface BookingEmailData {
  to: string;
  customerName: string;
  spaceName: string;
  facilityName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  total: number;
  bookingId: string;
  isRecurring?: boolean;
  recurringWeeks?: number;
}

export interface ReminderEmailData {
  to: string;
  customerName: string;
  spaceName: string;
  facilityName: string;
  startTime: string;
  reminderType: "24hr" | "1hr";
  bookingId: string;
}

export interface WaitlistEmailData {
  to: string;
  customerName: string;
  spaceName: string;
  facilityName: string;
  date: string;
  startTime: string;
  endTime: string;
  expiresInHours: number;
  bookingUrl: string;
}

function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:32px}
  .card{background:#fff;border-radius:12px;padding:32px;max-width:480px;margin:0 auto;border:1px solid #e2e8f0}
  .logo{font-size:18px;font-weight:700;color:#10b981;margin-bottom:24px}
  h1{font-size:22px;color:#0f172a;margin:0 0 8px}
  p{color:#64748b;font-size:15px;line-height:1.6;margin:0 0 16px}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
  .row:last-child{border-bottom:none}
  .label{color:#94a3b8}.value{color:#0f172a;font-weight:600}
  .total{color:#10b981;font-size:18px;font-weight:700}
  .btn{display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:16px}
  .footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:24px}
  </style></head><body><div class="card">${content}</div>
  <div class="footer">Next Phase Sports · You're receiving this because you made a booking.</div>
  </body></html>`;
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email");
    return;
  }

  const recurringNote = data.isRecurring
    ? `<p style="background:#f0fdf4;border-radius:8px;padding:12px;color:#166534;font-size:13px">🔁 This is a recurring booking — repeating weekly for ${data.recurringWeeks} weeks.</p>`
    : "";

  const html = baseTemplate(
    `<div class="logo">⚡ ${data.facilityName}</div>
    <h1>Booking Confirmed! 🎉</h1>
    <p>Hi ${data.customerName}, your session is locked in.</p>
    ${recurringNote}
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
      <div class="row"><span class="label">Space</span><span class="value">${data.spaceName}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${data.date}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${data.startTime} – ${data.endTime}</span></div>
      <div class="row"><span class="label">Duration</span><span class="value">${data.duration} min</span></div>
      <div class="row"><span class="label">Total</span><span class="value total">$${(data.total / 100).toFixed(2)}</span></div>
    </div>
    <p style="font-size:12px;color:#94a3b8">Booking ID: ${data.bookingId.slice(0, 8).toUpperCase()}</p>`,
    `Booking Confirmed — ${data.spaceName}`
  );

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `✅ Booking Confirmed — ${data.spaceName} on ${data.date}`,
    html,
  });
}

export async function sendBookingReminder(data: ReminderEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping reminder email");
    return;
  }

  const label = data.reminderType === "24hr" ? "tomorrow" : "in about 1 hour";
  const urgency = data.reminderType === "1hr" ? "⏰" : "📅";

  const html = baseTemplate(
    `<div class="logo">⚡ ${data.facilityName}</div>
    <h1>${urgency} Your session is ${label}!</h1>
    <p>Hi ${data.customerName}, just a reminder about your upcoming booking.</p>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
      <div class="row"><span class="label">Space</span><span class="value">${data.spaceName}</span></div>
      <div class="row"><span class="label">When</span><span class="value">${data.startTime}</span></div>
    </div>
    <p>See you there!</p>`,
    `Reminder: ${data.spaceName} ${label}`
  );

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `${urgency} Reminder: ${data.spaceName} ${label}`,
    html,
  });
}

export async function sendWaitlistNotification(data: WaitlistEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping waitlist email");
    return;
  }

  const html = baseTemplate(
    `<div class="logo">⚡ ${data.facilityName}</div>
    <h1>A slot opened up! 🙌</h1>
    <p>Hi ${data.customerName}, a time you were waiting for just became available.</p>
    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
      <div class="row"><span class="label">Space</span><span class="value">${data.spaceName}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${data.date}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${data.startTime} – ${data.endTime}</span></div>
    </div>
    <p>This link expires in <strong>${data.expiresInHours} hours</strong> — book quickly!</p>
    <a href="${data.bookingUrl}" class="btn">Book Now →</a>`,
    `Slot Available — ${data.spaceName}`
  );

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `🎯 Slot opened up! ${data.spaceName} on ${data.date}`,
    html,
  });
}
