import { z } from "zod";
import { TWEET_NAME, TWEET_HANDLE } from "../templates/shared/constants";
import type { TemplateFamily, ColorBlockSlides, TweetCardSlide, PhotoBubbleSlide, TextPostSlide, CaptionCopy } from "../templates/shared/types";

export const BRAND_VOICE = `You are writing Instagram carousel post copy for buckstreaming (buckstreaming.com), an all-in-one platform for fitness coaches/creators to run livestream classes, payments/subscriptions, and community in one app instead of juggling 3-5 separate tools. Voice: direct, confident, a little scrappy/founder-energy, never corporate. Captions are short and casual (1-3 sentences, can include a light emoji), never hashtag-stuffed. Never write clickable links in the caption itself (Instagram captions can't have clickable links) — put any link/URL mention in "firstComment" instead, matching how buckstreaming actually posts (e.g. a caption like "New branding is complete! Check the site out :)" with the link as a separate first comment).`;

export const CaptionSchema = z.object({
  caption: z.string().describe("Short, casual Instagram caption (1-3 sentences), matching buckstreaming's real voice."),
  firstComment: z.string().describe("Text for the first comment (where any link goes, since captions can't have clickable links)."),
});

const ColorBlockItemSchema = z.object({ title: z.string(), body: z.string() });
const ColorBlockSchema = z.object({
  hook: z.object({ headline: z.string(), subhead: z.string(), cta: z.string() }),
  problem: z.object({ headline: z.string(), items: z.array(ColorBlockItemSchema).length(3) }),
  fix: z.object({ headline: z.string(), items: z.array(ColorBlockItemSchema).length(3) }),
  features: z.object({
    headline: z.string(),
    items: z.array(z.object({ title: z.string(), body: z.string().optional() })).min(4).max(6),
  }),
  cta: z.object({ headline: z.string(), body: z.string() }),
});

const TweetCardSlideSchema = z.object({
  // Static brand identity — never model-generated; defaults cover older payloads.
  name: z.string().default(TWEET_NAME),
  handle: z.string().default(TWEET_HANDLE),
  timestamp: z.string().describe('e.g. "1h", "3h", "2d"'),
  body: z.string(),
  comments: z.string().describe('e.g. "82K"'),
  reposts: z.string(),
  likes: z.string(),
  bookmarks: z.string(),
});

const PhotoBubbleSlideSchema = z.object({
  bubbleText: z.string().describe("Short, punchy callout text for the text bubble, ~8-14 words."),
});

const TextPostSlideSchema = z.object({
  text: z.string().describe("Plain-text post body. Separate paragraphs with \\n\\n. Punchy opening line, then short scannable lines/paragraphs, closing takeaway."),
});

const ColorBlockResponseSchema = z.object({ slides: ColorBlockSchema, caption: CaptionSchema });
const TweetCardResponseSchema = z.object({ slides: z.array(TweetCardSlideSchema).min(1).max(10), caption: CaptionSchema });
const PhotoBubbleResponseSchema = z.object({ slides: z.array(PhotoBubbleSlideSchema).min(1).max(10), caption: CaptionSchema });
const TextPostResponseSchema = z.object({ slides: z.array(TextPostSlideSchema).min(1).max(10), caption: CaptionSchema });

export type GenerateCopyResult =
  | { family: "colorBlock"; slides: ColorBlockSlides; caption: CaptionCopy }
  | { family: "tweetCard"; slides: TweetCardSlide[]; caption: CaptionCopy }
  | { family: "photoBubble"; slides: PhotoBubbleSlide[]; caption: CaptionCopy }
  | { family: "textPost"; slides: TextPostSlide[]; caption: CaptionCopy };

/** The tweet template always posts as the brand — overwrite whatever the model returned. */
export function enforceStaticTweetIdentity(copy: GenerateCopyResult): GenerateCopyResult {
  if (copy.family !== "tweetCard") return copy;
  return { ...copy, slides: copy.slides.map((s) => ({ ...s, name: TWEET_NAME, handle: TWEET_HANDLE })) };
}

export interface GenerateCopyInput {
  family: TemplateFamily;
  variant?: "neutral" | "branded";
  topic: string;
  slideCount?: number;
}

export interface JsonSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

