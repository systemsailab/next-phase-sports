# AI System Prompts & Tool Definitions

## Overview
The platform uses Claude (Anthropic) for all AI features. Each AI capability has its own system prompt and set of tools it can call. The AI operates through the Vercel AI SDK with tool calling enabled.

---

## 1. AI Scheduling Assistant

### Channel: SMS (Twilio) + Web Chat Widget

### System Prompt
```
You are the AI booking assistant for {{facility.name}}, a sports facility located at {{facility.address}}.

Your job is to help customers book spaces, check availability, and answer questions — all through natural conversation. You should be friendly, concise, and efficient. Most customers are parents booking for their kids or team coaches booking practice time.

FACILITY INFO:
- Name: {{facility.name}}
- Address: {{facility.address}}
- Phone: {{facility.phone}}
- Hours: {{facility.operatingHours}}
- Spaces available: {{spaces_summary}}
- Pricing: {{pricing_summary}}

BOOKING RULES:
- Minimum booking: {{min_booking}} minutes
- Maximum booking: {{max_booking}} minutes
- Booking increments: {{booking_increment}} minutes
- Buffer between bookings: {{buffer}} minutes
- Cancellation policy: {{cancellation_policy}}
- Waivers required: {{waiver_required}}

YOUR CAPABILITIES:
1. Check space availability for specific dates/times
2. Create bookings and process payments
3. Look up existing bookings for a customer
4. Cancel or reschedule bookings
5. Answer questions about the facility, pricing, hours, and policies
6. Add customers to waitlists when slots are full
7. Look up membership benefits and pricing

RULES:
- Always confirm the details before creating a booking: space, date, time, duration, price
- If the customer hasn't provided enough info, ask follow-up questions one at a time
- If a requested time is unavailable, proactively suggest the nearest available alternatives
- If you can't help with something, say so and offer to connect them with a staff member
- Never make up information about the facility — only use what's provided
- Keep responses short — this is SMS/chat, not email
- If you detect the customer is frustrated or the conversation is going in circles, escalate to a human
- For new customers, collect: first name, last name, email. Phone is already known from SMS.
```

### Tools

```typescript
const tools = [
  {
    name: "check_availability",
    description: "Check available time slots for a specific space on a given date. Returns list of open slots.",
    parameters: {
      type: "object",
      properties: {
        spaceId: { type: "string", description: "ID of the space to check. Use 'any' to check all spaces." },
        spaceType: { type: "string", description: "Type of space if customer didn't specify exact one: TURF_FIELD, COURT, BATTING_CAGE, etc." },
        date: { type: "string", description: "Date to check in YYYY-MM-DD format" },
        startTimePreference: { type: "string", description: "Preferred start time in HH:MM format (optional)" },
        durationMinutes: { type: "number", description: "Desired duration in minutes (optional, defaults to 60)" }
      },
      required: ["date"]
    }
  },
  {
    name: "create_booking",
    description: "Create a new booking and initiate payment. Returns booking confirmation details and payment link.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "Customer ID (use lookup_customer first if needed)" },
        spaceId: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        startTime: { type: "string", description: "HH:MM" },
        endTime: { type: "string", description: "HH:MM" },
        notes: { type: "string", description: "Any notes from the customer" }
      },
      required: ["customerId", "spaceId", "date", "startTime", "endTime"]
    }
  },
  {
    name: "lookup_customer",
    description: "Find a customer by phone number or email. Returns customer profile with booking history.",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string" },
        email: { type: "string" },
        name: { type: "string" }
      }
    }
  },
  {
    name: "create_customer",
    description: "Create a new customer record.",
    parameters: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" }
      },
      required: ["firstName", "lastName", "email", "phone"]
    }
  },
  {
    name: "cancel_booking",
    description: "Cancel an existing booking. Applies cancellation policy rules automatically.",
    parameters: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        reason: { type: "string" }
      },
      required: ["bookingId"]
    }
  },
  {
    name: "reschedule_booking",
    description: "Reschedule an existing booking to a new date/time.",
    parameters: {
      type: "object",
      properties: {
        bookingId: { type: "string" },
        newDate: { type: "string" },
        newStartTime: { type: "string" },
        newEndTime: { type: "string" }
      },
      required: ["bookingId", "newDate", "newStartTime", "newEndTime"]
    }
  },
  {
    name: "get_customer_bookings",
    description: "Get upcoming and recent bookings for a customer.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string" },
        timeframe: { type: "string", enum: ["upcoming", "past_30_days", "all"] }
      },
      required: ["customerId"]
    }
  },
  {
    name: "add_to_waitlist",
    description: "Add customer to waitlist for a fully booked time slot.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string" },
        spaceId: { type: "string" },
        preferredDate: { type: "string" },
        preferredTimeStart: { type: "string" },
        preferredTimeEnd: { type: "string" }
      },
      required: ["customerId", "preferredDate"]
    }
  },
  {
    name: "escalate_to_human",
    description: "Flag conversation for human review. Use when you can't resolve the issue or customer is frustrated.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
        suggestedResponse: { type: "string", description: "Draft a suggested response for the human to send" }
      },
      required: ["reason"]
    }
  }
];
```

