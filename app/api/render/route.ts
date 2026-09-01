import { NextRequest, NextResponse } from "next/server";
import { renderSlides } from "@/lib/renderSlides";
import type { RenderSlideInput } from "@/lib/templates/shared/types";

export const runtime = "nodejs";
// Up to 10 slides rendered in parallel via ImageResponse — generous headroom
// past Vercel's 10s Hobby default in case of cold starts.
export const maxDuration = 60;

interface RequestBody {
  input: RenderSlideInput;
  /** 0-indexed pages/slides to render this call; omit to render all. Used for single-slide regeneration. */
  pageIndices?: number[];
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { input } = body;
  if (!input?.family) {
    return NextResponse.json({ error: "Missing render input." }, { status: 400 });
  }

  try {
    const rendered = await renderSlides(input, body.pageIndices);
    return NextResponse.json({ slides: rendered });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
