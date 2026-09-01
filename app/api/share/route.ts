import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { renderSlides } from "@/lib/renderSlides";
import { newShareId, putBundle, putImage } from "@/lib/share/store";
import { SHARE_TTL_DAYS, type ShareBundle } from "@/lib/share/types";
import type { RenderSlideInput } from "@/lib/templates/shared/types";

export const runtime = "nodejs";
// Renders up to 10 slides, re-encodes each, then uploads them — the slowest
// path in the app, so it gets the same headroom as /api/generate.
export const maxDuration = 60;

interface RequestBody {
  input: RenderSlideInput;
  caption?: string;
  firstComment?: string;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.input?.family) {
    return NextResponse.json({ error: "Missing render input." }, { status: 400 });
  }

  try {
    const id = newShareId();
    const rendered = await renderSlides(body.input);

    // JPEG rather than PNG: a 1080x1350 PNG runs to several MB, which is a slow
    // download on cellular. Instagram re-encodes to JPEG anyway, so quality 92
    // costs nothing visible and cuts the transfer by roughly an order of magnitude.
    const images = await Promise.all(
      rendered
        .slice()
        .sort((a, b) => a.index - b.index)
        .map(async (slide) => {
          const jpeg = await sharp(Buffer.from(slide.base64, "base64")).jpeg({ quality: 92 }).toBuffer();
          return putImage(id, slide.index, jpeg);
        })
    );

    const now = Date.now();
    const bundle: ShareBundle = {
      id,
      images,
      caption: body.caption ?? "",
      firstComment: body.firstComment ?? "",
      createdAt: now,
      expiresAt: now + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000,
    };
    await putBundle(bundle);

    // Built from the incoming request so it's correct on localhost, previews and
    // the production domain alike, without a hardcoded base URL.
    const origin = req.nextUrl.origin;
    return NextResponse.json({ id, url: `${origin}/share/${id}`, expiresAt: bundle.expiresAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create the share link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
