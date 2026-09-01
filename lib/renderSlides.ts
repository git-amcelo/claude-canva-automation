import { renderToPngBuffer } from "./render";
import { renderColorBlockPage, COLOR_BLOCK_PAGE_COUNT } from "./templates/colorBlock";
import { renderTweetCardPage } from "./templates/tweetCard";
import { renderPhotoBubblePage } from "./templates/photoBubble";
import { renderTextPostPage } from "./templates/textPost";
import { loadIcons } from "./templates/shared/icons";
import { loadBrandMarks } from "./templates/shared/brand";
import type { RenderSlideInput, Variant } from "./templates/shared/types";
import type { GenerateCopyResult } from "./llm/schemas";

/** Builds the render input for a copy result + variant (+ photos for photoBubble). */
export function buildRenderInput(copy: GenerateCopyResult, variant: Variant, photoDataUrls?: string[]): RenderSlideInput {
  if (copy.family === "colorBlock") return { family: "colorBlock", slides: copy.slides };
  if (copy.family === "tweetCard") return { family: "tweetCard", variant, slides: copy.slides };
  if (copy.family === "textPost") return { family: "textPost", slides: copy.slides };
  return { family: "photoBubble", variant, slides: copy.slides, photoDataUrls: photoDataUrls ?? [] };
}

export interface RenderedSlidePng {
  index: number;
  base64: string;
}

/** Total page count for a given render input. */
export function pageCount(input: RenderSlideInput): number {
  return input.family === "colorBlock" ? COLOR_BLOCK_PAGE_COUNT : input.slides.length;
}

/**
 * Renders the given pages (or all pages) of a carousel to base64 PNGs.
 * Shared by /api/render, /api/generate and /api/edit so the render pipeline
 * lives in exactly one place.
 */
export async function renderSlides(input: RenderSlideInput, pageIndices?: number[]): Promise<RenderedSlidePng[]> {
  const indices = pageIndices ?? Array.from({ length: pageCount(input) }, (_, i) => i);

  if (input.family === "colorBlock") {
    return Promise.all(
      indices.map(async (i) => {
        const buf = await renderToPngBuffer(renderColorBlockPage(i, input.slides));
        return { index: i, base64: buf.toString("base64") };
      })
    );
  }

  if (input.family === "tweetCard") {
    const [icons, marks] = await Promise.all([loadIcons(), loadBrandMarks()]);
    return Promise.all(
      indices.map(async (i) => {
        const buf = await renderToPngBuffer(renderTweetCardPage(input.variant, input.slides[i], icons, marks));
        return { index: i, base64: buf.toString("base64") };
      })
    );
  }

  if (input.family === "textPost") {
    const marks = await loadBrandMarks();
    return Promise.all(
      indices.map(async (i) => {
        const buf = await renderToPngBuffer(renderTextPostPage(input.slides[i], marks));
        return { index: i, base64: buf.toString("base64") };
      })
    );
  }

  // photoBubble: cycle through the uploaded photos, one per slide.
  const photos = input.photoDataUrls;
  return Promise.all(
    indices.map(async (i) => {
      const buf = await renderToPngBuffer(renderPhotoBubblePage(input.variant, input.slides[i], photos[i % photos.length]));
      return { index: i, base64: buf.toString("base64") };
    })
  );
}
