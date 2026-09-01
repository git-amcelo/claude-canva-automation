"use client";

import { useEffect, useState } from "react";
import ScaledCanvas from "./ScaledCanvas";
import ColorPicker from "./ColorPicker";
import { renderEditablePage, pageCountFor } from "./renderEditablePage";
import type { GenerateCopyResult } from "@/lib/llm";
import type { Variant } from "@/lib/templates/shared/types";

/** Which element the colour picker is currently editing, and where to float it. */
type PickerTarget =
  | { kind: "background"; index: number; x: number; y: number }
  | { kind: "bubble"; index: number; x: number; y: number };

/** Position keys are prefixed by section, in page order. */
const COLOR_BLOCK_SECTIONS = ["hook", "problem", "fix", "features", "cta"] as const;

/**
 * The live, click-to-edit slide canvas — a big editable "stage" for the
 * active slide plus a thumbnail rail to move between slides, like a
 * slide-deck editor.
 *
 * Everything is edited in place: click text to rewrite it, drag it to
 * reposition, click a slide background (color-block) or double-click a
 * bubble (photo+bubble) to recolour, click a photo to replace it, and use
 * the + tile to add a slide. Every change lands in `copy` immediately; PNG
 * export happens on demand from the parent.
 */
export default function SlideStage({
  copy,
  onChange,
  variant,
  photoDataUrls,
  onExportOne,
  exportingIndex,
  onAddPhoto,
  onReplacePhoto,
  onReorderSlides,
}: {
  copy: GenerateCopyResult;
  onChange: (next: GenerateCopyResult) => void;
  variant: Variant;
  photoDataUrls: string[];
  onExportOne: (index: number) => void;
  exportingIndex: number | null;
  onAddPhoto: () => void;
  onReplacePhoto: (index: number) => void;
  onReorderSlides: (from: number, to: number) => void;
}) {
  const count = pageCountFor(copy);
  const [active, setActive] = useState(0);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const clampedActive = Math.min(active, Math.max(0, count - 1));
  const isPhotoBubble = copy.family === "photoBubble";

  // If the slide count shrinks (a photo was removed) keep the active index in range.
  useEffect(() => {
    if (active > count - 1) setActive(Math.max(0, count - 1));
  }, [active, count]);

  function patch(mutator: (draft: GenerateCopyResult) => void) {
    const next = structuredClone(copy);
    mutator(next);
    onChange(next);
  }

  function setBackgroundColor(pageIndex: number, color: string | undefined) {
    patch((d) => {
      if (d.family !== "colorBlock") return;
      const backgrounds = [...(d.slides.backgrounds ?? [])];
      backgrounds[pageIndex] = color;
      d.slides.backgrounds = backgrounds;
    });
  }

  function setBubbleColor(index: number, color: string | undefined) {
    patch((d) => {
      if (d.family !== "photoBubble") return;
      d.slides[index] = { ...d.slides[index], bubbleColor: color };
    });
  }

  /** Has anything on this slide been dragged out of its template position? */
  const slideHasMovedElements = (() => {
    if (copy.family === "colorBlock") {
      const prefix = COLOR_BLOCK_SECTIONS[clampedActive];
      return Object.entries(copy.slides.positions ?? {}).some(
        ([key, offset]) => key.startsWith(`${prefix}.`) && (offset.x !== 0 || offset.y !== 0)
      );
    }
    if (copy.family === "photoBubble") {
      const offset = copy.slides[clampedActive]?.bubblePosition;
      return !!offset && (offset.x !== 0 || offset.y !== 0);
    }
    return false;
  })();

  /** Puts this slide's elements back where the template had them. */
  function resetLayout() {
    patch((d) => {
      if (d.family === "colorBlock") {
        const prefix = COLOR_BLOCK_SECTIONS[clampedActive];
        const kept = Object.fromEntries(Object.entries(d.slides.positions ?? {}).filter(([key]) => !key.startsWith(`${prefix}.`)));
        d.slides.positions = Object.keys(kept).length > 0 ? kept : undefined;
      } else if (d.family === "photoBubble") {
        const { bubblePosition: _dropped, ...rest } = d.slides[clampedActive];
        d.slides[clampedActive] = rest;
      }
    });
  }

  const interactions = {
    patch,
    onBackgroundClick: (e: React.MouseEvent, pageIndex: number) =>
      setPicker({ kind: "background", index: pageIndex, x: e.clientX, y: e.clientY }),
    onReplacePhoto,
    onBubbleClick: (e: React.MouseEvent, index: number) => setPicker({ kind: "bubble", index, x: e.clientX, y: e.clientY }),
  };

  const currentPickerColor =
    picker?.kind === "background"
      ? copy.family === "colorBlock"
        ? copy.slides.backgrounds?.[picker.index]
        : undefined
      : picker?.kind === "bubble" && copy.family === "photoBubble"
        ? copy.slides[picker.index]?.bubbleColor
        : undefined;

  return (
    <div className="stage">
      <div className="stage-main">
        <ScaledCanvas className="stage-canvas">{renderEditablePage(copy, clampedActive, variant, photoDataUrls, interactions)}</ScaledCanvas>
        <div className="stage-main-footer">
          <span className="idx">
            Slide {clampedActive + 1} of {count}
          </span>
          {slideHasMovedElements && (
            <button className="btn secondary small" onClick={resetLayout} title="Put this slide's elements back where the template had them">
              Reset layout
            </button>
          )}
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

      <div className="stage-rail">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            className={`stage-thumb${i === clampedActive ? " active" : ""}${dragIndex === i ? " dragging" : ""}${
              overIndex === i && dragIndex !== null && dragIndex !== i ? " drop-target" : ""
            }`}
            onClick={() => setActive(i)}
            draggable={isPhotoBubble}
            onDragStart={(e) => {
              if (!isPhotoBubble) return;
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              if (!isPhotoBubble) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overIndex !== i) setOverIndex(i);
            }}
            onDragLeave={() => {
              if (overIndex === i) setOverIndex(null);
            }}
            onDrop={(e) => {
              if (!isPhotoBubble) return;
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) onReorderSlides(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
          >
            <ScaledCanvas interactive={false}>{renderEditablePage(copy, i, variant, photoDataUrls, interactions)}</ScaledCanvas>
            <span className="idx">{i + 1}</span>
          </button>
        ))}

        {isPhotoBubble && count < 10 && (
          <button className="stage-thumb add-tile" onClick={onAddPhoto} title="Add a photo as a new slide">
            <span className="plus">+</span>
            <span className="add-label">Add photo</span>
          </button>
        )}
      </div>

      <p className="stage-hint">
        Click any text to edit it, drag it to move it.
        {copy.family === "colorBlock" && " Click the slide background to change its colour."}
        {isPhotoBubble && " Click the photo to replace it, double-click the bubble to recolour it, and drag thumbnails to reorder."}
      </p>

      {picker && (
        <div className="color-picker-anchor" style={{ left: picker.x, top: picker.y }}>
          <ColorPicker
            title={picker.kind === "background" ? "Slide background" : "Bubble colour"}
            value={currentPickerColor}
            onChange={(color) => (picker.kind === "background" ? setBackgroundColor(picker.index, color) : setBubbleColor(picker.index, color))}
            onReset={() => {
              if (picker.kind === "background") setBackgroundColor(picker.index, undefined);
              else setBubbleColor(picker.index, undefined);
              setPicker(null);
            }}
            onClose={() => setPicker(null)}
          />
        </div>
      )}
    </div>
  );
}
