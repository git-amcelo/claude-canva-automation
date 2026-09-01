import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { loadFonts } from "./templates/shared/fonts";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./templates/shared/constants";

/**
 * Renders one JSX element tree to a PNG buffer using Satori (via next/og's
 * ImageResponse). Runs on the Node.js runtime — do not move callers to the
 * Edge runtime, which imposes a much smaller bundle-size limit.
 */
export async function renderToPngBuffer(element: ReactElement): Promise<Buffer> {
  const fonts = await loadFonts();

  const response = new ImageResponse(element, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
