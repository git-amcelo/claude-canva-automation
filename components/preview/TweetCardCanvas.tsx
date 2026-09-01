"use client";

// Mirrors lib/templates/tweetCard.tsx. Name/handle are never editable here —
// the tweet template always posts as the brand (enforced server-side too).

import EditableText from "./EditableText";
import { CommentIcon, RetweetIcon, HeartIcon, BookmarkIcon, ShareIcon } from "./tweetIcons";
import { CANVAS_WIDTH, CANVAS_HEIGHT, TWEET_CARD_BG } from "@/lib/templates/shared/constants";
import type { TweetCardSlide, Variant } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

function IconStat({
  icon,
  count,
  placeholder,
  onCountChange,
}: {
  icon: React.ReactNode;
  count?: string;
  placeholder?: string;
  onCountChange?: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {icon}
      {onCountChange ? (
        <EditableText
          value={count ?? ""}
          placeholder={placeholder}
          multiline={false}
          onChange={onCountChange}
          style={{ display: "flex", fontFamily: "Inter", fontSize: 20, color: "#536471", marginLeft: 6, minWidth: 20 }}
        />
      ) : null}
    </div>
  );
}

export function renderEditableTweetCardPage(variant: Variant, slide: TweetCardSlide, index: number, patch: PatchFn) {
  const bg = TWEET_CARD_BG[variant];

  const set = (field: keyof TweetCardSlide) => (v: string) =>
    patch((d) => { if (d.family === "tweetCard") d.slides[index] = { ...d.slides[index], [field]: v }; });

  return (
    <div style={{ display: "flex", position: "relative", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: bg.base, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: 1500,
          height: 1500,
          left: 350,
          top: 550,
          background: bg.diagonal,
          transform: "rotate(25deg)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: 70,
          top: 460,
          width: 940,
          borderRadius: 40,
          background: "#FFFFFF",
          padding: "40px 44px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 76, height: 76, borderRadius: "50%", background: "#3B82C4", marginRight: 20 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 32, color: "#0F1419" }}>{slide.name}</div>
              <div style={{ display: "flex", width: 28, height: 28, borderRadius: "50%", background: "#1DA1F2", marginLeft: 10 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", fontFamily: "Inter", fontSize: 22, color: "#71767B" }}>
              <span>{slide.handle}&nbsp;&middot;&nbsp;</span>
              <EditableText
                value={slide.timestamp}
                placeholder="1h"
                multiline={false}
                onChange={set("timestamp")}
                style={{ display: "flex", fontFamily: "Inter", fontSize: 22, color: "#71767B", minWidth: 24 }}
              />
            </div>
          </div>
        </div>

        <EditableText
          value={slide.body}
          placeholder="Tweet body…"
          onChange={set("body")}
          style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 28, color: "#0F1419", lineHeight: 1.5, marginTop: 30 }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
          <IconStat icon={<CommentIcon />} count={slide.comments} placeholder="82K" onCountChange={set("comments")} />
          <IconStat icon={<RetweetIcon />} count={slide.reposts} placeholder="12K" onCountChange={set("reposts")} />
          <IconStat icon={<HeartIcon />} count={slide.likes} placeholder="340K" onCountChange={set("likes")} />
          <IconStat icon={<BookmarkIcon />} count={slide.bookmarks} placeholder="8K" onCountChange={set("bookmarks")} />
          <IconStat icon={<ShareIcon />} />
        </div>
      </div>
    </div>
  );
}
