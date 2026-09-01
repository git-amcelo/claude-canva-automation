"use client";

// Mirrors lib/templates/photoBubble.tsx. Only the bubble text is editable —
// the photo itself and its position are set during upload, not here.

import EditableText from "./EditableText";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PHOTO_BUBBLE_COLOR } from "@/lib/templates/shared/constants";
import type { PhotoBubbleSlide, Variant } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

export function renderEditablePhotoBubblePage(variant: Variant, slide: PhotoBubbleSlide, photoDataUrl: string, index: number, patch: PatchFn) {
  const colors = PHOTO_BUBBLE_COLOR[variant];

  return (
    <div style={{ display: "flex", position: "relative", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, overflow: "hidden" }}>
      {photoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoDataUrl} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ position: "absolute", left: 0, top: 0, objectFit: "cover" }} alt="" />
      ) : (
        <div style={{ position: "absolute", left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: "#d8d3c8" }} />
      )}

      <div style={{ display: "flex", position: "absolute", left: 0, top: 210, width: CANVAS_WIDTH, justifyContent: "center", padding: "0 70px" }}>
        <div style={{ display: "flex", maxWidth: 900, borderRadius: 24, background: colors.bubble, padding: "26px 48px", boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }}>
          <EditableText
            value={slide.bubbleText}
            placeholder="Callout text…"
            onChange={(v) => patch((d) => { if (d.family === "photoBubble") d.slides[index] = { ...d.slides[index], bubbleText: v }; })}
            style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 46, color: colors.text, textAlign: "center", lineHeight: 1.3, justifyContent: "center", minWidth: 200 }}
          />
        </div>
      </div>
    </div>
  );
}
