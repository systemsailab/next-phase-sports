# Build Order — Autonomous Sports Facility Platform

## Tech Stack
- **Frontend:** Next.js 14 (App Router) + React + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes + tRPC (or separate FastAPI if preferred)
- **Database:** PostgreSQL (hosted on Railway)
- **ORM:** Prisma
- **Auth:** Clerk (multi-tenant, role-based)
- **Payments:** Stripe Connect (embedded payments with platform fee)
- **SMS:** Twilio
- **Email:** Resend
- **AI/LLM:** Claude API (Anthropic) via Vercel AI SDK
- **Real-time:** Pusher or Ably (WebSocket alternatives that work on Vercel)
- **File Storage:** AWS S3 or Vercel Blob
- **Job Queue:** Inngest (serverless background jobs, works great with Vercel)
- **Hosting:** Vercel (frontend + API) + Railway (PostgreSQL + Redis)
- **Repo:** GitHub (monorepo)
- **Mobile:** React Native (Expo) — Phase 2, after web is solid

## Monorepo Structure
```
sports-platform/
├── apps/
│   ├── web/                  # Next.js app (customer + admin)
│   │   ├── app/
│   │   │   ├── (auth)/       # Login, signup, onboarding
│   │   │   ├── (customer)/   # Customer-facing pages
│   │   │   │   ├── book/
│   │   │   │   ├── schedule/
│   │   │   │   ├── account/
│   │   │   │   └── programs/
│   │   │   ├── (admin)/      # Facility admin dashboard
│   │   │   │   ├── dashboard/
│   │   │   │   ├── calendar/
│   │   │   │   ├── customers/
│   │   │   │   ├── programs/
│   │   │   │   ├── leagues/
│   │   │   │   ├── staff/
│   │   │   │   ├── settings/
│   │   │   │   ├── reports/
│   │   │   │   └── billing/
│   │   │   ├── api/          # API routes
│   │   │   │   ├── webhooks/ # Stripe, Twilio, Clerk webhooks
│   │   │   │   ├── ai/       # AI assistant endpoints
│   │   │   │   └── cron/     # Scheduled jobs
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── booking/      # Booking-specific components
│   │   │   ├── calendar/     # Calendar components
│   │   │   ├── admin/        # Admin dashboard components
│   │   │   └── shared/       # Shared components
│   │   ├── lib/
│   │   │   ├── db.ts         # Prisma client
│   │   │   ├── stripe.ts     # Stripe helpers
│   │   │   ├── ai.ts         # Claude AI helpers
│   │   │   ├── sms.ts        # Twilio helpers
│   │   │   ├── email.ts      # Resend helpers
│   │   │   ├── auth.ts       # Clerk helpers
│   │   │   └── utils.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── migrations/
│   │       └── seed.ts
│   └── mobile/               # React Native (Expo) — Phase 2
├── packages/
│   ├── shared/               # Shared types, validators, constants
│   │   ├── types/
│   │   ├── validators/       # Zod schemas
│   │   └── constants/
│   └── ai-prompts/           # AI system prompts and tool definitions
├── .github/
│   └── workflows/            # CI/CD
├── package.json
├── turbo.json
└── README.md
```

---

## Build Phases

### PHASE 0: Project Setup (Day 1)
**Goal:** Repo initialized, deployed, database connected, auth working.

- [ ] Initialize monorepo with Turborepo
- [ ] Set up Next.js app with App Router, Tailwind, shadcn/ui
- [ ] Set up Prisma with PostgreSQL on Railway
- [ ] Set up Clerk auth with multi-tenant org support
- [ ] Define roles: `owner`, `admin`, `staff`, `coach`, `customer`
- [ ] Create basic layout: admin sidebar + customer header
- [ ] Deploy to Vercel (connected to GitHub)
- [ ] Set up environment variables (Clerk, DB, Stripe keys)
- [ ] Seed database with one test facility, spaces, and users

