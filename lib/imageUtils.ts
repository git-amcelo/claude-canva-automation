import sharp from "sharp";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./templates/shared/constants";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export class UnsupportedImageError extends Error {}

/**
 * Crops/resizes an uploaded photo to exactly the carousel canvas size and
 * returns it as a base64 PNG data URI, ready to embed as an <img src>.
 * Rejects HEIC/HEIF and anything else not reliably decodable server-side —
 * the client should also validate this before upload so the error surfaces
 * immediately rather than after a slow upload.
 */
export async function cropPhotoToCanvas(buffer: Buffer, mimeType: string): Promise<string> {
  if (!ALLOWED_MIME.has(mimeType.toLowerCase())) {
    throw new UnsupportedImageError(
      `Unsupported image type "${mimeType}". Please upload a JPEG, PNG, or WebP photo (HEIC/HEIF from iPhones isn't supported — export as JPEG first).`
    );
  }

  const output = await sharp(buffer)
    .rotate() // apply EXIF orientation
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();

  return `data:image/png;base64,${output.toString("base64")}`;
}
