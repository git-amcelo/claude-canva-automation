import { NextResponse } from "next/server";
import { deleteBundle, getBundle, listBundleIds } from "@/lib/share/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Deletes share bundles past their expiry. Wired to a daily cron in
 * vercel.json — these are personal photos on a public-but-unguessable URL, so
 * they shouldn't outlive their usefulness.
 */
export async function GET() {
  try {
    const ids = await listBundleIds();
    const now = Date.now();
    let removed = 0;

    for (const id of ids) {
      const bundle = await getBundle(id);
      // A bundle we can't read is orphaned (a half-finished upload, say), so it
      // goes too.
      if (!bundle || bundle.expiresAt <= now) {
        await deleteBundle(id);
        removed += 1;
      }
    }

    return NextResponse.json({ checked: ids.length, removed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
