import type sharpType from "sharp";

/**
 * Loads sharp on first use rather than at module scope.
 *
 * sharp resolves a native binary from a separate @img/sharp-<platform> package
 * at require time. When that fails on a serverless host, a top-level import
 * throws while the module is being evaluated — before any handler or
 * try/catch exists — so the platform returns its own HTML error page and the
 * real reason is never seen. Loading it lazily keeps the failure inside a
 * request, where the message can be caught and reported.
 */
export class ImageEngineError extends Error {}

let cached: typeof sharpType | null = null;

export async function getSharp(): Promise<typeof sharpType> {
  if (cached) return cached;
  try {
    const mod = await import("sharp");
    cached = mod.default;
    return cached;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ImageEngineError(`The image engine failed to load on the server: ${detail}`);
  }
}
