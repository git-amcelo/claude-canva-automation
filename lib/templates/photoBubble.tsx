import { CANVAS_WIDTH, CANVAS_HEIGHT, PHOTO_BUBBLE_COLOR } from "./shared/constants";
import { readableTextOn } from "./shared/color";
import type { PhotoBubbleSlide, Variant } from "./shared/types";

/**
 * IG-story-style callout pill over a full-bleed photo, matching the reference
 * posts: compact rounded pill, bold text, centered near the top of the frame.
 * Each slide can use a different photo — the caller picks which photo to pass.
 */
export function renderPhotoBubblePage(variant: Variant, slide: PhotoBubbleSlide, photoDataUrl: string) {
  const colors = PHOTO_BUBBLE_COLOR[variant];
  const bubbleFill = slide.bubbleColor || colors.bubble;
  // A custom fill needs its own contrast check; the variant defaults already pair correctly.
  const bubbleTextColor = slide.bubbleColor ? readableTextOn(slide.bubbleColor) : colors.text;
  const offset = slide.bubblePosition;
  const dragTransform = offset && (offset.x !== 0 || offset.y !== 0) ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : {};

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

      {/* centered pill row near the top of the frame */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 210,
          width: CANVAS_WIDTH,
          justifyContent: "center",
          padding: "0 70px",
        }}
      >
        <div
          style={{
            display: "flex",
            maxWidth: 900,
            borderRadius: 24,
            background: bubbleFill,
            padding: "26px 48px",
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            ...dragTransform,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 800,
              fontSize: 46,
              color: bubbleTextColor,
              textAlign: "center",
              lineHeight: 1.3,
              justifyContent: "center",
            }}
          >
            {slide.bubbleText}
          </div>
        </div>
      </div>
    </div>
  );
}
