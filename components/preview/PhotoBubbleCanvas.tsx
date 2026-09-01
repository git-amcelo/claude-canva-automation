"use client";

import EditableText from "./EditableText";
import { useDrag } from "./useDrag";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PHOTO_BUBBLE_COLOR } from "@/lib/templates/shared/constants";
import { readableTextOn } from "@/lib/templates/shared/color";
import type { PhotoBubble, PhotoBubbleSlide, Variant, Offset } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

// Keep in step with lib/templates/photoBubble.tsx, which lays the bubbles out
// the same way for the exported PNG.
const FIRST_BUBBLE_TOP = 210;
const BUBBLE_GAP = 190;

/**
 * One editable callout bubble. The background hugs each LINE rather than
 * boxing the whole block: the text is an inline run with
 * box-decoration-break:clone, so every line gets its own rounded fill —
 * matching how the PNG renders each newline-separated line as its own box.
 */
function EditableBubble({
  bubble,
  bubbleIndex,
  slideIndex,
  variant,
  top,
  patch,
  onBubbleClick,
  onRemoveBubble,
  removable,
}: {
  bubble: PhotoBubble;
  bubbleIndex: number;
  slideIndex: number;
  variant: Variant;
  top: number;
  patch: PatchFn;
  onBubbleClick: (e: React.MouseEvent, slideIndex: number, bubbleIndex: number) => void;
  onRemoveBubble: (slideIndex: number, bubbleIndex: number) => void;
  removable: boolean;
}) {
  const colors = PHOTO_BUBBLE_COLOR[variant];
  const fill = bubble.color || colors.bubble;
  const textColor = bubble.color ? readableTextOn(bubble.color) : colors.text;

  const editBubble = (mutate: (b: PhotoBubble) => void) =>
    patch((d) => {
      if (d.family !== "photoBubble") return;
      const next = { ...d.slides[slideIndex].bubbles[bubbleIndex] };
      mutate(next);
      d.slides[slideIndex].bubbles[bubbleIndex] = next;
    });

  const drag = useDrag(bubble.position, (next: Offset) => editBubble((b) => (b.position = next)));

  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 0,
        top,
        width: CANVAS_WIDTH,
        justifyContent: "center",
        padding: "0 70px",
        ...(drag.transform ? { transform: drag.transform } : {}),
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", maxWidth: 900 }}>
        <div
          onPointerDown={drag.onPointerDown}
          onDoubleClick={(e) => onBubbleClick(e, slideIndex, bubbleIndex)}
          title="Drag to move · double-click to recolour"
          style={{ cursor: drag.dragging ? "grabbing" : "grab", touchAction: "none" }}
        >
          <EditableText
            value={bubble.text}
            placeholder="Callout text…"
            onChange={(v) => editBubble((b) => (b.text = v))}
            style={{
              fontFamily: "Inter",
              fontWeight: 800,
              fontSize: 46,
              color: textColor,
              textAlign: "center",
              lineHeight: 1.45,
              // Inline so the fill follows each line's width, not the block's.
              display: "inline",
              background: fill,
              borderRadius: 18,
              padding: "10px 26px",
              boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
              minWidth: 200,
            }}
          />
        </div>
        {removable && (
          <div
            className="bubble-remove"
            aria-hidden="true"
            title="Delete this bubble"
            onClick={() => onRemoveBubble(slideIndex, bubbleIndex)}
          >
            ×
          </div>
        )}
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
  onBubbleClick: (e: React.MouseEvent, slideIndex: number, bubbleIndex: number) => void,
  onAddBubble: (slideIndex: number) => void,
  onRemoveBubble: (slideIndex: number, bubbleIndex: number) => void
) {
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
        // Deliberately a div, not a button: this page also renders inside the
        // thumbnail rail's <button>, and nesting buttons is invalid HTML.
        <div
          onClick={() => onReplacePhoto(index)}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            background: "#d8d3c8",
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
        </div>
      )}

      {slide.bubbles.map((bubble, b) => (
        <EditableBubble
          key={b}
          bubble={bubble}
          bubbleIndex={b}
          slideIndex={index}
          variant={variant}
          top={FIRST_BUBBLE_TOP + b * BUBBLE_GAP}
          patch={patch}
          onBubbleClick={onBubbleClick}
          onRemoveBubble={onRemoveBubble}
          removable={slide.bubbles.length > 1}
        />
      ))}

      {/* div, not button — see the note on the placeholder above. */}
      <div className="bubble-add" aria-hidden="true" onClick={() => onAddBubble(index)} title="Add another bubble to this photo">
        + Add bubble
      </div>
    </div>
  );
}
