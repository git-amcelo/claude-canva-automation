export type TemplateFamily = "colorBlock" | "tweetCard" | "photoBubble" | "textPost";

export type Variant = "neutral" | "branded";

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
