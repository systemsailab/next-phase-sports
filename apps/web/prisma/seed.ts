/**
 * Seed database with a demo facility, spaces, and test customers.
 * Run: DATABASE_URL="..." npx ts-node prisma/seed.ts
 * Or:  DATABASE_URL="..." npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const operatingHours = {
  monday: { open: "06:00", close: "22:00", closed: false },
  tuesday: { open: "06:00", close: "22:00", closed: false },
  wednesday: { open: "06:00", close: "22:00", closed: false },
  thursday: { open: "06:00", close: "22:00", closed: false },
  friday: { open: "06:00", close: "23:00", closed: false },
  saturday: { open: "07:00", close: "23:00", closed: false },
  sunday: { open: "08:00", close: "21:00", closed: false },
};

const cancellationPolicy = {
  fullRefundHours: 24,
  creditOnlyHours: 6,
  noRefundHours: 2,
};

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Facility ──────────────────────────────────────────────────────────────
  const facility = await prisma.facility.upsert({
    where: { slug: "demo-sports-complex" },
    update: {},
    create: {
      name: "Demo Sports Complex",
      slug: "demo-sports-complex",
      description:
        "A full-service multi-sport facility with turf fields, batting cages, and courts.",
      email: "admin@demosports.com",
      phone: "(512) 555-0100",
      website: "https://demosports.com",
      address: "1234 Athletic Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
      timezone: "America/Chicago",
      operatingHours,
      cancellationPolicy,
      bookingBufferMin: 15,
      requireWaiver: true,
      allowWalkIns: true,
      unmannedMode: false,
      aiEnabled: true,
      platformFeePercent: 2.9,
      platformFeeFixed: 30,
    },
  });

  console.log(`✅ Facility: ${facility.name} (${facility.id})`);

  // ─── Spaces ────────────────────────────────────────────────────────────────
  const spaces = await Promise.all([
    prisma.space.upsert({
      where: { id: "space-turf-1" },
      update: {},
      create: {
        id: "space-turf-1",
        facilityId: facility.id,
        name: "Turf Field 1",
        type: "TURF_FIELD",
        description: "Full-size turf field, great for soccer, lacrosse, and football.",
        capacity: 40,
        squareFootage: 10000,
        hourlyRate: 15000, // $150/hr
        memberHourlyRate: 12000, // $120/hr for members
        minBookingMinutes: 60,
        maxBookingMinutes: 240,
        bookingIncrements: 30,
        groupName: "Turf Fields",
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.space.upsert({
      where: { id: "space-turf-2" },
      update: {},
      create: {
        id: "space-turf-2",
        facilityId: facility.id,
        name: "Turf Field 2",
        type: "TURF_FIELD",
        description: "Half-size turf field, perfect for small-sided games and training.",
        capacity: 20,
        squareFootage: 5000,
        hourlyRate: 9000, // $90/hr
        memberHourlyRate: 7500,
        minBookingMinutes: 60,
        maxBookingMinutes: 180,
        bookingIncrements: 30,
        groupName: "Turf Fields",
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.space.upsert({
      where: { id: "space-cage-a" },
      update: {},
      create: {
        id: "space-cage-a",
        facilityId: facility.id,
        name: "Batting Cage A",
        type: "BATTING_CAGE",
        description: "70-foot batting cage with pitching machine. Baseball and softball compatible.",
        capacity: 4,
        hourlyRate: 5000, // $50/hr
        halfHourRate: 2500, // $25/30min
        memberHourlyRate: 4000,
        minBookingMinutes: 30,
        maxBookingMinutes: 120,
        bookingIncrements: 30,
        groupName: "Batting Cages",
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.space.upsert({
      where: { id: "space-cage-b" },
      update: {},
      create: {
        id: "space-cage-b",
        facilityId: facility.id,
        name: "Batting Cage B",
        type: "BATTING_CAGE",
        description: "70-foot batting cage with live pitching tee and L-screen.",
        capacity: 4,
        hourlyRate: 5000,
        halfHourRate: 2500,
        memberHourlyRate: 4000,
        minBookingMinutes: 30,
        maxBookingMinutes: 120,
        bookingIncrements: 30,
        groupName: "Batting Cages",
        sortOrder: 4,
        isActive: true,
      },
    }),
    prisma.space.upsert({
      where: { id: "space-court-1" },
      update: {},
      create: {
        id: "space-court-1",
        facilityId: facility.id,
        name: "Basketball Court",
        type: "COURT",
        description: "NBA-regulation basketball court. Can be split for volleyball.",
        capacity: 20,
        squareFootage: 4700,
        hourlyRate: 8000, // $80/hr
        memberHourlyRate: 6500,
        minBookingMinutes: 60,
        maxBookingMinutes: 180,
        bookingIncrements: 30,
        groupName: "Courts",
        sortOrder: 5,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Spaces: ${spaces.map((s) => s.name).join(", ")}`);

  // ─── Test Customers ────────────────────────────────────────────────────────
  const adminCustomer = await prisma.customer.upsert({
    where: { facilityId_email: { facilityId: facility.id, email: "admin@demosports.com" } },
    update: {},
    create: {
      facilityId: facility.id,
      firstName: "Admin",
      lastName: "User",
      email: "admin@demosports.com",
      phone: "(512) 555-0001",
      tags: ["admin", "owner"],
      source: "seed",
      status: "ACTIVE",
    },
  });

  const testCustomer = await prisma.customer.upsert({
    where: { facilityId_email: { facilityId: facility.id, email: "player@example.com" } },
    update: {},
    create: {
      facilityId: facility.id,
      firstName: "Alex",
      lastName: "Johnson",
      email: "player@example.com",
      phone: "(512) 555-0042",
      tags: ["active"],
      source: "seed",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Customers: ${adminCustomer.email}, ${testCustomer.email}`);

  // ─── Membership Tiers ─────────────────────────────────────────────────────
  const membershipTier = await prisma.membershipTier.upsert({
    where: { id: "tier-monthly-unlimited" },
    update: {},
    create: {
      id: "tier-monthly-unlimited",
      facilityId: facility.id,
      name: "Monthly Unlimited",
      description: "Unlimited facility access with member pricing on all bookings.",
      monthlyPrice: 9900, // $99/mo
      benefits: {
        discountPercent: 20,
        priorityBookingHours: 72,
        exclusiveAccess: false,
        freeHoursPerMonth: 0,
      },
      isActive: true,
      sortOrder: 1,
    },
  });

  const yearlyTier = await prisma.membershipTier.upsert({
    where: { id: "tier-annual" },
    update: {},
    create: {
      id: "tier-annual",
      facilityId: facility.id,
      name: "Annual Member",
      description: "Best value — save 20% vs monthly billing.",
      monthlyPrice: 7900, // $79/mo billed annually
      annualPrice: 94800, // $948/yr
      benefits: {
        discountPercent: 25,
        priorityBookingHours: 120,
        exclusiveAccess: false,
        freeHoursPerMonth: 2,
      },
      isActive: true,
      sortOrder: 2,
    },
  });

  console.log(`✅ Membership tiers: ${membershipTier.name}, ${yearlyTier.name}`);

  console.log("\n🎉 Seed complete!");
  console.log(`\n   Facility: ${facility.name}`);
  console.log(`   Slug: ${facility.slug}`);
  console.log(`   Spaces: ${spaces.length}`);
  console.log(`   Customers: 2 (admin + test player)`);
  console.log(`   Membership tiers: 2`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
