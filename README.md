# Next Phase Sports — Autonomous Sports Facility Management Platform

An AI-powered, autonomous sports facility management platform. Built with Next.js, Prisma, Clerk, Stripe, and Claude AI.

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React + Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL (Railway) + Prisma ORM
- **Auth:** Clerk (multi-tenant, role-based)
- **Payments:** Stripe Connect
- **AI:** Claude API via Vercel AI SDK
- **SMS:** Twilio
- **Email:** Resend
- **Jobs:** Inngest
- **Hosting:** Vercel (frontend) + Railway (DB)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local

# Generate Prisma client
cd apps/web && npx prisma generate

# Run development server
npm run dev
```

## Project Structure

```
apps/
  web/          # Next.js app (customer + admin)
packages/
  shared/       # Shared types, validators, constants
  ai-prompts/   # AI system prompts and tool definitions
sports-platform-specs/  # Product specs and documentation
```

## Build Phases

See [`sports-platform-specs/00-BUILD-ORDER.md`](sports-platform-specs/00-BUILD-ORDER.md) for the full 13-phase build plan (~85 working days to MVP).
