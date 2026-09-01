"use client";

import { useCallback, useRef, useState } from "react";
import { useScale } from "./ScaleContext";
import type { Offset } from "@/lib/templates/shared/types";

/** Screen-pixel movement before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

const ORIGIN: Offset = { x: 0, y: 0 };

/**
 * Drag-to-reposition for a canvas element. Pointer events, so mouse, touch
 * and pen all work the same way.
 *
 * The click/drag ambiguity matters here: these elements are also editable
 * text, so a press must be able to mean either "put my cursor here" or "move
 * this". We disambiguate by movement — under the threshold we never call
 * preventDefault, so the browser's own click-to-place-caret behaviour runs
 * untouched; past it we take over and suppress text selection for the rest
 * of the gesture.
 *
 * Movement is divided by the canvas scale so the element tracks the pointer
 * 1:1 no matter how zoomed-out the canvas is being displayed.
 */
export function useDrag(position: Offset | undefined, onChange: (next: Offset) => void) {
  const scale = useScale();
  const gesture = useRef<{ startX: number; startY: number; from: Offset; dragging: boolean } | null>(null);
  const [live, setLive] = useState<Offset | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Primary button / single touch only — right-click and multi-touch
      // gestures (pinch-zoom) are left to the browser.
      if (e.button !== 0 || !e.isPrimary) return;
      const from = position ?? ORIGIN;
      const pointerId = e.pointerId;
      gesture.current = { startX: e.clientX, startY: e.clientY, from, dragging: false };

      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
      };

      function move(ev: PointerEvent) {
        if (ev.pointerId !== pointerId) return;
        const g = gesture.current;
        if (!g) return;
        const dx = ev.clientX - g.startX;
        const dy = ev.clientY - g.startY;
        if (!g.dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          g.dragging = true;
          setDragging(true);
        }
        ev.preventDefault(); // stop the press turning into a text selection
        setLive({ x: Math.round(g.from.x + dx / scale), y: Math.round(g.from.y + dy / scale) });
      }

      function up(ev: PointerEvent) {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        const g = gesture.current;
        gesture.current = null;
        if (!g?.dragging) return; // a plain click/tap — leave it to the text editor
        const dx = ev.clientX - g.startX;
        const dy = ev.clientY - g.startY;
        onChange({ x: Math.round(g.from.x + dx / scale), y: Math.round(g.from.y + dy / scale) });
        setLive(null);
        setDragging(false);
      }

      // A cancelled gesture (browser took over, e.g. a system gesture) should
      // put the element back rather than leave it half-dragged.
      function cancel(ev: PointerEvent) {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        gesture.current = null;
        setLive(null);
        setDragging(false);
      }

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
    },
    [position, scale, onChange]
  );

  const current = live ?? position ?? ORIGIN;
  const moved = current.x !== 0 || current.y !== 0;

  return {
    /** Apply this to the element's style. */
    transform: moved ? `translate(${current.x}px, ${current.y}px)` : undefined,
    onPointerDown,
    dragging,
  };
}
