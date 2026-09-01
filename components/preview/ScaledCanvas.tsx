"use client";

import type { ReactNode } from "react";
import { useCanvasScale } from "./useCanvasScale";
import { ScaleContext } from "./ScaleContext";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/templates/shared/constants";

/**
 * Renders a fixed 1080x1350 slide tree at whatever size its container is,
 * via a CSS transform — the content itself never re-flows, so it looks
 * identical (just smaller) in the thumbnail rail vs. the main stage.
 *
 * interactive=false makes the content click-through (used for thumbnails,
 * so clicking one selects it rather than opening a tiny click-to-edit field).
 */
export default function ScaledCanvas({
  children,
  interactive = true,
  className,
}: {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  const { wrapRef, scale } = useCanvasScale(CANVAS_WIDTH);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative", width: "100%", aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`, overflow: "hidden" }}
    >
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: interactive ? "auto" : "none",
        }}
      >
        <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
      </div>
    </div>
  );
}
