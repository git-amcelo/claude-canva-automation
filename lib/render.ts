import { ImageResponse } from "next/og";
import { createElement, type ReactElement } from "react";
import { loadFonts } from "./templates/shared/fonts";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./templates/shared/constants";

/**
 * Renders one JSX element tree to a PNG buffer using Satori (via next/og's
 * ImageResponse). Runs on the Node.js runtime — do not move callers to the
 * Edge runtime, which imposes a much smaller bundle-size limit.
 *
 * The wrapper sets two inherited text properties for the whole tree:
 *  - `wordBreak`, because text boxes are flex containers (Satori requires it)
 *    and a flex item won't shrink below its content's intrinsic width, so an
 *    unbroken string — a pasted URL, or someone mashing the keyboard — would
 *    otherwise run straight off the canvas.
 *  - `whiteSpace: pre-wrap`, so newlines the user typed render as line breaks
 *    here exactly as they do in the live canvas, instead of collapsing.
 */
export async function renderToPngBuffer(element: ReactElement): Promise<Buffer> {
  const fonts = await loadFonts();

  const wrapped = createElement(
    "div",
    {
      style: {
        display: "flex",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
      },
    },
    element
  );

  const response = new ImageResponse(wrapped, {
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
