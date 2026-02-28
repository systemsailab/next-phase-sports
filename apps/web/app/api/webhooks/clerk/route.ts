import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/lib/db";

// Clerk webhook event types we care about
type ClerkUserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: Array<{ email_address: string; id: string }>;
    phone_numbers: Array<{ phone_number: string }>;
    profile_image_url: string | null;
    public_metadata: Record<string, unknown>;
  };
};

type ClerkUserUpdatedEvent = {
  type: "user.updated";
  data: ClerkUserCreatedEvent["data"];
};

type ClerkUserDeletedEvent = {
  type: "user.deleted";
  data: { id: string };
};

type ClerkEvent =
  | ClerkUserCreatedEvent
  | ClerkUserUpdatedEvent
  | ClerkUserDeletedEvent;

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  // If no webhook secret configured, allow passthrough in development
  if (!webhookSecret) {
    console.warn("CLERK_WEBHOOK_SECRET not set — skipping webhook verification");
    return new Response("OK", { status: 200 });
  }

  // Verify the webhook signature
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  let event: ClerkEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // ─── Handle events ────────────────────────────────────────────────────────

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, first_name, last_name, email_addresses, phone_numbers } = event.data;
    const email = email_addresses[0]?.email_address;
    const phone = phone_numbers[0]?.phone_number;

    if (!email) {
      return new Response("No email on user", { status: 200 });
    }

    // Find the facility to associate with (auto-associate with first facility)
    const facility = await db.facility.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!facility) {
      console.log("No facility found — will associate customer when facility is created");
      return new Response("OK", { status: 200 });
    }

    if (event.type === "user.created") {
      // Create or update customer record
      await db.customer.upsert({
        where: {
          facilityId_email: { facilityId: facility.id, email },
        },
        update: {
          clerkUserId: id,
          firstName: first_name ?? "Unknown",
          lastName: last_name ?? "",
          phone: phone,
        },
        create: {
          facilityId: facility.id,
          clerkUserId: id,
          firstName: first_name ?? "Unknown",
          lastName: last_name ?? "",
          email,
          phone: phone,
          source: "clerk-signup",
          status: "ACTIVE",
        },
      });

      console.log(`[clerk-webhook] Created customer for ${email} in facility ${facility.id}`);
    } else {
      // Update existing customer
      await db.customer.updateMany({
        where: { clerkUserId: id },
        data: {
          firstName: first_name ?? "Unknown",
          lastName: last_name ?? "",
          phone: phone,
        },
      });
    }
  }

  if (event.type === "user.deleted") {
    const { id } = event.data;
    // Soft-delete: archive the customer rather than hard delete
    await db.customer.updateMany({
      where: { clerkUserId: id },
      data: { status: "ARCHIVED" },
    });
    console.log(`[clerk-webhook] Archived customer with clerkUserId ${id}`);
  }

  return new Response("OK", { status: 200 });
}
