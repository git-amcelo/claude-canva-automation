"use client";

import { useEffect, useRef } from "react";
import { BRAND } from "@/lib/templates/shared/constants";

/** Brand palette first, then the neutrals that actually read well on Instagram. */
const SWATCHES: { color: string; label: string }[] = [
  { color: BRAND.orange, label: "Brand orange" },
  { color: BRAND.orangeLight, label: "Light orange" },
  { color: BRAND.black, label: "Black" },
  { color: BRAND.olive, label: "Olive" },
  { color: BRAND.cream, label: "Cream" },
  { color: BRAND.white, label: "White" },
  { color: "#1B75C4", label: "Blue" },
  { color: "#6EC6F1", label: "Light blue" },
];

/**
 * Small floating palette. Sits above the canvas (not scaled with it) so the
 * swatches stay a comfortable size no matter how zoomed-out the slide is.
 */
export default function ColorPicker({
  value,
  onChange,
  onClose,
  onReset,
  title = "Background",
}: {
  value?: string;
  onChange: (color: string) => void;
  onClose: () => void;
  /** Clears the override, going back to the template default. */
  onReset?: () => void;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Click-away / Escape to dismiss.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Deferred so the click that opened it doesn't immediately close it.
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onPointerDown);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="color-picker" ref={ref} role="dialog" aria-label={title}>
      <div className="color-picker-title">{title}</div>
      <div className="color-picker-swatches">
        {SWATCHES.map((s) => (
          <button
            key={s.color}
            className={`color-swatch${value?.toLowerCase() === s.color.toLowerCase() ? " active" : ""}`}
            style={{ background: s.color }}
            title={s.label}
            aria-label={s.label}
            onClick={() => onChange(s.color)}
          />
        ))}
      </div>
      <div className="color-picker-footer">
        <label className="color-custom">
          Custom
          <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} />
        </label>
        {onReset && (
          <button className="btn secondary small" onClick={onReset}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
