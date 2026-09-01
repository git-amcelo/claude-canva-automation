import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { callOllamaTool } from "./ollamaProvider";
import type { JsonSchema } from "./schemas";
import type { TemplateFamily, Variant } from "../templates/shared/types";

export interface RouteResult {
  family: TemplateFamily;
  variant: Variant;
  slideCount: number;
}

const RouteSchema = z.object({
  family: z.enum(["colorBlock", "tweetCard", "photoBubble", "textPost"]),
  variant: z.enum(["neutral", "branded"]),
  slideCount: z.number().int().min(1).max(10),
});

const ROUTE_TOOL_NAME = "choose_template";
const ROUTE_TOOL_DESCRIPTION =
  "Choose the best carousel template, variant and slide count for the client's post idea.";

const ROUTE_JSON_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    family: {
      type: "string",
      enum: ["colorBlock", "tweetCard", "photoBubble", "textPost"],
      description: "Which template family fits the post idea best.",
    },
    variant: {
      type: "string",
      enum: ["neutral", "branded"],
      description: 'Style variant. Only meaningful for tweetCard/photoBubble; use "branded" for colorBlock.',
    },
    slideCount: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "Number of slides. colorBlock is always 5. For the others pick 3-6 unless the idea clearly needs more or fewer.",
    },
  },
  required: ["family", "variant", "slideCount"],
};

function buildRoutePrompt(prompt: string, hasPhoto: boolean): string {
  return [
    "Pick the best Instagram carousel template for this post idea.",
    "",
    "Available templates:",
    '- "colorBlock": 5 fixed slides (Hook → Problem → Fix → Features → CTA) in brand colors. Best for product pitches, feature announcements, problem/solution stories. Always exactly 5 slides.',
    '- "tweetCard": fake-tweet screenshot cards. Best for hot takes, punchy one-liners, social proof, opinions, myth-busting lists.',
    `- "photoBubble": the client's photos with a bold callout pill on each slide (story-style). Best for personal-brand posts, behind-the-scenes, founder stories.${hasPhoto ? "" : " NOT AVAILABLE for this request — no photo was provided, so do not pick it."}`,
    '- "textPost": clean screenshot-style plain-text post (white background, brand header, black text). Best for educational breakdowns, myth-busting, step-by-step advice, listicles, long-form takes.',
    "",
    `Post idea from the client: ${prompt}`,
  ].join("\n");
}

async function routeWithAnthropic(prompt: string, hasPhoto: boolean): Promise<RouteResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local, or set LLM_PROVIDER=ollama.");
  }
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    tools: [{ name: ROUTE_TOOL_NAME, description: ROUTE_TOOL_DESCRIPTION, input_schema: ROUTE_JSON_SCHEMA }],
    tool_choice: { type: "tool", name: ROUTE_TOOL_NAME },
    messages: [{ role: "user", content: buildRoutePrompt(prompt, hasPhoto) }],
  });

  const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) throw new Error("Template routing failed — no structured output returned.");
  return RouteSchema.parse(toolUse.input);
}

async function routeWithOllama(prompt: string, hasPhoto: boolean): Promise<RouteResult> {
  return callOllamaTool({
    toolName: ROUTE_TOOL_NAME,
    toolDescription: ROUTE_TOOL_DESCRIPTION,
    jsonSchema: ROUTE_JSON_SCHEMA,
    zodSchema: RouteSchema,
    userPrompt: buildRoutePrompt(prompt, hasPhoto),
  });
}

/**
 * Has the LLM pick template family, variant and slide count from the raw
 * natural-language prompt, so the user never has to fill in a wizard.
 */
export async function chooseTemplate(prompt: string, hasPhoto: boolean): Promise<RouteResult> {
  const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();
  const result = provider === "anthropic" ? await routeWithAnthropic(prompt, hasPhoto) : await routeWithOllama(prompt, hasPhoto);

  // Guardrails: photoBubble without a photo can't render; colorBlock is always 5 pages.
  if (result.family === "photoBubble" && !hasPhoto) result.family = "tweetCard";
  if (result.family === "colorBlock") result.slideCount = 5;
  return result;
}
