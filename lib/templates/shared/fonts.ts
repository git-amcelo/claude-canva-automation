import { readFile } from "node:fs/promises";
import path from "node:path";

export type LoadedFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700 | 800 | 900;
  style: "normal" | "italic";
};

const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");

let cache: LoadedFont[] | null = null;

/**
 * Loads all font files once per server process and caches the buffers —
 * avoids re-reading disk on every render request.
 */
export async function loadFonts(): Promise<LoadedFont[]> {
  if (cache) return cache;

  const [archivoBlack, interRegular, interBold, interExtraBold, interItalic] = await Promise.all([
    readFile(path.join(FONTS_DIR, "ArchivoBlack-Regular.ttf")),
    readFile(path.join(FONTS_DIR, "Inter-Regular.ttf")),
    readFile(path.join(FONTS_DIR, "Inter-Bold.ttf")),
    readFile(path.join(FONTS_DIR, "Inter-ExtraBold.ttf")),
    readFile(path.join(FONTS_DIR, "Inter-Italic.ttf")),
  ]);

  cache = [
    { name: "Archivo Black", data: archivoBlack, weight: 900, style: "normal" },
    { name: "Inter", data: interRegular, weight: 400, style: "normal" },
    { name: "Inter", data: interBold, weight: 700, style: "normal" },
    { name: "Inter", data: interExtraBold, weight: 800, style: "normal" },
    { name: "Inter", data: interItalic, weight: 400, style: "italic" },
  ];
  return cache;
}
