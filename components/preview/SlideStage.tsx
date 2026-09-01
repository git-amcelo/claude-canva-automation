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
  | { kind: "bubble"; index: number; bubbleIndex: number; x: number; y: number };

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
  onDeleteSlide,
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
  onDeleteSlide: (index: number) => void;
}) {
  const count = pageCountFor(copy);
  const [active, setActive] = useState(0);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const clampedActive = Math.min(active, Math.max(0, count - 1));
  const isPhotoBubble = copy.family === "photoBubble";
  // Color-block is a fixed 5-slide story, so its slides can't be removed;
  // photo+bubble is the family you build up (and tear down) slide by slide.
  const canDeleteSlides = isPhotoBubble;

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

  function setBubbleColor(index: number, bubbleIndex: number, color: string | undefined) {
    patch((d) => {
      if (d.family !== "photoBubble") return;
      d.slides[index].bubbles[bubbleIndex] = { ...d.slides[index].bubbles[bubbleIndex], color };
    });
  }

  function addBubble(slideIndex: number) {
    patch((d) => {
      if (d.family !== "photoBubble") return;
      d.slides[slideIndex].bubbles.push({ text: "" });
    });
  }

  function removeBubble(slideIndex: number, bubbleIndex: number) {
    patch((d) => {
      if (d.family !== "photoBubble") return;
      // Never drop to zero — a photo with no bubble has nothing to edit.
      if (d.slides[slideIndex].bubbles.length <= 1) return;
      d.slides[slideIndex].bubbles.splice(bubbleIndex, 1);
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
      return (copy.slides[clampedActive]?.bubbles ?? []).some(
        (b) => !!b.position && (b.position.x !== 0 || b.position.y !== 0)
      );
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
        d.slides[clampedActive].bubbles = d.slides[clampedActive].bubbles.map(({ position: _dropped, ...rest }) => rest);
      }
    });
  }

  /**
   * Keeps the floating picker fully on screen. It opens at the point that was
   * tapped, which on a narrow phone can be close enough to an edge that the
   * panel would hang off it.
   */
  function pickerPoint(e: React.MouseEvent) {
    const PANEL_W = 210;
    const PANEL_H = 240;
    const margin = 8;
    return {
      x: Math.min(Math.max(e.clientX, margin), Math.max(margin, window.innerWidth - PANEL_W - margin)),
      y: Math.min(Math.max(e.clientY, margin), Math.max(margin, window.innerHeight - PANEL_H - margin)),
    };
  }

  const interactions = {
    patch,
    onBackgroundClick: (e: React.MouseEvent, pageIndex: number) =>
      setPicker({ kind: "background", index: pageIndex, ...pickerPoint(e) }),
    onReplacePhoto,
    onBubbleClick: (e: React.MouseEvent, index: number, bubbleIndex: number) =>
      setPicker({ kind: "bubble", index, bubbleIndex, ...pickerPoint(e) }),
    onAddBubble: addBubble,
    onRemoveBubble: removeBubble,
  };

  const currentPickerColor =
    picker?.kind === "background"
      ? copy.family === "colorBlock"
        ? copy.slides.backgrounds?.[picker.index]
        : undefined
      : picker?.kind === "bubble" && copy.family === "photoBubble"
        ? copy.slides[picker.index]?.bubbles[picker.bubbleIndex]?.color
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
          // The remove button is a sibling of the thumb, not a child: the
          // thumb is itself a <button>, and nesting one inside it is invalid
          // HTML (React reports it as a hydration error).
          <div className="stage-thumb-wrap" key={i}>
          <button
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
          {canDeleteSlides && (
            <button
              type="button"
              className="stage-thumb-remove"
              aria-label={`Delete slide ${i + 1}`}
              title="Delete this slide"
              onClick={() => onDeleteSlide(i)}
            >
              ×
            </button>
          )}
          </div>
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
            onChange={(color) =>
              picker.kind === "background" ? setBackgroundColor(picker.index, color) : setBubbleColor(picker.index, picker.bubbleIndex, color)
            }
            onReset={() => {
              if (picker.kind === "background") setBackgroundColor(picker.index, undefined);
              else setBubbleColor(picker.index, picker.bubbleIndex, undefined);
              setPicker(null);
            }}
            onClose={() => setPicker(null)}
          />
        </div>
      )}
    </div>
  );
}
