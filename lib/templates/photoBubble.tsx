import { CANVAS_WIDTH, CANVAS_HEIGHT, PHOTO_BUBBLE_COLOR } from "./shared/constants";
import { readableTextOn } from "./shared/color";
import type { PhotoBubble, PhotoBubbleSlide, Variant } from "./shared/types";

/** Vertical spot each bubble starts from before any drag offset, in canvas px. */
const FIRST_BUBBLE_TOP = 210;
const BUBBLE_GAP = 190;

/**
 * IG-story-style callout pills over a full-bleed photo. A slide can hold
 * several bubbles, each independently placed.
 *
 * Each LINE gets its own rounded background rather than one box around the
 * whole block — the look in the reference posts, where the highlight hugs
 * every line's width. Lines are split on the newlines the user typed, so
 * the export matches what they arranged on the canvas.
 */
function Bubble({ bubble, variant, top }: { bubble: PhotoBubble; variant: Variant; top: number }) {
  const colors = PHOTO_BUBBLE_COLOR[variant];
  const fill = bubble.color || colors.bubble;
  const textColor = bubble.color ? readableTextOn(bubble.color) : colors.text;
  const offset = bubble.position;
  const shift = offset && (offset.x !== 0 || offset.y !== 0) ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : {};
  const lines = bubble.text.split("\n");

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
        ...shift,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 900 }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              borderRadius: 18,
              background: fill,
              padding: "14px 30px",
              marginBottom: i === lines.length - 1 ? 0 : 6,
              fontFamily: "Inter",
              fontWeight: 800,
              fontSize: 46,
              color: textColor,
              lineHeight: 1.25,
              boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export function renderPhotoBubblePage(variant: Variant, slide: PhotoBubbleSlide, photoDataUrl: string) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoDataUrl}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ position: "absolute", left: 0, top: 0, objectFit: "cover" }}
      />

      {slide.bubbles.map((bubble, i) => (
        <Bubble key={i} bubble={bubble} variant={variant} top={FIRST_BUBBLE_TOP + i * BUBBLE_GAP} />
      ))}
    </div>
  );
}
