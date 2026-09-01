import { NextRequest, NextResponse } from "next/server";
import { editCopy } from "@/lib/llm/edit";
import { enforceStaticTweetIdentity } from "@/lib/llm/schemas";
import { renderSlides, buildRenderInput } from "@/lib/renderSlides";
import type { GenerateCopyResult } from "@/lib/llm";
import type { Variant } from "@/lib/templates/shared/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody {
  copy: GenerateCopyResult;
  instruction: string;
  variant: Variant;
  photoDataUrls?: string[];
}

/**
 * Which rendered pages changed between old and new copy. Returns "all" when
 * the slide count changed (page indices shift, so everything re-renders).
 */
function changedPageIndices(prev: GenerateCopyResult, next: GenerateCopyResult): number[] | "all" {
  if (prev.family === "colorBlock" && next.family === "colorBlock") {
    const sections = ["hook", "problem", "fix", "features", "cta"] as const;
    return sections
      .map((key, i) => (JSON.stringify(prev.slides[key]) !== JSON.stringify(next.slides[key]) ? i : -1))
      .filter((i) => i >= 0);
  }
  if (prev.family !== "colorBlock" && next.family !== "colorBlock") {
    const prevSlides = prev.slides as unknown[];
    const nextSlides = next.slides as unknown[];
    if (prevSlides.length !== nextSlides.length) return "all";
    return nextSlides
      .map((slide, i) => (JSON.stringify(prevSlides[i]) !== JSON.stringify(slide) ? i : -1))
      .filter((i) => i >= 0);
  }
  return "all";
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.copy?.family || !body.instruction?.trim()) {
    return NextResponse.json({ error: "An edit instruction is required." }, { status: 400 });
  }

  try {
    const updated = enforceStaticTweetIdentity(await editCopy(body.copy, body.instruction.trim()));
    const changed = changedPageIndices(body.copy, updated);
    const input = buildRenderInput(updated, body.variant, body.photoDataUrls);

    const slides = changed === "all" ? await renderSlides(input) : changed.length > 0 ? await renderSlides(input, changed) : [];

    return NextResponse.json({ copy: updated, slides, full: changed === "all" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to apply the edit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