**Deliverable:** Login works, admin sees empty dashboard, customer sees empty booking page. Deployed and live.

---

### PHASE 1: Facility Setup & Space Management (Days 2-4)
**Goal:** Facility owner can configure their facility and spaces.

- [ ] Facility onboarding flow (name, address, timezone, operating hours, logo)
- [ ] Space/resource CRUD (create fields, courts, cages, etc.)
- [ ] Per-space config: name, type, capacity, photos, hourly rate, buffer time
- [ ] Operating hours per space (can differ from facility hours)
- [ ] Blackout dates
- [ ] Space grouping (optional)
- [ ] Admin settings page

**Deliverable:** Owner can fully configure their facility and all spaces.

---

### PHASE 2: Booking Engine (Days 5-12)
**Goal:** Customers can browse availability and book spaces. This is the core product.

- [ ] Availability engine: calculate open slots based on space hours, existing bookings, buffer times
- [ ] Customer-facing booking page: select space → select date → see available times → select duration → proceed to checkout
- [ ] Booking creation with all types: single rental, recurring (weekly), walk-in
- [ ] Admin calendar view: unified calendar showing all spaces and bookings
- [ ] Calendar views: day, week, month + resource view + staff view
- [ ] Drag-and-drop rescheduling (admin)
- [ ] Booking modifications and cancellations (customer + admin)
- [ ] Cancellation policies (configurable: full refund before X hours, credit-only after, no refund within Y hours)
- [ ] Conflict detection and prevention
- [ ] Waitlist: join waitlist when slot is full, auto-notify when slot opens
- [ ] Booking confirmation emails (via Resend)
- [ ] Reminder notifications (24hr and 1hr before via Inngest scheduled jobs)
- [ ] Family accounts: parent can book for multiple children

**Deliverable:** Full booking flow works end-to-end. Customer books, pays placeholder (no real Stripe yet), gets confirmation. Admin sees it on calendar.

---

### PHASE 3: Payments (Days 13-18)
**Goal:** Real money flows. Stripe Connect embedded payments.

- [ ] Stripe Connect onboarding for facility (connected account)
- [ ] Payment at time of booking (Stripe Checkout or Payment Intents)
- [ ] Platform fee collection (2.9% + $0.30 per transaction)
- [ ] Refund processing (full and partial)
- [ ] Credit system (issue credits to customer accounts)
- [ ] Coupon/discount codes
- [ ] Gift card purchase and redemption
- [ ] Stripe webhooks for payment confirmations, failures, disputes
- [ ] Failed payment retry logic (via Inngest: retry day 1, 3, 7, 14)
- [ ] Payment history per customer
- [ ] Financial dashboard: daily/weekly/monthly revenue, revenue by source
- [ ] Payout reporting

**Deliverable:** Real payments processing. Customer pays, facility gets paid, platform earns fee.

---

### PHASE 4: Memberships & Packages (Days 19-24)
**Goal:** Recurring revenue through memberships and credit packages.

- [ ] Membership tier CRUD (name, price, billing cycle, benefits)
- [ ] Membership benefits: booking discount %, priority booking window, exclusive access, free hours/month
- [ ] Stripe subscription creation for memberships
- [ ] Auto-renewal with Stripe billing
- [ ] Credit/punch card packages (buy 10 hours, use anytime)
- [ ] Family/sibling discount rules
- [ ] Membership freeze/pause
- [ ] Usage tracking (hours used this period)
- [ ] Membership upgrade/downgrade with proration
- [ ] Member-only time slots (visible only to active members)
- [ ] Dunning automation: friendly reminder → warning → access paused → cancelled
- [ ] Membership analytics: active count, churn, MRR

**Deliverable:** Full membership lifecycle works. Customer signs up, gets billed monthly, receives benefits, can pause/cancel.

---

### PHASE 5: Waivers & Access Control (Days 25-30)
**Goal:** Digital waivers and unmanned facility access.

