"use client";

import { renderEditableColorBlockPage } from "./ColorBlockCanvas";
import { renderEditableTweetCardPage } from "./TweetCardCanvas";
import { renderEditablePhotoBubblePage } from "./PhotoBubbleCanvas";
import { renderEditableTextPostPage } from "./TextPostCanvas";
import type { GenerateCopyResult } from "@/lib/llm";
import type { Variant } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

/** Total slide count for a given copy result — colorBlock is always 5 fixed pages. */
export function pageCountFor(copy: GenerateCopyResult): number {
  return copy.family === "colorBlock" ? 5 : copy.slides.length;
}

/** Dispatches to the right editable-canvas renderer for the copy's family. */
export function renderEditablePage(copy: GenerateCopyResult, index: number, variant: Variant, photoDataUrls: string[], patch: PatchFn) {
  if (copy.family === "colorBlock") return renderEditableColorBlockPage(index, copy.slides, patch);
  if (copy.family === "tweetCard") return renderEditableTweetCardPage(variant, copy.slides[index], index, patch);
  if (copy.family === "textPost") return renderEditableTextPostPage(copy.slides[index], index, patch);
  const photo = photoDataUrls.length > 0 ? photoDataUrls[index % photoDataUrls.length] : "";
  return renderEditablePhotoBubblePage(variant, copy.slides[index], photo, index, patch);
}
