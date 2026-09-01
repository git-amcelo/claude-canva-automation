/**
 * Client-side only. Downscales/re-encodes an uploaded photo before it's sent
 * to the server — keeps the request body well under Vercel's ~4.5MB
 * serverless-function body limit (and makes uploads faster generally, since
 * we only ever need ~1080x1350 for the final render regardless of the
 * original photo's resolution).
 */
export async function resizeImageForUpload(file: File, maxDimension = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image."))),
      "image/jpeg",
      quality
    );
  });
}
