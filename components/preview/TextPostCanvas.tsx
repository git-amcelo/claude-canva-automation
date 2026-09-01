"use client";

// Mirrors lib/templates/textPost.tsx. The body is edited as one field (blank
// line = new paragraph, same convention as the form editor) rather than as
// separately-clickable paragraphs — simpler to edit, and the final PNG still
// splits it into properly-spaced paragraph blocks at export time.

import EditableText from "./EditableText";
import { VerifiedBadge } from "./tweetIcons";
import { CANVAS_WIDTH, CANVAS_HEIGHT, TEXT_POST, TWEET_NAME } from "@/lib/templates/shared/constants";
import type { TextPostSlide } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

export function renderEditableTextPostPage(slide: TextPostSlide, index: number, patch: PatchFn) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: TEXT_POST.bg, padding: "90px 96px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 64 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/apple-touch-icon.png"
          width={96}
          height={96}
          style={{ borderRadius: "50%", objectFit: "cover", marginRight: 28 }}
          alt=""
        />
        <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: TEXT_POST.ink }}>{TWEET_NAME}</div>
        <VerifiedBadge size={34} style={{ marginLeft: 14 }} />
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
