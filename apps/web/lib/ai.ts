import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Model constants
export const AI_MODELS = {
  bookingAssistant: "claude-sonnet-4-5-20250929",
  customerService: "claude-haiku-4-5-20251001",
  reporting: "claude-sonnet-4-5-20250929",
} as const;
