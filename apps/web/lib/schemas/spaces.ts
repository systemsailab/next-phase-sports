import { z } from "zod";

export const SPACE_TYPES = [
  { value: "TURF_FIELD", label: "Turf Field" },
  { value: "GRASS_FIELD", label: "Grass Field" },
  { value: "COURT", label: "Court" },
  { value: "BATTING_CAGE", label: "Batting Cage" },
  { value: "PITCHING_TUNNEL", label: "Pitching Tunnel" },
  { value: "WEIGHT_ROOM", label: "Weight Room" },
  { value: "TRAINING_ROOM", label: "Training Room" },
  { value: "CLASSROOM", label: "Classroom" },
  { value: "PARTY_ROOM", label: "Party Room" },
  { value: "POOL", label: "Pool" },
  { value: "TRACK", label: "Track" },
  { value: "RINK", label: "Rink" },
  { value: "OTHER", label: "Other" },
] as const;

export const SpaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "TURF_FIELD", "GRASS_FIELD", "COURT", "BATTING_CAGE",
    "PITCHING_TUNNEL", "WEIGHT_ROOM", "TRAINING_ROOM", "CLASSROOM",
    "PARTY_ROOM", "POOL", "TRACK", "RINK", "OTHER",
  ]),
  description: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  squareFootage: z.coerce.number().int().positive().optional().nullable(),

  // Pricing (dollars → store as cents)
  hourlyRate: z.coerce.number().positive("Hourly rate is required"),
  halfHourRate: z.coerce.number().positive().optional().nullable(),
  memberHourlyRate: z.coerce.number().positive().optional().nullable(),

  // Scheduling
  minBookingMinutes: z.coerce.number().int().positive().default(60),
  maxBookingMinutes: z.coerce.number().int().positive().default(180),
  bookingIncrements: z.coerce.number().int().positive().default(30),
  bufferMinutes: z.coerce.number().int().nonnegative().optional().nullable(),

  // Grouping
  groupName: z.string().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export type SpaceInput = z.infer<typeof SpaceSchema>;
