"use client";

import { useEffect, useState } from "react";
import ScaledCanvas from "./ScaledCanvas";
import { renderEditablePage, pageCountFor } from "./renderEditablePage";
import type { GenerateCopyResult } from "@/lib/llm";
import type { Variant } from "@/lib/templates/shared/types";

/**
 * The live, click-to-edit slide canvas — a big editable "stage" for the
 * active slide plus a thumbnail rail to jump between slides, like a
 * slide-deck editor. Every text box is clickable and edits `copy` directly
 * and instantly; no separate "render" step is needed to see changes. PNG
 * export (for the ZIP / Canva) happens on demand from the parent.
 */
export default function SlideStage({
  copy,
  onChange,
  variant,
  photoDataUrls,
  onExportOne,
  exportingIndex,
}: {
  copy: GenerateCopyResult;
  onChange: (next: GenerateCopyResult) => void;
  variant: Variant;
  photoDataUrls: string[];
  onExportOne: (index: number) => void;
  exportingIndex: number | null;
}) {
  const count = pageCountFor(copy);
  const [active, setActive] = useState(0);
  const clampedActive = Math.min(active, count - 1);

  // If the slide count shrinks (e.g. a photo was removed) keep the active
  // index in range instead of pointing past the end.
  useEffect(() => {
    if (active > count - 1) setActive(Math.max(0, count - 1));
  }, [active, count]);

  function patch(mutator: (draft: GenerateCopyResult) => void) {
    const next = structuredClone(copy);
    mutator(next);
    onChange(next);
  }

  return (
    <div className="stage">
      <div className="stage-main">
        <ScaledCanvas className="stage-canvas">{renderEditablePage(copy, clampedActive, variant, photoDataUrls, patch)}</ScaledCanvas>
        <div className="stage-main-footer">
          <span className="idx">
            Slide {clampedActive + 1} of {count}
          </span>
          <button className="btn secondary small" onClick={() => onExportOne(clampedActive)} disabled={exportingIndex === clampedActive}>
            {exportingIndex === clampedActive ? (
              <>
                <span className="spinner" /> Exporting…
              </>
            ) : (
              "Export PNG"
            )}
          </button>
        </div>
      </div>

      {count > 1 && (
        <div className="stage-rail">
          {Array.from({ length: count }, (_, i) => (
            <button key={i} className={`stage-thumb${i === clampedActive ? " active" : ""}`} onClick={() => setActive(i)}>
              <ScaledCanvas interactive={false}>{renderEditablePage(copy, i, variant, photoDataUrls, patch)}</ScaledCanvas>
              <span className="idx">{i + 1}</span>
            </button>
          ))}
        </div>
      )}

      <p className="stage-hint">Click any text on the slide to edit it — like PPT. Layout/position tweaks: finish those in Canva.</p>
    </div>
  );
}
