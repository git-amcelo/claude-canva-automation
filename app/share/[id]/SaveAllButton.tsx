"use client";

import { useState } from "react";

/**
 * Hands every slide to the OS share sheet in one go, so they can be saved to
 * Photos or sent straight into Instagram. Uses the Web Share API's file
 * support, which iOS Safari and Android Chrome both provide; where it's
 * missing (most desktop browsers) the button falls back to downloading each
 * slide, and the page's press-and-hold hint covers the rest.
 */
export default function SaveAllButton({ images }: { images: string[] }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function saveAll() {
    setBusy(true);
    setNote(null);
    try {
      const files = await Promise.all(
        images.map(async (src, i) => {
          const res = await fetch(src);
          const blob = await res.blob();
          return new File([blob], `slide-${i + 1}.jpg`, { type: blob.type || "image/jpeg" });
        })
      );

      if (navigator.canShare?.({ files })) {
        await navigator.share({ files });
        return;
      }

      for (const [i, file] of files.entries()) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = `slide-${i + 1}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setNote("Saved to your downloads.");
    } catch (err) {
      // A cancelled share sheet throws AbortError; that's not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setNote("Couldn't save automatically — press and hold each slide instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-actions">
      <button className="share-btn" onClick={saveAll} disabled={busy}>
        {busy ? "Preparing…" : `Save all ${images.length} slides`}
      </button>
      {note && <span className="share-note">{note}</span>}
    </div>
  );
}
