import { TWEET_NAME, TWEET_HANDLE } from "@/lib/templates/shared/constants";
import type { GenerateCopyResult } from "@/lib/llm";
import type { TemplateFamily } from "@/lib/templates/shared/types";

const blankItems = (n: number) => Array.from({ length: n }, () => ({ title: "", body: "" }));

/**
 * Builds an empty copy shell for a family — no AI call involved. Used by the
 * "I already have the content" flow: the client seeds this, then the user
 * fills every field in directly on the slide canvas (paste from elsewhere).
 */
export function buildBlankCopy(
  family: TemplateFamily,
  opts: { slideCount: number; photoBubbleTexts?: string[] }
): GenerateCopyResult {
  const caption = { caption: "", firstComment: "" };

  if (family === "colorBlock") {
    return {
      family,
      caption,
      slides: {
        hook: { headline: "", subhead: "", cta: "" },
        problem: { headline: "", items: blankItems(3) },
        fix: { headline: "", items: blankItems(3) },
        features: { headline: "", items: blankItems(4) },
        cta: { headline: "", body: "" },
      },
    };
  }

  if (family === "tweetCard") {
    return {
      family,
      caption,
      slides: Array.from({ length: opts.slideCount }, () => ({
        name: TWEET_NAME,
        handle: TWEET_HANDLE,
        timestamp: "",
        body: "",
        comments: "",
        reposts: "",
        likes: "",
        bookmarks: "",
      })),
    };
  }

  if (family === "textPost") {
    return { family, caption, slides: Array.from({ length: opts.slideCount }, () => ({ text: "" })) };
  }

  // photoBubble — one slide per photo; carries over per-photo captions if the
  // user already typed/pasted them onto each photo during upload.
  return {
    family,
    caption,
    slides: Array.from({ length: opts.slideCount }, (_, i) => ({ bubbleText: opts.photoBubbleTexts?.[i] ?? "" })),
  };
}
