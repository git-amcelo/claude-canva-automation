"use client";

// Mirrors lib/templates/textPost.tsx. The body is edited as one field (blank
// line = new paragraph, same convention as the form editor) rather than as
// separately-clickable paragraphs — simpler to edit, and the final PNG still
// splits it into properly-spaced paragraph blocks at export time.

import EditableText from "./EditableText";
import { CANVAS_WIDTH, CANVAS_HEIGHT, TEXT_POST, TWEET_NAME } from "@/lib/templates/shared/constants";
import type { TextPostSlide } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

export function renderEditableTextPostPage(slide: TextPostSlide, index: number, patch: PatchFn) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: TEXT_POST.bg, padding: "90px 96px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 64 }}>
        <div
          style={{
            display: "flex",
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: TEXT_POST.avatarBg,
            color: "#FFFFFF",
            fontFamily: "Inter",
            fontWeight: 800,
            fontSize: 48,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 28,
          }}
        >
          B
        </div>
        <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: TEXT_POST.ink }}>{TWEET_NAME}</div>
        <div style={{ display: "flex", width: 34, height: 34, borderRadius: "50%", background: TEXT_POST.check, marginLeft: 14 }} />
      </div>

      <EditableText
        value={slide.text}
        placeholder="Post text… (blank line = new paragraph)"
        onChange={(v) => patch((d) => { if (d.family === "textPost") d.slides[index] = { text: v }; })}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 42, color: TEXT_POST.ink, lineHeight: 1.45, whiteSpace: "pre-wrap" }}
      />
    </div>
  );
}