- [ ] Waiver template builder (rich text editor)
- [ ] Multiple waiver types (general liability, minor, activity-specific)
- [ ] E-signature capture with timestamp, IP, device
- [ ] Minor waiver routing to parent/guardian email
- [ ] Waiver required before first booking (enforced at checkout)
- [ ] Annual waiver expiration and renewal reminders
- [ ] Waiver status dashboard for admins
- [ ] QR code check-in generation per booking
- [ ] Check-in scanning (admin or self-service kiosk mode)
- [ ] Time-limited access codes (generated when booking confirmed, active 15 min before to end of session)
- [ ] Smart lock API integration (start with Kisi — most developer-friendly)
- [ ] Attendance logging
- [ ] Access denied alerts
- [ ] Unmanned mode toggle (facility operates without on-site staff)

**Deliverable:** Customer signs waiver, books, gets access code, enters facility with smart lock, checks in. No humans needed.

---

### PHASE 6: Staff & Coach Management (Days 31-35)
**Goal:** Manage staff, coach availability, and payroll tracking.

- [ ] Staff account creation with role assignment
- [ ] Role-based permissions (what each role can see/do)
- [ ] Coach availability management (weekly schedule + date overrides)
- [ ] Coach assignment to sessions and programs
- [ ] Staff clock-in/clock-out
- [ ] Payroll calculation: hours worked, sessions taught, commission rates
- [ ] Staff performance dashboard
- [ ] Internal staff messaging

**Deliverable:** Coaches set availability, get assigned to sessions, clock in/out, payroll is tracked.

---

### PHASE 7: Registration & Programs (Days 36-42)
**Goal:** Camps, clinics, classes, and multi-session programs.

- [ ] Program creation wizard: type (camp, clinic, class, group training), dates, times, capacity, pricing, age/skill restrictions
- [ ] Multi-session programs (8-week clinic = 8 linked sessions)
- [ ] Registration form builder with custom fields
- [ ] Required document collection during registration
- [ ] Multi-child registration flow
- [ ] Early-bird and deadline pricing
- [ ] Payment plans for expensive programs
- [ ] Waitlist with auto-promotion
- [ ] Program-specific communication (updates to all registrants)
- [ ] Attendance tracking per session
- [ ] Program analytics: registrations, fill rate, revenue, waitlist size

**Deliverable:** Facility can create and run camps, clinics, and classes with full registration, payment, and attendance.

---

### PHASE 8: CRM & Communication (Days 43-48)
**Goal:** Customer management and automated communications.

- [ ] Customer profile pages: contact info, booking history, payment history, membership status, family members, notes, tags
- [ ] Family/household linking
- [ ] Customer segmentation: active, lapsed (no booking in 30+ days), high-value (top 20% LTV), member, lead
- [ ] Lead tracking: inquiry → first booking pipeline
- [ ] Communication log: all emails, SMS, push per customer
- [ ] Email campaign builder: template editor, segmented sending, scheduling
- [ ] SMS campaign support
- [ ] Campaign analytics: sent, opened, clicked, converted
- [ ] Automated email sequences: welcome series, post-first-visit, re-engagement
- [ ] Customer lifetime value calculation

**Deliverable:** Full CRM with customer profiles, segmentation, and marketing campaign capabilities.

---

### PHASE 9: League & Tournament Management (Days 49-58)
**Goal:** Full league and tournament operations.

- [ ] League creation: sport, divisions, season dates, format
- [ ] Team registration with roster management
- [ ] Schedule generation algorithm: round robin, balanced home/away, bye weeks, field constraints
- [ ] Score entry interface (mobile-friendly for on-field use)
- [ ] Automatic standings calculation with configurable tiebreakers
- [ ] Playoff bracket auto-generation
- [ ] Tournament creation: elimination types, pool play, seeding
- [ ] Tournament bracket visualization (live updating)
- [ ] Multi-venue scheduling optimization
- [ ] Referee/official scheduling
- [ ] Public-facing league/tournament pages (standings, schedule, results)
- [ ] Season rollover: auto-invite returning teams