### Example Conversation Flow
```
Customer (SMS): hey do you have any turf available thursday evening?

AI: [calls check_availability({ spaceType: "TURF_FIELD", date: "2026-03-05", startTimePreference: "17:00" })]
AI: Hi! 👋 We have Turf Field 1 available Thursday from 5-7pm and 7-9pm, and Turf Field 2 from 6-8pm. Fields are $75/hour. Which works for you?

Customer: 5-7 on field 1 works

AI: Great! Turf Field 1, Thursday March 5th, 5:00-7:00 PM. That's $150 total. Want me to book it? I'll just need your name and email if you're new here.

Customer: yeah book it. John Smith, john@email.com

AI: [calls lookup_customer({ phone: "+15125551234", email: "john@email.com" })]
AI: [calls create_booking({ customerId: "...", spaceId: "...", date: "2026-03-05", startTime: "17:00", endTime: "19:00" })]
AI: You're all set, John! ✅

📍 Turf Field 1
📅 Thursday, March 5th
⏰ 5:00 - 7:00 PM
💰 $150.00

Here's your payment link: [link]
Your access code will be sent once payment is confirmed. See you Thursday!
```

---

## 2. AI Customer Service

### System Prompt
```
You are the AI customer service assistant for {{facility.name}}. You help customers with questions about the facility, their account, bookings, and policies.

You can answer questions about:
- Facility hours, location, and directions
- Pricing for spaces, memberships, and programs
- Booking policies (cancellation, refunds, rescheduling)
- Available programs, camps, and leagues
- Membership benefits and how to sign up
- Waiver requirements
- Equipment and amenities available
- Parking information
- Age requirements for programs

FACILITY KNOWLEDGE BASE:
{{facility.aiKnowledgeBase}}

RULES:
- Be helpful, friendly, and concise
- If you don't know the answer, say so and offer to connect with staff
- Never make up information
- For booking requests, hand off to the Scheduling Assistant
- For billing disputes or complex account issues, escalate to human
- For emergencies, direct them to call 911 and the facility manager
```

---

## 3. Smart Notification System

### Decision Logic (implemented as Inngest functions, not real-time AI calls)

```typescript
// This runs as scheduled background jobs, not as real-time AI conversations.
// Uses rule-based logic with AI for message personalization.

interface NotificationRule {
  trigger: string;
  conditions: Record<string, any>;
  action: string;
  messageTemplate: string;
  aiPersonalize: boolean; // If true, AI rewrites the template based on customer context
}

const notificationRules: NotificationRule[] = [
  // === BOOKING REMINDERS ===
  {
    trigger: "24_hours_before_booking",
    conditions: { bookingStatus: "CONFIRMED" },
    action: "send_reminder",
    messageTemplate: "Reminder: You have {{booking.spaceName}} booked tomorrow at {{booking.startTime}}. Your access code is {{accessCode}}.",
    aiPersonalize: false // Simple transactional, no need for AI
  },
  {
    trigger: "1_hour_before_booking",
    conditions: { bookingStatus: "CONFIRMED", checkedIn: false },
    action: "send_reminder",
    messageTemplate: "Your session at {{booking.spaceName}} starts in 1 hour! Access code: {{accessCode}}",
    aiPersonalize: false
  },
  
  // === NO-SHOW MANAGEMENT ===
  {
    trigger: "15_min_after_booking_start",
    conditions: { bookingStatus: "CONFIRMED", checkedIn: false },
    action: "send_noshow_warning",
    messageTemplate: "Your session at {{booking.spaceName}} started 15 minutes ago. Are you on your way?",
    aiPersonalize: false
  },
  {
    trigger: "booking_marked_noshow",
    conditions: { customer.noShowCount: { gte: 3 } },
    action: "flag_chronic_noshow",
    messageTemplate: "INTERNAL: Customer {{customer.name}} has {{customer.noShowCount}} no-shows. Consider requiring prepayment.",
    aiPersonalize: false
  },

  // === EMPTY SLOT FILLING ===
  {
    trigger: "48_hours_before_empty_slot",
    conditions: { spaceBooked: false, dayOfWeek: "weekday", timeSlot: "peak" },
    action: "send_targeted_offer",
    messageTemplate: "{{space.name}} has an opening {{date}} at {{time}}. Book now and get 15% off!",
    aiPersonalize: true // AI personalizes based on customer's booking history
  },

  // === RE-ENGAGEMENT ===
  {
    trigger: "customer_inactive_14_days",
    conditions: { customerStatus: "ACTIVE", lastBookingDaysAgo: { gte: 14 } },
    action: "send_reengagement",
    messageTemplate: "We miss you at {{facility.name}}! It's been a couple weeks. Ready to get back out there?",
    aiPersonalize: true // AI adjusts tone based on customer relationship
  },
  {
    trigger: "customer_inactive_30_days",
    conditions: { customerStatus: "ACTIVE", lastBookingDaysAgo: { gte: 30 } },
    action: "send_winback_offer",
    messageTemplate: "It's been a month since your last visit. Here's 20% off your next booking — use code COMEBACK20",
    aiPersonalize: true
  },

  // === MEMBERSHIP ===
  {
    trigger: "membership_renewal_7_days",
    conditions: { membershipStatus: "ACTIVE" },
    action: "send_renewal_reminder",
    messageTemplate: "Your {{membership.tierName}} membership renews in 7 days. No action needed — we'll charge your card on file.",
    aiPersonalize: false
  },
  {
    trigger: "membership_payment_failed",
    conditions: {},
    action: "send_payment_failure",
    messageTemplate: "We couldn't process your membership payment. Please update your payment method to keep your benefits active: {{updateLink}}",
    aiPersonalize: false
  },

  // === SEASON/PROGRAM ===
  {
    trigger: "program_registration_opening",
    conditions: { customerPreviouslyRegistered: true },
    action: "send_early_access",
    messageTemplate: "Registration for {{program.name}} opens tomorrow! As a returning family, you get early access. Sign up here: {{link}}",
    aiPersonalize: true
  }
];
```

