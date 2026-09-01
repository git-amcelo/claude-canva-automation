"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/templates/shared/constants";

/** Aspect presets, plus a free mode that crops to whatever box you drag. */
const RATIOS: { id: string; label: string; value: number | null }[] = [
  { id: "slide", label: "Slide (4:5)", value: CANVAS_WIDTH / CANVAS_HEIGHT },
  { id: "square", label: "Square", value: 1 },
  { id: "portrait", label: "Portrait (9:16)", value: 9 / 16 },
  { id: "landscape", label: "Landscape (16:9)", value: 16 / 9 },
  { id: "free", label: "Free", value: null },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = { kind: "move"; startX: number; startY: number; from: Rect } | { kind: "resize"; corner: string; from: Rect };

/**
 * Crops one photo before it's used on a slide. Works on the displayed image
 * and converts the selection back to natural pixels on confirm, so the export
 * keeps full resolution regardless of how large the dialog happens to be.
 */
export default function PhotoCropper({
  src,
  onCancel,
  onConfirm,
  busy,
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (crop: { x: number; y: number; width: number; height: number }) => void;
  busy?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [ratioId, setRatioId] = useState("slide");
  const [rect, setRect] = useState<Rect | null>(null);
  const dragRef = useRef<DragMode | null>(null);

  const ratio = RATIOS.find((r) => r.id === ratioId)?.value ?? null;

  /** Largest box of the current ratio that fits the displayed image, centred. */
  const fitRect = useCallback((): Rect | null => {
    const img = imgRef.current;
    if (!img) return null;
    const W = img.clientWidth;
    const H = img.clientHeight;
    if (!W || !H) return null;
    if (ratio === null) return { x: W * 0.05, y: H * 0.05, w: W * 0.9, h: H * 0.9 };
    let w = W;
    let h = w / ratio;
    if (h > H) {
      h = H;
      w = h * ratio;
    }
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }, [ratio]);

  useEffect(() => {
    const next = fitRect();
    if (next) setRect(next);
  }, [fitRect]);

  function clamp(r: Rect): Rect {
    const img = imgRef.current;
    if (!img) return r;
    const W = img.clientWidth;
    const H = img.clientHeight;
    const w = Math.min(r.w, W);
    const h = Math.min(r.h, H);
    return { w, h, x: Math.max(0, Math.min(r.x, W - w)), y: Math.max(0, Math.min(r.y, H - h)) };
  }

  function beginMove(e: React.PointerEvent) {
    if (!rect) return;
    e.preventDefault();
    dragRef.current = { kind: "move", startX: e.clientX, startY: e.clientY, from: rect };
    trackPointer(e.clientX, e.clientY);
  }

  function beginResize(e: React.PointerEvent, corner: string) {
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { kind: "resize", corner, from: rect };
    trackPointer(e.clientX, e.clientY);
  }

  function trackPointer(startX: number, startY: number) {
    const move = (ev: PointerEvent) => {
      const drag = dragRef.current;
      const img = imgRef.current;
      if (!drag || !img) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (drag.kind === "move") {
        setRect(clamp({ ...drag.from, x: drag.from.x + dx, y: drag.from.y + dy }));
        return;
      }

      const f = drag.from;
      let { x, y, w, h } = f;
      const right = drag.corner.includes("e");
      const bottom = drag.corner.includes("s");
      w = right ? f.w + dx : f.w - dx;
      h = bottom ? f.h + dy : f.h - dy;
      if (!right) x = f.x + dx;
      if (!bottom) y = f.y + dy;

      if (ratio !== null) {
        // Height follows width so the box keeps its aspect.
        h = w / ratio;
        if (!bottom) y = f.y + (f.h - h);
      }
      if (w < 40 || h < 40) return;
      setRect(clamp({ x, y, w, h }));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function confirm() {
    const img = imgRef.current;
    if (!img || !rect) return;
    // Displayed pixels -> natural pixels, so the crop keeps full resolution.
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    onConfirm({
      x: Math.round(rect.x * scaleX),
      y: Math.round(rect.y * scaleY),
      width: Math.round(rect.w * scaleX),
      height: Math.round(rect.h * scaleY),
    });
  }

  return (
    <div className="cropper-backdrop" role="dialog" aria-label="Crop photo">
      <div className="cropper">
        <div className="cropper-head">
          <strong>Crop this photo</strong>
          <span className="hint">Drag the box to move it, the corners to resize.</span>
        </div>

        <div className="cropper-ratios">
          {RATIOS.map((r) => (
            <button key={r.id} className={`chip-btn${ratioId === r.id ? " active" : ""}`} onClick={() => setRatioId(r.id)}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="cropper-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt="" onLoad={() => setRect(fitRect())} draggable={false} />
          {rect && (
            <div className="cropper-box" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} onPointerDown={beginMove}>
              {["nw", "ne", "sw", "se"].map((corner) => (
                <span key={corner} className={`cropper-handle ${corner}`} onPointerDown={(e) => beginResize(e, corner)} />
              ))}
            </div>
          )}
        </div>

        <div className="cropper-actions">
          <button className="btn secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn secondary" onClick={() => setRect(fitRect())} disabled={busy}>
            Reset
          </button>
          <button className="btn" onClick={confirm} disabled={busy || !rect}>
            {busy ? (
              <>
                <span className="spinner" /> Cropping…
              </>
            ) : (
              "Use this crop"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
