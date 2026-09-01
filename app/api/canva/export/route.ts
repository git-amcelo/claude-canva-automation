import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/canva/auth";
import { buildCarouselPptx } from "@/lib/canva/pptx";
import { importPptxAsDesign } from "@/lib/canva/importDesign";
import type { GenerateCopyResult } from "@/lib/llm";
import type { Variant } from "@/lib/templates/shared/types";

export const runtime = "nodejs";
// PPTX build + upload + Canva-side conversion polling.
export const maxDuration = 120;

interface RequestBody {
  copy: GenerateCopyResult;
  variant: Variant;
  photoDataUrls?: string[];
  title?: string;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.copy?.family) {
    return NextResponse.json({ error: "Nothing to export yet — generate a carousel first." }, { status: 400 });
  }

  let token: string | null;
  try {
    token = await getAccessToken();
  } catch (err) {
    // Misconfigured credentials — surface the setup message.
    const message = err instanceof Error ? err.message : "Canva is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (!token) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  try {
    const title = body.title?.trim() || `BUCK carousel — ${new Date().toLocaleDateString()}`;
    const pptx = await buildCarouselPptx(body.copy, body.variant, body.photoDataUrls ?? []);
    const design = await importPptxAsDesign(pptx, title, token);
    return NextResponse.json(design);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export to Canva.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
