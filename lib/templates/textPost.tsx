import { CANVAS_WIDTH, CANVAS_HEIGHT, TEXT_POST, TWEET_NAME } from "./shared/constants";
import type { TextPostSlide } from "./shared/types";

/**
 * Clean "screenshot of a text post" template: white background, brand avatar +
 * name header, then plain black multi-paragraph text — modeled on the
 * reference post (jamesmiddletoncoach protein breakdown).
 */
export function renderTextPostPage(slide: TextPostSlide) {
  const paragraphs = slide.text.split(/\n+/).filter((p) => p.trim().length > 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: TEXT_POST.bg,
        padding: "90px 96px",
      }}
    >
      {/* header: avatar + name + verified dot */}
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
        <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: TEXT_POST.ink }}>
          {TWEET_NAME}
        </div>
        <div
          style={{
            display: "flex",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: TEXT_POST.check,
            marginLeft: 14,
          }}
        />
      </div>

      {/* body paragraphs */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {paragraphs.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              fontFamily: "Inter",
              fontWeight: 400,
              fontSize: 42,
              color: TEXT_POST.ink,
              lineHeight: 1.45,
              marginBottom: i === paragraphs.length - 1 ? 0 : 36,
            }}
          >
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
