import { z } from "zod";

// ─── Facility Schemas ─────────────────────────────────────────────────────────

export const FacilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

export const OperatingHoursSchema = z.object({
  monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
});

export const CancellationPolicySchema = z.object({
  fullRefundHours: z.coerce.number().int().nonnegative(),
  creditOnlyHours: z.coerce.number().int().nonnegative(),
  noRefundHours: z.coerce.number().int().nonnegative(),
  bookingBufferMin: z.coerce.number().int().nonnegative(),
  requireWaiver: z.boolean(),
  allowWalkIns: z.boolean(),
  unmannedMode: z.boolean(),
});

export type FacilityInput = z.infer<typeof FacilitySchema>;
export type OperatingHoursInput = z.infer<typeof OperatingHoursSchema>;
export type CancellationPolicyInput = z.infer<typeof CancellationPolicySchema>;
