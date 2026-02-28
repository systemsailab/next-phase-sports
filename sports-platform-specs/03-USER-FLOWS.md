# Core User Flows

## Overview
These are the step-by-step flows for every critical user journey. Build screens and API endpoints to match these exactly.

---

## FLOW 1: Facility Owner Onboarding

### Trigger: Owner signs up for the first time

```
1. Sign up via Clerk (email + password or Google OAuth)
2. Welcome screen: "Let's set up your facility"
3. Step 1 — Facility Info:
   - Facility name
   - Address (auto-complete with Google Places)
   - Phone number
   - Email
   - Timezone (auto-detected from address)
   - Logo upload (optional, can skip)
4. Step 2 — Operating Hours:
   - Day-by-day hour picker (Mon-Sun)
   - Toggle days open/closed
   - Default: Mon-Fri 6am-10pm, Sat-Sun 8am-8pm
5. Step 3 — Add Your Spaces:
   - "+ Add Space" button
   - For each space: name, type (dropdown), hourly rate, capacity
   - Show preview card as they add
   - Minimum 1 space required to proceed
   - Can add more later
6. Step 4 — Payments Setup:
   - "Connect Stripe to accept payments"
   - Stripe Connect onboarding flow (OAuth redirect)
   - If they skip: "You can set this up later, but you won't be able to accept bookings until payments are connected"
7. Step 5 — Cancellation Policy:
   - Simple selector: "Free cancellation up to [24/12/6/2] hours before"
   - "Credit only after that" toggle
   - "No refund within [2/1] hours" toggle
8. Done screen:
   - "Your facility is live! Here's what to do next:"
   - Share your booking link: [facility-slug].ourplatform.com
   - Set up AI assistant (link to settings)
   - Add your first program or league
   - Dashboard link

### Technical: Creates Facility, Spaces, and sets up Clerk organization with owner role.
```

---

## FLOW 2: Customer Books a Space (Web)

### Trigger: Customer visits facility's booking page

```
1. Landing page shows facility info: name, photo, hours, address
2. "Book Now" section shows available spaces as cards:
   - Space name, type icon, photo, hourly rate
   - "View Availability" button
3. Customer clicks a space (or "Any Available")
4. Date picker appears:
   - Calendar view, current week highlighted
   - Dates with availability shown in green
   - Fully booked dates shown in gray
5. Customer selects a date
6. Time slot grid appears:
   - Shows available time blocks
   - Already booked = grayed out
   - Customer taps start time
   - Duration selector: 30min, 1hr, 1.5hr, 2hr (based on space config)
   - Or drag to select custom end time
   - Price updates in real-time as they select duration
7. Booking summary sidebar:
   - Space name
   - Date & time
   - Duration
   - Price (shows member price if logged in as member)
   - Coupon code field
   - "Book Now" button
8. If not logged in: quick auth modal
   - "Sign in" or "Continue as guest"
   - Guest: first name, last name, email, phone
   - Sign in: Clerk auth
9. Waiver check:
   - If waiver required and not signed: waiver modal appears
   - Must sign before proceeding
   - If minor: "This waiver must be signed by a parent/guardian" + email input
10. Payment:
    - Stripe Payment Element (card, Apple Pay, Google Pay)
    - If member with credit package: option to use credits
    - "Pay $XXX" button
11. Confirmation screen:
    - ✅ Booking confirmed!
    - All details displayed
    - Access code (if access control enabled)
    - "Add to Calendar" buttons (Google, Apple, Outlook)
    - "Share this booking" (for team bookings)
    - Receipt sent to email
12. Post-booking:
    - Confirmation email sent (via Resend)
    - SMS confirmation sent (via Twilio)
    - Reminder scheduled: 24hr before + 1hr before (via Inngest)
    - Access code generated and stored

### Edge Cases:
- If slot becomes unavailable during checkout (race condition): show error, suggest alternatives
- If payment fails: show error, let them retry or use different card
- If coupon is invalid/expired: show inline error
- Recurring booking: after step 6, show "Make this recurring?" toggle with frequency options
```

---

## FLOW 3: Customer Books via AI SMS

### Trigger: Customer texts facility's AI phone number