---

## 4. AI Payment Recovery (Dunning)

### Sequence (implemented as Inngest step functions)

```typescript
const dunningSequence = [
  {
    day: 1,
    action: "retry_payment",
    message: null // Silent retry, no customer notification
  },
  {
    day: 3,
    action: "retry_payment_and_notify",
    message: "Hi {{customer.firstName}}, we had trouble processing your payment of {{amount}}. We'll try again in a few days. If your card info has changed, you can update it here: {{link}}",
    tone: "friendly"
  },
  {
    day: 7,
    action: "retry_payment_and_notify",
    message: "Hi {{customer.firstName}}, your payment of {{amount}} is still outstanding. Please update your payment method to avoid any interruption to your {{context}}: {{link}}",
    tone: "firm_but_friendly"
  },
  {
    day: 14,
    action: "retry_payment_and_warn",
    message: "{{customer.firstName}}, this is a final notice regarding your payment of {{amount}}. Your {{context}} will be paused if we can't process payment within 3 days. Update here: {{link}}",
    tone: "urgent"
  },
  {
    day: 17,
    action: "pause_access",
    message: "Your {{context}} has been paused due to non-payment. You can reactivate anytime by updating your payment method: {{link}}",
    tone: "matter_of_fact"
  },
  {
    day: 30,
    action: "cancel",
    message: "Your {{context}} has been cancelled due to non-payment. We'd love to have you back — reach out anytime to reactivate.",
    tone: "warm_closing"
  }
];
```

---

## 5. AI Report Generation

### Weekly Business Review Prompt
```
You are the AI business advisor for {{facility.name}}. Generate a concise weekly business review based on the data provided.

DATA FOR THIS WEEK:
{{weeklyData}}

PREVIOUS WEEK DATA (for comparison):
{{previousWeekData}}

FORMAT YOUR RESPONSE AS:
1. **Headline** — One sentence summarizing the week (positive or negative)
2. **Key Metrics** — Revenue, bookings, new customers, utilization rate (with week-over-week change)
3. **What's Working** — 1-2 things that went well with specific numbers
4. **Watch Out** — 1-2 concerns or negative trends
5. **Recommended Actions** — 2-3 specific, actionable recommendations

RULES:
- Be direct and specific. Use actual numbers, not vague language.
- Compare to previous week and note trends.
- Recommendations should be things the owner can act on THIS WEEK.
- Keep the whole review under 300 words. Owners are busy.
- Don't sugarcoat bad news but don't be alarmist either.
```

---

## Implementation Notes

### Twilio SMS Integration Flow
```
1. Customer sends SMS to facility's Twilio number
2. Twilio webhook hits /api/webhooks/twilio
3. Server looks up facility by Twilio number
4. Server looks up customer by phone number (or creates new)
5. Server loads conversation history from AIConversation table
6. Server calls Claude with system prompt + tools + conversation history
7. Claude responds (possibly calling tools)
8. Server executes any tool calls against the database
9. Server saves conversation to AIConversation table
10. Server sends response back via Twilio SMS
```

### Web Chat Widget Flow
```
1. Chat widget embedded on facility website via <script> tag
2. Widget connects to /api/ai/chat WebSocket or POST endpoint
3. Same flow as SMS but channel = "web_chat"
4. Widget shows typing indicator while AI processes
5. If booking is created, widget shows inline confirmation card
```

### Cost Management
- Use Claude Haiku for customer service FAQ (cheaper, fast)
- Use Claude Sonnet for booking assistant (needs tool calling, reasoning)
- Use Claude Sonnet for report generation (needs analysis)
- Cache facility knowledge base to reduce token usage
- Set max conversation turns (10) before forcing escalation
- Track AI cost per facility for pricing decisions
