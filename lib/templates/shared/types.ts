export type TemplateFamily = "colorBlock" | "tweetCard" | "photoBubble" | "textPost";

export type Variant = "neutral" | "branded";

/**
 * A drag offset in canvas pixels (the 1080x1350 design space), applied as a
 * `translate()` on top of the element's normal laid-out position. Absent or
 * {0,0} means "wherever the template puts it" — so untouched designs render
 * exactly as they always did.
 */
export interface Offset {
  x: number;
  y: number;
}

export interface ColorBlockSlide {
  /** page 1: hook headline; page 2/3: section title; page 4: "THE FEATURES"; page 5: CTA headline */
  eyebrow?: string;
  headline: string;
  body?: string;
  items?: { title: string; body?: string }[];
  cta?: string;
}

export interface ColorBlockSlides {
  hook: { headline: string; subhead: string; cta: string };
  problem: { headline: string; items: { title: string; body: string }[] };
  fix: { headline: string; items: { title: string; body: string }[] };
  features: { headline: string; items: { title: string; body?: string }[] };
  cta: { headline: string; body: string };
  /**
   * Per-element drag offsets, keyed by a stable path like "hook.headline" or
   * "problem.item.0.title" (see COLOR_BLOCK_KEYS). Only set for elements the
   * user has actually dragged.
   */
  positions?: Record<string, Offset>;
  /** Per-page background colour overrides, indexed 0-4; holes fall back to the brand default. */
  backgrounds?: (string | undefined)[];
}

export interface TweetCardSlide {
  name: string;
  handle: string;
  timestamp: string;
  body: string;
  comments: string;
  reposts: string;
  likes: string;
  bookmarks: string;
}

export interface PhotoBubbleSlide {
  bubbleText: string;
  /** Where the user dragged the callout bubble, relative to its default spot. */
  bubblePosition?: Offset;
  /** Bubble fill colour override; falls back to the variant's default. */
  bubbleColor?: string;
}

export interface TextPostSlide {
  /** Plain-text body; use \n\n between paragraphs. */
  text: string;
}

export interface CaptionCopy {
  caption: string;
  firstComment: string;
}

export type RenderSlideInput =
  | { family: "colorBlock"; slides: ColorBlockSlides }
  | { family: "tweetCard"; variant: Variant; slides: TweetCardSlide[] }
  | { family: "photoBubble"; variant: Variant; slides: PhotoBubbleSlide[]; photoDataUrls: string[] }
  | { family: "textPost"; slides: TextPostSlide[] };