```
1. Inbound SMS received by Twilio
2. Twilio webhook fires to /api/webhooks/twilio
3. System looks up facility by Twilio number
4. System looks up customer by sender phone number
5a. If customer found: load customer context (name, history, membership)
5b. If customer NOT found: AI will collect info during conversation

EXAMPLE CONVERSATION:

Customer: "Hey, do you have a cage open Saturday morning?"
AI: [calls check_availability for BATTING_CAGE on Saturday]
AI: "Hi! We have Cage A open Saturday 8-10am and 11am-1pm, and Cage B from 9-11am. $40/hour. Which works?"

Customer: "Cage A 8 to 9 works"
AI: "Got it! Cage A, Saturday March 7th, 8:00-9:00 AM, $40. Should I book it? I'll just need your name and email if you're new."

Customer: "Yeah go for it. Mike Johnson mike@email.com"
AI: [calls create_customer, then create_booking]
AI: "All set, Mike! ✅
📍 Cage A
📅 Saturday, March 7
⏰ 8:00 - 9:00 AM
💰 $40

Pay here: [Stripe payment link]
Your access code will be sent once payment is confirmed. See you Saturday!"

--- After payment completes (via Stripe webhook): ---
AI (auto-sent): "Payment received! Your access code for Saturday is: 847291. This code works from 7:45 AM to 9:00 AM. Have a great session!"
```

---

## FLOW 4: Program Registration (Camp/Clinic)

### Trigger: Customer wants to register child for a camp

```
1. Customer browses Programs page
2. Program cards show: name, dates, times, age range, price, spots remaining
3. Customer clicks a program
4. Program detail page:
   - Description
   - Schedule (all sessions listed)
   - Coach/instructor info
   - What to bring
   - Age/skill requirements
   - Price (member price if applicable)
   - "Register Now" button
5. Registration form:
   - Participant selection:
     - If logged in: show linked children in family account
     - "Register [Child Name]" buttons
     - Or "Register new participant" — collects name, DOB, age
   - Custom fields (from program config): t-shirt size, allergies, medical conditions, etc.
   - Emergency contact info
   - Multi-child: "Add another participant" button (+$X per additional, sibling discount applied)
6. Documents:
   - Waiver (if not already signed this year)
   - Medical form (if required by program)
   - Photo release (if required)
7. Payment:
   - Shows total with any discounts applied (member, sibling, early bird)
   - Payment plan option if enabled: "Pay in full ($300)" or "3 payments of $100"
   - Stripe payment
8. Confirmation:
   - Registration confirmed
   - Calendar entries for all sessions
   - Reminder: "Don't forget to bring [items from program config]"
   - Parent dashboard: can view all registered programs, upcoming sessions, and child info
```

---

## FLOW 5: League Registration & Season

### Trigger: Team manager registers team for a league

```
REGISTRATION:
1. Team manager views Leagues page
2. Clicks on league (e.g., "Spring 2026 Adult Soccer League")
3. League detail: format, dates, divisions, team fee, schedule info
4. "Register Your Team" button
5. Team info form:
   - Team name
   - Division (selected from available: U12, U14, Adult, etc.)
   - Coach/manager name, email, phone
   - Roster: add players (name, email, jersey number, position)
   - Can add roster later before deadline
6. Payment: team fee via Stripe
7. Confirmation: team registered, waiting for season schedule

SCHEDULE GENERATION (Admin):
1. Admin goes to League > Schedule
2. Clicks "Generate Schedule"
3. System runs scheduling algorithm:
   - Input: teams, available spaces, dates, constraints
   - Output: full season schedule respecting home/away balance, rest days, field availability
4. Admin reviews schedule, can manually adjust
5. Clicks "Publish Schedule"
6. All team contacts receive schedule notification

DURING SEASON:
1. Games appear on facility calendar
2. After each game, scores entered by:
   - Coach via mobile app (simple score entry screen)
   - Or admin
3. Standings auto-update:
   - Wins, losses, ties, point differential
   - Tiebreakers applied per league rules
4. Standings visible on public league page

PLAYOFFS:
1. Regular season ends
2. System auto-generates playoff bracket based on standings
3. Bracket visible on league page
4. Games scheduled on available spaces
5. Bracket updates as scores entered
6. Champion determined
```

---

