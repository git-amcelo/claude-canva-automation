"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent } from "react";

/**
 * A text block that's editable in place by clicking on it — like PowerPoint —
 * instead of via a side form. Renders with the exact same styling the final
 * PNG uses, so what you click is what you get.
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
}: {
  value: string;
  onChange: (next: string) => void;
  style?: CSSProperties;
  multiline?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastCommitted = useRef<string | null>(null);

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
    // Insert a plain newline character instead of letting contentEditable
    // create nested <div>s on Enter, which would corrupt plain-text reads.
    e.preventDefault();
    document.execCommand("insertText", false, "\n");
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="editable-text"
      style={style}
      data-placeholder={placeholder}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
