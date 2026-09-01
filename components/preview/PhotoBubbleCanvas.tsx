"use client";

// Mirrors lib/templates/photoBubble.tsx. The bubble is draggable and
// recolourable, and clicking the photo replaces it.

import EditableText from "./EditableText";
import { useDrag } from "./useDrag";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PHOTO_BUBBLE_COLOR } from "@/lib/templates/shared/constants";
import { readableTextOn } from "@/lib/templates/shared/color";
import type { PhotoBubbleSlide, Variant, Offset } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

function PhotoBubblePageEditable({
  variant,
  slide,
  photoDataUrl,
  index,
  patch,
  onReplacePhoto,
  onBubbleClick,
}: {
  variant: Variant;
  slide: PhotoBubbleSlide;
  photoDataUrl: string;
  index: number;
  patch: PatchFn;
  onReplacePhoto: (index: number) => void;
  onBubbleClick: (e: React.MouseEvent, index: number) => void;
}) {
  const colors = PHOTO_BUBBLE_COLOR[variant];
  const bubbleFill = slide.bubbleColor || colors.bubble;
  const bubbleTextColor = slide.bubbleColor ? readableTextOn(slide.bubbleColor) : colors.text;

  const drag = useDrag(slide.bubblePosition, (next: Offset) =>
    patch((d) => {
      if (d.family === "photoBubble") d.slides[index] = { ...d.slides[index], bubblePosition: next };
    })
  );

  return (
    <div style={{ display: "flex", position: "relative", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, overflow: "hidden" }}>
      {photoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoDataUrl}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={() => onReplacePhoto(index)}
          style={{ position: "absolute", left: 0, top: 0, objectFit: "cover", cursor: "pointer" }}
          alt=""
          title="Click to replace this photo"
        />
      ) : (
        <button
          onClick={() => onReplacePhoto(index)}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            background: "#d8d3c8",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            cursor: "pointer",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 44,
            color: "#6b6459",
          }}
        >
          <span style={{ fontSize: 140, lineHeight: 1 }}>+</span>
          Click to add a photo
        </button>
      )}

      <div style={{ display: "flex", position: "absolute", left: 0, top: 210, width: CANVAS_WIDTH, justifyContent: "center", padding: "0 70px" }}>
        <div
          onPointerDown={drag.onPointerDown}
          onDoubleClick={(e) => onBubbleClick(e, index)}
          title="Drag to move · double-click to recolour"
          style={{
            display: "flex",
            maxWidth: 900,
            borderRadius: 24,
            background: bubbleFill,
            padding: "26px 48px",
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            cursor: drag.dragging ? "grabbing" : "grab",
            touchAction: "none",
            ...(drag.transform ? { transform: drag.transform } : {}),
          }}
        >
          <EditableText
            value={slide.bubbleText}
            placeholder="Callout text…"
            onChange={(v) =>
              patch((d) => {
                if (d.family === "photoBubble") d.slides[index] = { ...d.slides[index], bubbleText: v };
              })
            }
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 800,
              fontSize: 46,
              color: bubbleTextColor,
              textAlign: "center",
              lineHeight: 1.3,
              justifyContent: "center",
              minWidth: 200,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function renderEditablePhotoBubblePage(
  variant: Variant,
  slide: PhotoBubbleSlide,
  photoDataUrl: string,
  index: number,
  patch: PatchFn,
  onReplacePhoto: (index: number) => void,
  onBubbleClick: (e: React.MouseEvent, index: number) => void
) {
  return (
    <PhotoBubblePageEditable
      variant={variant}
      slide={slide}
      photoDataUrl={photoDataUrl}
      index={index}
      patch={patch}
      onReplacePhoto={onReplacePhoto}
      onBubbleClick={onBubbleClick}
    />
  );
}
