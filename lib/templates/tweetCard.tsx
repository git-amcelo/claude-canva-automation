import { CANVAS_WIDTH, CANVAS_HEIGHT, TWEET_CARD_BG } from "./shared/constants";
import type { TweetCardSlide, Variant } from "./shared/types";
import type { IconName } from "./shared/icons";
import type { BrandMarks } from "./shared/brand";

function IconStat({ icon, count, icons }: { icon: IconName; count?: string; icons: Record<IconName, string> }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icons[icon]} width={22} height={22} style={{ marginRight: count ? 6 : 0 }} />
      {count ? <div style={{ display: "flex", fontFamily: "Inter", fontSize: 20, color: "#536471" }}>{count}</div> : null}
    </div>
  );
}

export function renderTweetCardPage(
  variant: Variant,
  slide: TweetCardSlide,
  icons: Record<IconName, string>,
  marks: BrandMarks
) {
  const bg = TWEET_CARD_BG[variant];

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: bg.base,
        overflow: "hidden",
      }}
    >
      {/* diagonal accent shape */}
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

      {/* white tweet card */}
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={marks.avatar}
            width={76}
            height={76}
            style={{ borderRadius: "50%", objectFit: "cover", marginRight: 20 }}
            alt=""
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 32, color: "#0F1419" }}>
                {slide.name}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={marks.verified} width={28} height={28} style={{ marginLeft: 10 }} alt="" />
            </div>
            <div style={{ display: "flex", fontFamily: "Inter", fontSize: 22, color: "#71767B" }}>
              {slide.handle} &middot; {slide.timestamp}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontWeight: 400,
            fontSize: 28,
            color: "#0F1419",
            lineHeight: 1.5,
            marginTop: 30,
          }}
        >
          {slide.body}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
          <IconStat icon="comment" count={slide.comments} icons={icons} />
          <IconStat icon="retweet" count={slide.reposts} icons={icons} />
          <IconStat icon="heart" count={slide.likes} icons={icons} />
          <IconStat icon="bookmark" count={slide.bookmarks} icons={icons} />
          <IconStat icon="share" icons={icons} />
        </div>
      </div>
    </div>
  );
}
