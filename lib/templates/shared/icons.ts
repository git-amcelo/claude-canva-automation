import { readFile } from "node:fs/promises";
import path from "node:path";

const ICONS_DIR = path.join(process.cwd(), "assets", "icons");

const ICON_FILES = {
  comment: "comment.svg",
  retweet: "retweet.svg",
  heart: "heart.svg",
  bookmark: "bookmark.svg",
  share: "share.svg",
} as const;

export type IconName = keyof typeof ICON_FILES;

let cache: Record<IconName, string> | null = null;

/** Loads the tweet-card engagement icons as base64 data URIs (cached per process). */
export async function loadIcons(): Promise<Record<IconName, string>> {
  if (cache) return cache;

  const entries = await Promise.all(
    (Object.keys(ICON_FILES) as IconName[]).map(async (key) => {
      const svg = await readFile(path.join(ICONS_DIR, ICON_FILES[key]), "utf-8");
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      return [key, dataUrl] as const;
    })
  );

  cache = Object.fromEntries(entries) as Record<IconName, string>;
  return cache;
}
