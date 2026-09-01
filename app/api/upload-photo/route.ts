import { NextRequest, NextResponse } from "next/server";
import { cropPhotoToBox, cropPhotoToCanvas, UnsupportedImageError } from "@/lib/imageUtils";

export const runtime = "nodejs";
export const maxDuration = 30;

// The client (components/PhotoUpload.tsx) always downscales before upload,
// so this should rarely trigger — it's defense-in-depth. Kept comfortably
// under Vercel's hard ~4.5MB serverless-function request body limit so the
// error below (not a generic platform 413) is what the user actually sees.
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo was uploaded." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large even after resizing (max 4MB). Try a different photo." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // A "crop" field means the user picked the box themselves; without one we
    // fall back to the automatic subject-aware crop.
    const rawCrop = formData.get("crop");
    if (typeof rawCrop === "string" && rawCrop.length > 0) {
      const box = JSON.parse(rawCrop);
      const dataUrl = await cropPhotoToBox(buffer, file.type, box);
      return NextResponse.json({ photoDataUrl: dataUrl });
    }
    const dataUrl = await cropPhotoToCanvas(buffer, file.type);
    return NextResponse.json({ photoDataUrl: dataUrl });
  } catch (err) {
    if (err instanceof UnsupportedImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to process photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