**Deliverable:** Facility can run complete leagues and tournaments with automated scheduling, scoring, and standings.

---

### PHASE 10: AI Layer — MVP (Days 59-68)
**Goal:** Core AI features that make the platform autonomous.

- [ ] AI Scheduling Assistant: SMS and web chat interface for natural language booking
- [ ] AI tool definitions: check_availability, create_booking, process_payment, send_confirmation, lookup_customer
- [ ] Conversation state management for multi-turn booking conversations
- [ ] AI Customer Service: FAQ handling, policy questions, hours/directions, waiver help
- [ ] Knowledge base ingestion: facility-specific info (hours, pricing, policies, directions) fed to AI context
- [ ] Human escalation flow: AI drafts response, flags for owner review
- [ ] Smart Notifications: context-aware reminder logic (different messaging for loyal vs. new vs. no-show customers)
- [ ] Auto-fill empty slots: detect upcoming empty periods, auto-send targeted offers
- [ ] AI payment recovery: intelligent dunning with customer-value-aware messaging
- [ ] Twilio webhook for inbound SMS → AI processing → response
- [ ] Chat widget for website embedding

**Deliverable:** Customers can book by texting the facility's number. AI handles 80%+ of customer inquiries. Empty slots get auto-promoted. Payment recovery is automated.

---

### PHASE 11: Reporting & Dashboard (Days 69-74)
**Goal:** Comprehensive analytics and reporting.

- [ ] Admin dashboard: today's bookings, projected revenue, alerts, quick actions
- [ ] Revenue reports: daily/weekly/monthly/YTD, by source, by space, by program
- [ ] Utilization reports: bookings per space, peak vs. off-peak, revenue per square foot
- [ ] Membership reports: active, new, churned, MRR trend, average tenure
- [ ] Program reports: fill rates, revenue per program, waitlist demand
- [ ] Customer reports: new vs. returning, top customers, LTV distribution
- [ ] Staff reports: hours, sessions, revenue attributed
- [ ] Financial reports: P&L summary, processing fees, refunds
- [ ] Export to CSV and PDF
- [ ] Auto-generated daily summary notification (push + email to owner)

**Deliverable:** Owner has complete visibility into business performance.

---

### PHASE 12: Polish & Launch Prep (Days 75-85)
**Goal:** Production-ready quality.

- [ ] Responsive design audit (every page works on mobile)
- [ ] Performance optimization (Core Web Vitals)
- [ ] Error handling and edge case cleanup
- [ ] Loading states and empty states for all views
- [ ] Onboarding flow polish (guided setup wizard for new facilities)
- [ ] Help/support integration (chat widget or help docs)
- [ ] SEO for public-facing pages (facility page, program listings)
- [ ] Rate limiting and security audit
- [ ] Stripe Connect compliance review
- [ ] Privacy policy, terms of service
- [ ] Beta testing with 3-5 real facilities
- [ ] Bug fixes from beta feedback

**Deliverable:** Production-ready platform. Ready for paying customers.

---

## Timeline Summary
| Phase | Days | Cumulative |
|-------|------|-----------|
| 0: Setup | 1 | 1 |
| 1: Facility Config | 3 | 4 |
| 2: Booking Engine | 8 | 12 |
| 3: Payments | 6 | 18 |
| 4: Memberships | 6 | 24 |
| 5: Waivers & Access | 6 | 30 |
| 6: Staff | 5 | 35 |
| 7: Programs | 7 | 42 |
| 8: CRM & Comms | 6 | 48 |
| 9: Leagues & Tournaments | 10 | 58 |
| 10: AI Layer | 10 | 68 |
| 11: Reporting | 6 | 74 |
| 12: Polish & Launch | 11 | 85 |

**Total: ~85 working days to MVP**

This is aggressive but achievable with Claude Code doing the heavy lifting. The key is building each phase as a complete, working piece before moving to the next.
