# Autonomous Sports Facility Management Platform
## Technical Specification Package

### What Is This?
A complete technical spec package for building an AI-powered, autonomous sports facility management platform. This is everything a developer (or Claude Code) needs to build the product from scratch.

### Document Index

| # | File | Purpose | Read When |
|---|------|---------|-----------|
| 0 | `00-BUILD-ORDER.md` | **START HERE.** Phase-by-phase build plan with tech stack, repo structure, and prioritized task lists. | Before writing any code. |
| 1 | `01-DATABASE-SCHEMA.prisma` | Complete Prisma schema with every table, relationship, enum, and index. Copy this directly into your project. | When setting up the database (Phase 0). |
| 2 | `02-AI-PROMPTS.md` | System prompts, tool definitions, notification rules, and dunning sequences for all AI features. | When building AI features (Phase 10). |
| 3 | `03-USER-FLOWS.md` | Step-by-step user journeys for every critical flow: onboarding, booking, registration, leagues, tournaments, and autonomous operations. | When building any user-facing feature. Reference the relevant flow before coding each phase. |
| 4 | `04-PROJECT-SETUP.md` | Environment variables, service setup guides, configuration files, and deployment checklist. | During Phase 0 setup and before first deployment. |
| 5 | `Sports_Facility_Platform_PRD.docx` | Full Product Requirements Document with competitive analysis, feature specifications, revenue model, and go-to-market strategy. | For strategic context and feature completeness validation. |

### How to Use These Docs

**If you're a developer (or Claude Code):**
1. Read `00-BUILD-ORDER.md` first — it tells you what to build, in what order, with what tools
2. Set up the project using `04-PROJECT-SETUP.md`
3. Copy the schema from `01-DATABASE-SCHEMA.prisma` into your Prisma setup
4. For each phase, reference `03-USER-FLOWS.md` for the exact UX you're building
5. When you reach Phase 10 (AI), reference `02-AI-PROMPTS.md` for prompts and tools
6. When in doubt about feature scope, check the PRD

**If you're the product owner:**
- The PRD is your strategic doc — share with investors, partners, team
- The build order is your project timeline — track progress against it
- Everything else is for the builders

### Quick Stats
- **Total database tables:** 28
- **Build phases:** 13 (0-12)
- **Estimated timeline:** ~85 working days to MVP
- **AI features at launch:** 5 (scheduling assistant, customer service, smart notifications, auto-fill slots, payment recovery)
- **Integrations:** Stripe, Clerk, Twilio, Resend, Inngest, Kisi (smart locks)
