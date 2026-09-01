"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent } from "react";
import { useDrag } from "./useDrag";
import type { Offset } from "@/lib/templates/shared/types";

const noop = () => {};

/**
 * Zero-width space. Stands in for the newline the browser would otherwise park
 * at the end of the box to hold a freshly opened line — see the swap in
 * trimTrailingBlankLines. It occupies the line without opening another one,
 * and never survives into the copy: it's swept up as soon as the user types,
 * and stripped again on commit.
 */
const PLACEHOLDER = "\u200B";

/**
 * A run of blank lines at the end of the content: each newline plus whatever
 * whitespace trails it, and any placeholder holding the last one open.
 * Anything this matches renders as an empty line — and on a photo bubble,
 * where every line paints its own background, as an empty pill hanging under
 * the callout.
 */
const TRAILING_BLANK_LINES = /(?:\n[^\S\n]*|\u200B)+$/;

/** A block the browser left behind for a line that has nothing on it. */
function isBlankBlock(node: ChildNode) {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node.nodeName === "DIV" || node.nodeName === "P") &&
    (node as Element).textContent?.trim() === ""
  );
}

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
    el.innerText = value.replace(TRAILING_BLANK_LINES, "");
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
      el.innerText = value.replace(TRAILING_BLANK_LINES, "");
      lastCommitted.current = value;
    }
  }, [value]);

  function commit(e: FocusEvent<HTMLDivElement>) {
    setFocused(false);
    const el = e.currentTarget;
    const text = el.innerText.replace(/\u200B/g, "").replace(TRAILING_BLANK_LINES, "");
    lastCommitted.current = text;

    // Stripping the blank line from the value isn't enough on its own: the
    // sync effect above skips a DOM write when the value is unchanged, so the
    // empty line would survive in the box the user just left.
    if (el.innerText !== text) el.innerText = text;

    if (text !== value) onChange(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Clear a stranded blank line before the key lands. The browser parks the
    // caret in FRONT of a lone trailing newline, so Backspace finds nothing to
    // delete, fires no input event, and the empty line — an undeletable pill on
    // a photo bubble — is stuck there until the box loses focus.
    if (!e.nativeEvent.isComposing) trimTrailingBlankLines();

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
    // Multi-line: let the browser handle Enter natively. In a pre-wrap box it
    // writes plain "\n" characters, which innerText hands straight back to us
    // when we commit — trimTrailingBlankLines below tidies up after it.
  }

  /**
   * Blink parks a blank line at the end of a `white-space: pre-wrap` box:
   * Enter writes "\n\n" — one newline for the line you opened, one more so
   * that line has somewhere to hold the caret — and the second one stays put
   * once you type on the line. The photo bubble paints a background per line,
   * so the leftover hangs under the callout as an empty pill; elsewhere it
   * just pads the box with a phantom line.
   *
   * So after every edit, drop the trailing run of line breaks — unless the
   * caret is sitting inside it, which means Enter was the last thing typed and
   * those newlines are the only thing keeping the new line, and the caret on
   * it, alive.
   */
  function trimTrailingBlankLines() {
    const el = ref.current;
    if (!el) return;

    // Sweep up placeholders that are no longer holding anything open: the only
    // one worth keeping is a final character still standing in for the line
    // the caret is on. Once real text follows one, its line can hold itself.
    // (deleteData is what keeps the caret put; reassigning .data would not.)
    const texts: Text[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    texts.forEach((node, i) => {
      const holdsLastLine =
        i === texts.length - 1 && node === el.lastChild && node.data.endsWith(PLACEHOLDER);
      const upto = holdsLastLine ? node.data.length - 1 : node.data.length;
      for (let at = upto - 1; at >= 0; at--) {
        if (node.data[at] === PLACEHOLDER) node.deleteData(at, 1);
      }
    });

    // Walk back over the trailing line breaks to find where the run starts.
    // It comes in every shape the browser has ever used for an empty line:
    // newlines in a text node, a <br>, or a block with nothing in it.
    let start: ChildNode | null = null;
    let startOffset = -1; // -1 means the whole node
    for (let node: ChildNode | null = el.lastChild; node; node = node.previousSibling) {
      if (node.nodeType === Node.TEXT_NODE) {
        const data = (node as Text).data;
        const match = TRAILING_BLANK_LINES.exec(data);
        if (match) {
          start = node;
          startOffset = match.index;
          if (match.index > 0) break; // the run starts inside this node
          continue;
        }
        // An emptied-out text node paints nothing itself but would hide the
        // run behind it from this walk — step over it.
        if (/^[^\S\n]*$/.test(data)) continue;
        break;
      }
      if (node.nodeName === "BR" || isBlankBlock(node)) {
        start = node;
        startOffset = -1;
        continue;
      }
      break;
    }
    if (!start) return;

    const runStart = document.createRange();
    if (startOffset < 0) runStart.setStartBefore(start);
    else runStart.setStart(start, startOffset);
    runStart.collapse(true);

    const selection = window.getSelection();
    if (selection && selection.rangeCount && selection.isCollapsed) {
      const caret = selection.getRangeAt(0);
      const inThisBox = caret.startContainer === el || el.contains(caret.startContainer);
      if (inThisBox && caret.compareBoundaryPoints(Range.START_TO_START, runStart) > 0) {
        // The caret is down in the run — but only leave the run alone if a
        // break still follows it. That last break is the sentinel holding the
        // caret's line open; with nothing below, the browser has already
        // shunted the caret back up to the text and the blank line is the
        // stranded one Backspace can't reach.
        const below = document.createRange();
        below.setStart(caret.startContainer, caret.startOffset);
        below.setEnd(el, el.childNodes.length);
        const rest = below.cloneContents();
        const restText = rest.textContent ?? "";
        const restBlocks = rest.querySelector("br, div, p") !== null;

        // A newline is a clumsy sentinel: holding the caret's line open opens
        // an empty line behind it too, so one Enter shows two empty pills.
        // Swap it for a zero-width character, which holds the line just as
        // well and opens nothing.
        if (restText === "\n" && !restBlocks) {
          below.deleteContents();
          below.insertNode(document.createTextNode(PLACEHOLDER));
          return;
        }
        if (restText.includes("\n") || restText.includes(PLACEHOLDER) || restBlocks) return;
      }
    }

    const trailing = document.createRange();
    trailing.setStart(runStart.startContainer, runStart.startOffset);
    trailing.setEnd(el, el.childNodes.length);
    trailing.deleteContents();
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
  // A caller can opt out — the photo bubble asks for `display: inline` so its
  // background follows each line's width instead of boxing the whole block.
  // An inline box already stacks its own lines, so it needs no flex treatment.
  const layoutStyle: CSSProperties =
    style?.display && style.display !== "flex"
      ? { ...style }
      : {
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
      onFocus={() => {
        setFocused(true);
        // A blank line left over from an earlier session is stranded before the
        // user has even typed — clear it on the way in.
        trimTrailingBlankLines();
      }}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onInput={trimTrailingBlankLines}
      onPointerDown={draggable ? drag.onPointerDown : undefined}
    />
  );
}
