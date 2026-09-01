/**
 * Picks black or white text for a given background so a recoloured bubble or
 * slide stays readable — used by both the server render and the live canvas
 * so the preview and the exported PNG always agree.
 */
export function readableTextOn(background: string): string {
  const rgb = parseColor(background);
  if (!rgb) return "#000000";
  // Relative luminance (sRGB coefficients); 0.55 threshold reads better than
  // the usual 0.5 against the mid-tone brand orange.
  const [r, g, b] = rgb.map((c) => c / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#000000" : "#FFFFFF";
}

/** Parses #rgb / #rrggbb into [r,g,b]; returns null for anything else. */
function parseColor(value: string): [number, number, number] | null {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return null;
}