export const TOOL_SCHEMAS: Record<TemplateFamily, { name: string; description: string; input_schema: JsonSchema }> = {
  colorBlock: {
    name: "draft_color_block_carousel",
    description: "Draft the 5 fixed slides (Hook, Problem, Fix, Features, CTA) plus caption for the brand color-block carousel template.",
    input_schema: {
      type: "object",
      properties: {
        slides: {
          type: "object",
          properties: {
            hook: {
              type: "object",
              properties: {
                subhead: { type: "string", description: "Short supporting line above the headline." },
                headline: { type: "string", description: "Big bold hook question/statement." },
                cta: { type: "string", description: "Short CTA line at the bottom, e.g. 'You can start today!'" },
              },
              required: ["subhead", "headline", "cta"],
            },
            problem: {
              type: "object",
              properties: {
                headline: { type: "string" },
                items: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] },
                },
              },
              required: ["headline", "items"],
            },
            fix: {
              type: "object",
              properties: {
                headline: { type: "string" },
                items: {
                  type: "array",
                  minItems: 3,
                  maxItems: 3,
                  items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] },
                },
              },
              required: ["headline", "items"],
            },
            features: {
              type: "object",
              properties: {
                headline: { type: "string" },
                items: {
                  type: "array",
                  minItems: 4,
                  maxItems: 6,
                  items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title"] },
                },
              },
              required: ["headline", "items"],
            },
            cta: {
              type: "object",
              properties: { headline: { type: "string" }, body: { type: "string" } },
              required: ["headline", "body"],
            },
          },
          required: ["hook", "problem", "fix", "features", "cta"],
        },
        caption: {
          type: "object",
          properties: { caption: { type: "string" }, firstComment: { type: "string" } },
          required: ["caption", "firstComment"],
        },
      },
      required: ["slides", "caption"],
    },
  },
  tweetCard: {
    name: "draft_tweet_card_carousel",
    description:
      'Draft N fake-tweet slides plus caption for the Twitter-style carousel template. The account identity is fixed (BuckStreaming) — only draft the tweet body, timestamp and engagement numbers.',
    input_schema: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              timestamp: { type: "string", description: 'e.g. "1h", "3h", "2d"' },
              body: { type: "string" },
              comments: { type: "string", description: 'e.g. "82K"' },
              reposts: { type: "string" },
              likes: { type: "string" },
              bookmarks: { type: "string" },
            },
            required: ["timestamp", "body", "comments", "reposts", "likes", "bookmarks"],
          },
        },
        caption: {
          type: "object",
          properties: { caption: { type: "string" }, firstComment: { type: "string" } },
          required: ["caption", "firstComment"],
        },
      },
      required: ["slides", "caption"],
    },
  },
  textPost: {
    name: "draft_text_post_carousel",
    description:
      "Draft N plain-text post slides plus caption. Each slide is a clean screenshot-style text post (white background, brand header): a punchy opening statement, then short scannable paragraphs, ending with a takeaway line.",
    input_schema: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Plain-text post body. Separate paragraphs with \\n\\n. Keep it scannable — short lines, concrete numbers/examples, closing takeaway.",
              },
            },
            required: ["text"],
          },
        },
        caption: {
          type: "object",
          properties: { caption: { type: "string" }, firstComment: { type: "string" } },
          required: ["caption", "firstComment"],
        },
      },
      required: ["slides", "caption"],
    },
  },
  photoBubble: {
    name: "draft_photo_bubble_carousel",
    description: "Draft N text-bubble callouts (reusing one photo across all slides) plus caption for the photo+bubble carousel template.",
    input_schema: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            properties: { bubbleText: { type: "string" } },
            required: ["bubbleText"],
          },
        },
        caption: {
          type: "object",
          properties: { caption: { type: "string" }, firstComment: { type: "string" } },
          required: ["caption", "firstComment"],
        },
      },
      required: ["slides", "caption"],
    },
  },
};

export const RESPONSE_SCHEMAS: Record<TemplateFamily, z.ZodTypeAny> = {
  colorBlock: ColorBlockResponseSchema,
  tweetCard: TweetCardResponseSchema,
  photoBubble: PhotoBubbleResponseSchema,
  textPost: TextPostResponseSchema,
};

export function buildUserPrompt(input: GenerateCopyInput): string {
  return [
    `Template family: ${input.family}${input.variant ? ` (${input.variant} variant)` : ""}`,
    input.slideCount ? `Number of slides: ${input.slideCount}` : null,
    `Topic/brief from the client: ${input.topic}`,
  ]
    .filter(Boolean)
    .join("\n");
}
