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

/** A crop box in the source image's own pixel coordinates. */
export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops to the user's box first, then fits the result to the slide canvas.
 *
 * Cropping before the resize is what makes a hand-picked box meaningful: the
 * automatic "attention" crop used otherwise would happily throw away the part
 * they chose. The box is clamped to the image so a stale selection (or a
 * rounding overshoot at the edges) can't fail the extract.
 */
export async function cropPhotoToBox(buffer: Buffer, mimeType: string, box: CropBox): Promise<string> {
  if (!ALLOWED_MIME.has(mimeType.toLowerCase())) {
    throw new UnsupportedImageError(
      `Unsupported image type "${mimeType}". Please upload a JPEG, PNG, or WebP photo (HEIC/HEIF from iPhones isn't supported — export as JPEG first).`
    );
  }

  // .rotate() first so the box lines up with what the user actually saw.
  const upright = await sharp(buffer).rotate().toBuffer();
  const { width = 0, height = 0 } = await sharp(upright).metadata();

  const left = Math.max(0, Math.min(Math.round(box.x), Math.max(0, width - 1)));
  const top = Math.max(0, Math.min(Math.round(box.y), Math.max(0, height - 1)));
  const cropWidth = Math.max(1, Math.min(Math.round(box.width), width - left));
  const cropHeight = Math.max(1, Math.min(Math.round(box.height), height - top));

  const output = await sharp(upright)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();

  return `data:image/png;base64,${output.toString("base64")}`;
}
