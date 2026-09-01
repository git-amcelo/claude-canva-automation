import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import type { ShareBundle } from "./types";

/**
 * Storage for share bundles.
 *
 * Two backends, picked by whether a Blob token is configured:
 *  - Vercel Blob in production, because Vercel's filesystem is read-only.
 *  - The local filesystem in development, so the whole flow can be built and
 *    tested without provisioning a Blob store first.
 *
 * Both expose the same four operations, so nothing above this file cares which
 * one is in play.
 */
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), ".share");

/** Unguessable id — these links are the only thing protecting the photos. */
export function newShareId(): string {
  return randomBytes(12).toString("base64url");
}

export function isBlobBacked(): boolean {
  return useBlob;
}

/** Stores one slide image, returning the URL the share page should load. */
export async function putImage(shareId: string, index: number, jpeg: Buffer): Promise<string> {
  const name = `slide-${index + 1}.jpg`;
  if (useBlob) {
    const { url } = await put(`share/${shareId}/${name}`, jpeg, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });
    return url;
  }
  await mkdir(path.join(LOCAL_DIR, shareId), { recursive: true });
  await writeFile(path.join(LOCAL_DIR, shareId, name), jpeg);
  // Served back through the app in dev — see app/share/[id]/image/[name]/route.ts.
  return `/share/${shareId}/image/${name}`;
}

export async function putBundle(bundle: ShareBundle): Promise<void> {
  const json = JSON.stringify(bundle, null, 2);
  if (useBlob) {
    await put(`share/${bundle.id}/bundle.json`, json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      // The page reads this on every visit; caching a stale copy would be worse
      // than the extra fetch.
      cacheControlMaxAge: 0,
    });
    return;
  }
  await mkdir(path.join(LOCAL_DIR, bundle.id), { recursive: true });
  await writeFile(path.join(LOCAL_DIR, bundle.id, "bundle.json"), json);
}

export async function getBundle(shareId: string): Promise<ShareBundle | null> {
  try {
    if (useBlob) {
      const { blobs } = await list({ prefix: `share/${shareId}/bundle.json`, limit: 1 });
      if (blobs.length === 0) return null;
      const res = await fetch(blobs[0].url, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as ShareBundle;
    }
    const raw = await readFile(path.join(LOCAL_DIR, shareId, "bundle.json"), "utf-8");
    return JSON.parse(raw) as ShareBundle;
  } catch {
    return null;
  }
}

export async function deleteBundle(shareId: string): Promise<void> {
  if (useBlob) {
    const { blobs } = await list({ prefix: `share/${shareId}/` });
    if (blobs.length > 0) await del(blobs.map((b) => b.url));
    return;
  }
  await rm(path.join(LOCAL_DIR, shareId), { recursive: true, force: true });
}

/** Every bundle currently stored — used by the cleanup route to find expired ones. */
export async function listBundleIds(): Promise<string[]> {
  if (useBlob) {
    const { blobs } = await list({ prefix: "share/" });
    const ids = new Set<string>();
    for (const b of blobs) {
      const id = b.pathname.split("/")[1];
      if (id) ids.add(id);
    }
    return [...ids];
  }
  try {
    return await readdir(LOCAL_DIR);
  } catch {
    return []; // nothing shared yet
  }
}