## FLOW 6: Tournament (Standalone)

### Trigger: Tournament director creates a tournament

```
SETUP:
1. Director creates tournament:
   - Name, sport, dates, format
   - Divisions
   - Team fee
   - Game length, break between games
   - Available venues/spaces (can span multiple facilities)
2. Registration opens:
   - Public tournament page with details
   - "Register Team" flow (same as league registration)
   - Payment collected per team

SCHEDULING:
1. Registration closes
2. Director clicks "Generate Schedule"
3. System generates based on format:
   - Pool play: random or seeded pools, round robin within pools
   - Bracket: seeded based on registration order or director input
4. Multi-field optimization: minimize gaps, balance field usage
5. Director publishes schedule
6. All teams notified with schedule and field assignments

GAME DAY:
1. Live bracket/schedule page (public URL, mobile-optimized)
2. Score entry: refs, coaches, or director enter scores
3. Brackets update in real-time
4. Schedule adjustments: if game runs long, system suggests cascade delays
5. Push notifications to affected teams for schedule changes

POST-TOURNAMENT:
1. Final results published
2. Archive of all scores, brackets, standings
3. Next tournament: "Copy tournament" to create new one with same settings
```

---

## FLOW 7: Admin Daily Operations (Autonomous Mode)

### What the owner sees day-to-day when everything is running autonomously

```
MORNING (push notification):
"Good morning! Here's today at [Facility Name]:
📊 18 bookings | $2,340 projected revenue
✅ No issues flagged
🧹 Field 3 cleaning at 2pm between sessions
📱 3 new bookings via AI last night"

DASHBOARD (when they open the app):
- Today's schedule: visual calendar with all bookings
- Revenue: today vs. same day last week
- Alerts: anything needing attention (0 ideally)
- AI Activity: bookings made, questions answered, escalations
- Quick Actions: manual booking, add customer, send campaign

WEEKLY (auto-generated Sunday evening):
"Weekly Review — Feb 22-28, 2026
💰 Revenue: $14,200 (+8% vs last week)
📅 Bookings: 94 (+12)
👥 New customers: 7
🏟️ Utilization: 72% (up from 68%)
⚡ What worked: Tuesday promo filled 6 empty slots ($450)
⚠️ Watch: Saturday PM utilization dropped 15% — weather?
💡 Suggestion: Consider running a Friday night league — your 6-9pm Friday slots are 40% empty."

OWNER'S ONLY REQUIRED ACTIONS:
1. Review and approve AI-suggested pricing changes (weekly)
2. Physical facility maintenance decisions
3. Strategic decisions (new programs, partnerships, expansion)
4. Review escalated AI conversations (rare)

EVERYTHING ELSE IS AUTOMATED:
- Bookings → AI + self-service
- Payments → auto-processed
- Reminders → auto-sent
- No-shows → auto-flagged
- Empty slots → auto-promoted
- Failed payments → auto-dunned
- Waivers → auto-collected
- Access codes → auto-generated
- Staff schedules → auto-optimized
- Reports → auto-generated
```

---

## FLOW 8: Access Control (Unmanned Facility)

```
BOOKING CONFIRMED:
1. System generates unique access code (6-digit PIN or QR)
2. Code valid from: 15 min before booking start to booking end time
3. Code sent via SMS and shown in app

ARRIVAL:
1. Customer approaches facility door
2. Scans QR code or enters PIN at smart lock terminal
3. System verifies:
   a. Code is valid ✓
   b. Current time is within valid window ✓
   c. Waiver is signed ✓
   d. Payment is confirmed ✓
4. Door unlocks
5. Check-in recorded in system
6. Facility lights/HVAC activate (if IoT connected)

DURING SESSION:
7. 10 min before end: push notification "Your session ends in 10 minutes"
8. At end time: push notification "Your session has ended. Please wrap up."
9. 15 min after end time (grace period): second notification + alert to admin

END:
10. Customer leaves
11. If next booking: next customer's code activates
12. If no next booking: lights/HVAC schedule adjusts

MEMBER 24/7 ACCESS:
- Premium members get persistent access code
- Valid during facility hours (or 24/7 for VIP tier)
- No individual booking needed
- Usage tracked for hours-per-month limits
```
