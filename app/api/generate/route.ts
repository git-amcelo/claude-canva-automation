import { NextRequest, NextResponse } from "next/server";
import { generateCopy } from "@/lib/llm";
import { chooseTemplate } from "@/lib/llm/router";
import { enforceStaticTweetIdentity } from "@/lib/llm/schemas";
import { renderSlides, buildRenderInput } from "@/lib/renderSlides";
import type { GenerateCopyResult } from "@/lib/llm";
import type { TemplateFamily, Variant } from "@/lib/templates/shared/types";

export const runtime = "nodejs";
// Routing + copy + up to 10 parallel renders in one request. Local Ollama
// inference is the slow path; Anthropic typically completes well under this.
export const maxDuration = 120;

interface RequestBody {
  /** The natural-language post idea — the only required field. */
  prompt: string;
  /** Optional photos (data URLs) — unlock the photoBubble template; cycled one per slide. */
  photoDataUrls?: string[];
  /** Optional manual override; when omitted the LLM picks the template. */
  family?: TemplateFamily;
  /** Optional slide count for tweetCard/textPost; ignored for colorBlock (5) and photoBubble (= photo count). */
  slideCount?: number;
}

export interface GenerateResponse {
  copy: GenerateCopyResult;
  selection: { family: TemplateFamily; variant: Variant; slideCount: number; auto: boolean };
  slides: { index: number; base64: string }[];
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Tell me what the post is about first." }, { status: 400 });
  }

  const photos = body.photoDataUrls ?? [];
  const hasPhoto = photos.length > 0;
  if (body.family === "photoBubble" && !hasPhoto) {
    return NextResponse.json({ error: "The Photo + bubble template needs at least one photo — add one first." }, { status: 400 });
  }

  try {
    // 1. Route: LLM picks template/variant/slideCount unless the user overrode the family.
    const auto = !body.family;
    const routed = await chooseTemplate(prompt, hasPhoto);
    const family = body.family ?? routed.family;
    const variant = routed.variant;
    // Slide-count rules: colorBlock is fixed at 5; photoBubble gets exactly one
    // slide per uploaded photo; the rest honor the user's choice, else the router's.
    const slideCount =
      family === "colorBlock"
        ? 5
        : family === "photoBubble"
          ? Math.min(photos.length, 10)
          : Math.min(Math.max(Math.round(body.slideCount ?? routed.slideCount), 1), 10);

    // 2. Draft the copy (tweet identity is always forced to the brand account).
    const copy = enforceStaticTweetIdentity(await generateCopy({ family, variant, topic: prompt, slideCount }));

    // 3. Render every slide in the same request — no separate render click.
    const slides = await renderSlides(buildRenderInput(copy, variant, photos));

    const response: GenerateResponse = { copy, selection: { family, variant, slideCount, auto }, slides };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate the post.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
