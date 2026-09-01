import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { renderToPngBuffer } from "@/lib/render";
import { renderColorBlockPage } from "@/lib/templates/colorBlock";
import { renderTweetCardPage } from "@/lib/templates/tweetCard";
import { renderPhotoBubblePage } from "@/lib/templates/photoBubble";
import { renderTextPostPage } from "@/lib/templates/textPost";
import { loadIcons } from "@/lib/templates/shared/icons";
import { CANVAS_WIDTH, CANVAS_HEIGHT, TWEET_NAME, TWEET_HANDLE } from "@/lib/templates/shared/constants";
import type { TemplateFamily } from "@/lib/templates/shared/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Rendered once per family per server process, then served from memory.
const cache = new Map<string, Buffer>();

/**
 * The real sample photo shipped with the repo (client-provided gym selfie),
 * pre-cropped to 1080x1350. Falls back to a gradient if the file is missing.
 */
async function samplePhotoDataUrl(): Promise<string> {
  try {
    const buf = await readFile(path.join(process.cwd(), "assets", "samples", "photo-bubble-sample.jpg"));
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return placeholderPhotoDataUrl();
  }
}

/** Simple vertical-gradient placeholder "photo" for the photoBubble sample. */
async function placeholderPhotoDataUrl(): Promise<string> {
  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const r = Math.round(122 + (58 - 122) * t);
    const g = Math.round(150 + (80 - 150) * t);
    const b = Math.round(168 + (110 - 168) * t);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const jpeg = await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 70 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

const SAMPLE_COLOR_BLOCK = {
  hook: { subhead: "STILL JUGGLING 5 APPS?", headline: "Run your whole coaching business in one place", cta: "You can start today!" },
  problem: {
    headline: "The problem",
    items: [
      { title: "Too many tools", body: "Zoom, Stripe, WhatsApp, Sheets…" },
      { title: "Fees add up", body: "Every tool takes a cut." },
      { title: "Members drop off", body: "Friction kills retention." },
    ],
  },
  fix: {
    headline: "The fix",
    items: [
      { title: "One app", body: "Streams, payments, community." },
      { title: "One link", body: "Share it everywhere." },
      { title: "One bill", body: "Predictable pricing." },
    ],
  },
  features: {
    headline: "THE FEATURES",
    items: [{ title: "Livestream classes" }, { title: "Subscriptions" }, { title: "Community chat" }, { title: "Analytics" }],
  },
  cta: { headline: "Ready to simplify?", body: "Start your free trial at buckstreaming.com" },
};

async function renderSample(family: TemplateFamily): Promise<Buffer> {
  if (family === "colorBlock") {
    return renderToPngBuffer(renderColorBlockPage(0, SAMPLE_COLOR_BLOCK));
  }
  if (family === "tweetCard") {
    const icons = await loadIcons();
    return renderToPngBuffer(
      renderTweetCardPage(
        "branded",
        {
          name: TWEET_NAME,
          handle: TWEET_HANDLE,
          timestamp: "2h",
          body: "Coaches: you don't need 5 apps to run your business. You need one that actually does the job.",
          comments: "1.2K",
          reposts: "482",
          likes: "12K",
          bookmarks: "3.4K",
        },
        icons
      )
    );
  }
  if (family === "photoBubble") {
    const photo = await samplePhotoDataUrl();
    return renderToPngBuffer(renderPhotoBubblePage("neutral", { bubbleText: "Your daily choices decide your results" }, photo));
  }
  return renderToPngBuffer(
    renderTextPostPage({
      text: "Most coaches think growing means more tools. It doesn't.\n\nOne app for streams.\nOne link for members.\nOne bill at the end of the month.\n\nSimple scales. Complicated stalls.",
    })
  );
}

const FAMILIES: TemplateFamily[] = ["colorBlock", "tweetCard", "photoBubble", "textPost"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ family: string }> }) {
  const { family } = await params;
  if (!FAMILIES.includes(family as TemplateFamily)) {
    return NextResponse.json({ error: "Unknown template family." }, { status: 404 });
  }

  try {
    let png = cache.get(family);
    if (!png) {
      png = await renderSample(family as TemplateFamily);
      cache.set(family, png);
    }
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render sample.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
