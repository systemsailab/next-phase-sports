import twilio from "twilio";

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;

export async function sendSMS(to: string, body: string): Promise<void> {
  await twilioClient.messages.create({
    body,
    from: TWILIO_PHONE_NUMBER,
    to,
  });
}
