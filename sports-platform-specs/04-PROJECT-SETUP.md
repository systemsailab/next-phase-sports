# Project Setup & Environment Configuration

## Quick Start

### 1. Create the repo
```bash
mkdir sports-platform && cd sports-platform
npx create-turbo@latest . --example with-tailwind
```

Or start fresh:
```bash
mkdir sports-platform && cd sports-platform
git init
npm init -y

# Install Turborepo
npm install turbo --save-dev

# Create Next.js app
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Add shadcn/ui
cd apps/web
npx shadcn@latest init
# Choose: New York style, Zinc color, CSS variables: yes
cd ../..
```

### 2. Install core dependencies

```bash
cd apps/web

# Database
npm install prisma @prisma/client
npx prisma init

# Auth
npm install @clerk/nextjs

# Payments
npm install stripe @stripe/stripe-js @stripe/react-stripe-js

# AI
npm install ai @anthropic-ai/sdk

# Email
npm install resend

# SMS
npm install twilio

# Background Jobs
npm install inngest

# Utilities
npm install zod date-fns nanoid
npm install -D @types/node

cd ../..
```

### 3. Initialize Prisma
```bash
cd apps/web
# Copy the schema from 01-DATABASE-SCHEMA.prisma to prisma/schema.prisma
npx prisma generate
npx prisma db push  # For development (use migrations for production)
```

### 4. Set up environment variables
Create `apps/web/.env.local` with the variables below.

---

## Environment Variables

```env
# ===========================================
# DATABASE (Railway PostgreSQL)
# ===========================================
DATABASE_URL="postgresql://postgres:password@host:port/dbname?sslmode=require"
# Get this from Railway dashboard after creating a PostgreSQL service

# ===========================================
# AUTH (Clerk)
# ===========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"
CLERK_WEBHOOK_SECRET="whsec_..."
# Create webhooks in Clerk dashboard → Webhooks → Add endpoint
# URL: https://yourdomain.com/api/webhooks/clerk
# Events: user.created, user.updated, organization.created

# ===========================================
# PAYMENTS (Stripe)
# ===========================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
# Platform account (your Stripe account)
# Connected accounts created per facility via Stripe Connect
# Webhook endpoint: https://yourdomain.com/api/webhooks/stripe
# Events: checkout.session.completed, payment_intent.succeeded,
#   payment_intent.payment_failed, customer.subscription.created,
#   customer.subscription.updated, customer.subscription.deleted,
#   invoice.payment_failed, account.updated

# ===========================================
# AI (Anthropic / Claude)
# ===========================================
ANTHROPIC_API_KEY="sk-ant-..."
# Model defaults:
# Booking assistant: claude-sonnet-4-5-20250929
# Customer service: claude-haiku-4-5-20251001
# Report generation: claude-sonnet-4-5-20250929

# ===========================================
# EMAIL (Resend)
# ===========================================
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
# Verify your domain in Resend dashboard

# ===========================================
# SMS (Twilio)
# ===========================================
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."
# Each facility gets their own Twilio number (purchased via API)
# Webhook for inbound SMS: https://yourdomain.com/api/webhooks/twilio

# ===========================================
# BACKGROUND JOBS (Inngest)
# ===========================================
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
# Register webhook: https://yourdomain.com/api/inngest

# ===========================================
# FILE STORAGE (AWS S3 or Vercel Blob)
# ===========================================
# Option A: AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="sports-platform-uploads"

# Option B: Vercel Blob (simpler, no AWS needed)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# ===========================================
# APP CONFIG
# ===========================================
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_NAME="Platform Name"
NODE_ENV="development"
```

---

## Service Setup Guides

### Railway (Database)
1. Go to railway.app, create new project
2. Add PostgreSQL service
3. Copy connection string to DATABASE_URL
4. Add Redis service (for caching, later)
5. Copy Redis URL

### Vercel (Hosting)
1. Import GitHub repo to Vercel
2. Set root directory: `apps/web`
3. Framework: Next.js (auto-detected)
4. Add all environment variables
5. Deploy

### Clerk (Auth)
1. Create account at clerk.com
2. Create new application
3. Enable: Email, Google, Apple sign-in
4. Enable Organizations (for multi-tenant)
5. Set up roles: owner, admin, staff, coach, customer
6. Copy keys to env vars
7. Set up webhook endpoint

### Stripe (Payments)
1. Create Stripe account (platform account)
2. Enable Stripe Connect (Standard or Express)
3. Copy API keys
4. Set up webhook endpoint
5. Configure connected account settings:
   - Platform fee: 2.9% + $0.30
   - Payout schedule: daily or weekly

### Anthropic (AI)
1. Create account at console.anthropic.com
2. Generate API key
3. Copy to env var
4. Set up billing / usage limits

### Twilio (SMS)
1. Create Twilio account
2. Get account SID and auth token
3. Buy a phone number (or multiple for multiple facilities)
4. Configure SMS webhook URL
5. Set up messaging service for scalability

### Resend (Email)
1. Create Resend account
2. Add and verify your domain (DNS records)
3. Generate API key
4. Create email templates for transactional emails

### Inngest (Background Jobs)
1. Create Inngest account
2. Get event key and signing key
3. Define functions (reminder scheduling, payment retries, report generation)

---

## Key Configuration Files

### apps/web/middleware.ts (Clerk auth middleware)
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/book/(.*)",       // Public booking pages
  "/leagues/(.*)",    // Public league pages
  "/tournaments/(.*)",// Public tournament pages
  "/api/webhooks/(.*)", // Webhook endpoints
  "/api/ai/chat",     // Chat widget endpoint
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### apps/web/prisma/schema.prisma
Copy directly from 01-DATABASE-SCHEMA.prisma

### apps/web/next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
};

module.exports = nextConfig;
```

---

## Development Workflow

```bash
# Start development
cd apps/web
npm run dev

# Database operations
npx prisma studio     # Visual DB browser
npx prisma db push    # Push schema changes (dev)
npx prisma migrate dev --name "description"  # Create migration (prod)
npx prisma generate   # Regenerate client after schema changes

# Stripe CLI (for testing webhooks locally)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Inngest dev server (for testing background jobs locally)
npx inngest-cli dev
```

---

## Deployment Checklist

- [ ] All env vars set in Vercel
- [ ] PostgreSQL running on Railway
- [ ] Prisma migrations applied to production DB
- [ ] Clerk webhook endpoint configured
- [ ] Stripe webhook endpoint configured (production URL)
- [ ] Stripe Connect enabled and configured
- [ ] Twilio webhook endpoint configured
- [ ] Resend domain verified
- [ ] Inngest production keys set
- [ ] Custom domain configured in Vercel
- [ ] SSL certificate active
