"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Observes a wrapper element's rendered width and returns the scale factor
 * needed to fit a fixed-size design (e.g. the 1080px-wide slide canvas) into
 * it — lets us render the exact same layout at any tile size via CSS
 * transform instead of maintaining separate small/large layouts.
 */
export function useCanvasScale(designWidth: number) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(width / designWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);

  return { wrapRef, scale };
}
