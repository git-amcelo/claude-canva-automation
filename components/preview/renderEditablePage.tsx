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

export interface PageInteractions {
  patch: PatchFn;
  /** colorBlock: pressing the slide background (opens the colour picker). */
  onBackgroundClick: (e: React.MouseEvent, pageIndex: number) => void;
  /** photoBubble: swap the photo behind this slide. */
  onReplacePhoto: (index: number) => void;
  /** photoBubble: recolour this slide's bubble. */
  onBubbleClick: (e: React.MouseEvent, index: number) => void;
}

/** Dispatches to the right editable-canvas renderer for the copy's family. */
export function renderEditablePage(
  copy: GenerateCopyResult,
  index: number,
  variant: Variant,
  photoDataUrls: string[],
  interactions: PageInteractions
) {
  const { patch } = interactions;

  if (copy.family === "colorBlock") {
    return renderEditableColorBlockPage(index, copy.slides, patch, (e) => interactions.onBackgroundClick(e, index));
  }
  if (copy.family === "tweetCard") return renderEditableTweetCardPage(variant, copy.slides[index], index, patch);
  if (copy.family === "textPost") return renderEditableTextPostPage(copy.slides[index], index, patch);

  const photo = photoDataUrls.length > 0 ? photoDataUrls[index % photoDataUrls.length] : "";
  return renderEditablePhotoBubblePage(
    variant,
    copy.slides[index],
    photo,
    index,
    patch,
    interactions.onReplacePhoto,
    interactions.onBubbleClick
  );
}
