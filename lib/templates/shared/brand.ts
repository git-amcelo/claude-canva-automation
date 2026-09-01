import { readFile } from "node:fs/promises";
import path from "node:path";

/** Data URIs for the brand marks the tweet-style templates draw. */
export interface BrandMarks {
  /** The BUCK app icon, used as the account avatar. */
  avatar: string;
  /** Blue verified badge with a white tick. */
  verified: string;
}

const AVATAR_PATH = path.join(process.cwd(), "public", "apple-touch-icon.png");
const VERIFIED_PATH = path.join(process.cwd(), "assets", "icons", "verified.svg");

let cache: BrandMarks | null = null;

/**
 * Loads the avatar and verified badge as base64 data URIs (cached per
 * process). Satori can't fetch by URL, so both have to be inlined.
 */
export async function loadBrandMarks(): Promise<BrandMarks> {
  if (cache) return cache;

  const [avatarPng, verifiedSvg] = await Promise.all([readFile(AVATAR_PATH), readFile(VERIFIED_PATH, "utf-8")]);

  cache = {
    avatar: `data:image/png;base64,${avatarPng.toString("base64")}`,
    verified: `data:image/svg+xml;base64,${Buffer.from(verifiedSvg).toString("base64")}`,
  };
  return cache;
}
