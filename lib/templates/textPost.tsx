import { CANVAS_WIDTH, CANVAS_HEIGHT, TEXT_POST, TWEET_NAME } from "./shared/constants";
import type { BrandMarks } from "./shared/brand";
import type { TextPostSlide } from "./shared/types";

/**
 * Clean "screenshot of a text post" template: white background, brand avatar +
 * name header, then plain black multi-paragraph text — modeled on the
 * reference post (jamesmiddletoncoach protein breakdown).
 */
export function renderTextPostPage(slide: TextPostSlide, marks: BrandMarks) {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={marks.avatar}
          width={96}
          height={96}
          style={{ borderRadius: "50%", objectFit: "cover", marginRight: 28 }}
          alt=""
        />
        <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: TEXT_POST.ink }}>
          {TWEET_NAME}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={marks.verified} width={34} height={34} style={{ marginLeft: 14 }} alt="" />
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
