"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent } from "react";
import { useDrag } from "./useDrag";
import type { Offset } from "@/lib/templates/shared/types";

const noop = () => {};

/**
 * A text block that's editable in place by clicking on it — like PowerPoint —
 * and optionally draggable to reposition. Renders with the exact same styling
 * the final PNG uses, so what you see is what you export.
 *
 * Content is managed imperatively via the DOM (not React children) — that's
 * the standard fix for contentEditable + React: if we re-rendered `{value}`
 * as children on every keystroke, React would reset the caret to the start.
 */
export default function EditableText({
  value,
  onChange,
  style,
  multiline = true,
  placeholder,
  position,
  onPositionChange,
}: {
  value: string;
  onChange: (next: string) => void;
  style?: CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  /** Pass both of these to make this text draggable; omit for fixed-position text. */
  position?: Offset;
  onPositionChange?: (next: Offset) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastCommitted = useRef<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Hooks can't be called conditionally, so the drag hook always runs — we
  // just don't attach its handler unless this element is meant to be movable.
  const drag = useDrag(position, onPositionChange ?? noop);
  const draggable = !!onPositionChange;

  // Initial mount: seed the DOM once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerText = value;
    lastCommitted.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep in sync with external changes (AI edit applied, "New post", form
  // edit elsewhere) — but never while the user is actively typing in it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (value !== lastCommitted.current) {
      el.innerText = value;
      lastCommitted.current = value;
    }
  }, [value]);

  function commit(e: FocusEvent<HTMLDivElement>) {
    setFocused(false);
    const text = e.currentTarget.innerText.replace(/\n+$/, "");
    lastCommitted.current = text;
    if (text !== value) onChange(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.currentTarget.blur();
      return;
    }
    if (e.key !== "Enter") return;
    if (!multiline) {
      e.preventDefault();
      e.currentTarget.blur();
      return;
    }
    // Multi-line: let the browser handle Enter natively. It inserts a <br>,
    // which is correct inside a block box, and innerText turns it back into a
    // "\n" when we commit. (See the display override below for why the box is
    // block rather than flex.)
  }

  const cursor = draggable ? (drag.dragging ? "grabbing" : focused ? "text" : "grab") : undefined;

  // The templates make every text box a flex ROW, because Satori requires a
  // text node's parent to be a flex container. In a real browser that breaks
  // editing: pressing Enter inserts a <br>, an element child becomes its own
  // flex item, and each "line" lands in a new COLUMN beside the last.
  //
  // Switching to a column keeps the box sized and positioned exactly as the
  // template intends (unlike display:block, which collapses the box and throws
  // centring off) while stacking those line breaks vertically, as expected.
  // The one thing that has to move: in a row, justify-content centred the text
  // horizontally; in a column that job belongs to align-items.
  const { justifyContent, ...restStyle } = style ?? {};
  const layoutStyle: CSSProperties = {
    ...restStyle,
    display: "flex",
    flexDirection: "column",
    ...(justifyContent ? { alignItems: justifyContent } : {}),
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`editable-text${draggable ? " draggable" : ""}${drag.dragging ? " is-dragging" : ""}`}
      style={{
        ...layoutStyle,
        ...(drag.transform ? { transform: drag.transform } : {}),
        ...(cursor ? { cursor } : {}),
      }}
      data-placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onPointerDown={draggable ? drag.onPointerDown : undefined}
    />
  );
}
