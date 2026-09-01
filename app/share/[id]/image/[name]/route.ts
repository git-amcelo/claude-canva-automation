import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isBlobBacked } from "@/lib/share/store";

export const runtime = "nodejs";

/**
 * Serves share images in local development, where they're written to .share/
 * instead of Blob (Vercel's filesystem is read-only, so production never uses
 * this path — the bundle holds absolute Blob URLs there).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  if (isBlobBacked()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { id, name } = await params;
  // Both segments are used to build a path, so anything that could climb out
  // of .share/ is rejected outright.
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !/^slide-\d+\.jpg$/.test(name)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const file = await readFile(path.join(process.cwd(), ".share", id, name));
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
