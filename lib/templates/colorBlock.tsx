import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BLOCK_PAGE_BG, BRAND, EYEBROW_LABEL } from "./shared/constants";
import type { ColorBlockSlides } from "./shared/types";

const eyebrow = (color: string) => (
  <div
    style={{
      display: "flex",
      fontFamily: "Inter",
      fontWeight: 800,
      fontSize: 20,
      letterSpacing: 2,
      color,
      marginBottom: 18,
    }}
  >
    {EYEBROW_LABEL}
  </div>
);

function HookPage({ data }: { data: ColorBlockSlides["hook"] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: COLOR_BLOCK_PAGE_BG[0],
        padding: "90px 70px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: 26,
          color: BRAND.white,
          lineHeight: 1.4,
          marginBottom: 30,
        }}
      >
        {data.subhead}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Archivo Black",
          fontSize: 76,
          color: BRAND.orange,
          lineHeight: 1.15,
        }}
      >
        {data.headline}
      </div>
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div
        style={{
          display: "flex",
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 34,
          color: BRAND.white,
          marginBottom: 14,
        }}
      >
        {data.cta}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: 1,
          color: BRAND.orange,
        }}
      >
        {EYEBROW_LABEL}
      </div>
    </div>
  );
}

function ItemListPage({
  bg,
  headline,
  headlineColor,
  labelPrefix,
  items,
  itemTitleColor,
  itemBodyColor,
}: {
  bg: string;
  headline: string;
  headlineColor: string;
  labelPrefix: string;
  items: { title: string; body: string }[];
  itemTitleColor: string;
  itemBodyColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: bg,
        padding: "80px 64px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{eyebrow(BRAND.orange)}</div>
      <div
        style={{
          display: "flex",
          fontFamily: "Archivo Black",
          fontSize: 46,
          color: headlineColor,
          textAlign: "center",
          justifyContent: "center",
          lineHeight: 1.2,
          marginBottom: 40,
        }}
      >
        {headline}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: 30 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontWeight: 800,
                fontSize: 24,
                color: BRAND.orange,
                marginBottom: 6,
              }}
            >
              {labelPrefix} {i + 1}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 28,
                color: itemTitleColor,
                lineHeight: 1.3,
                marginBottom: 6,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontWeight: 400,
                fontSize: 22,
                color: itemBodyColor,
                lineHeight: 1.4,
              }}
            >
              {item.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesPage({ data }: { data: ColorBlockSlides["features"] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: COLOR_BLOCK_PAGE_BG[3],
        padding: "80px 70px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{eyebrow(BRAND.orange)}</div>
      <div
        style={{
          display: "flex",
          fontFamily: "Archivo Black",
          fontSize: 48,
          color: "#111111",
          textAlign: "center",
          justifyContent: "center",
          marginBottom: 36,
        }}
      >
        {data.headline}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {data.items.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: 25,
                color: "#111111",
                lineHeight: 1.35,
              }}
            >
              {i + 1}. {item.title}
            </div>
            {item.body ? (
              <div
                style={{
                  display: "flex",
                  fontFamily: "Inter",
                  fontWeight: 400,
                  fontSize: 20,
                  color: "#2b2b2b",
                  lineHeight: 1.4,
                  marginTop: 4,
                }}
              >
                {item.body}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaPage({ data }: { data: ColorBlockSlides["cta"] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: COLOR_BLOCK_PAGE_BG[4],
        padding: "90px 70px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Archivo Black",
          fontSize: 64,
          color: BRAND.white,
          marginBottom: 40,
        }}
      >
        BUCK
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 40,
          color: BRAND.white,
          lineHeight: 1.3,
          marginBottom: 24,
        }}
      >
        {data.headline}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Inter",
          fontWeight: 400,
          fontSize: 26,
          color: BRAND.white,
          lineHeight: 1.4,
        }}
      >
        {data.body}
      </div>
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div
        style={{
          display: "flex",
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: 1,
          color: BRAND.white,
        }}
      >
        {EYEBROW_LABEL}
      </div>
    </div>
  );
}

/** Returns the JSX for one of the 5 fixed color-block pages (0-indexed). */
export function renderColorBlockPage(pageIndex: number, data: ColorBlockSlides) {
  switch (pageIndex) {
    case 0:
      return <HookPage data={data.hook} />;
    case 1:
      return (
        <ItemListPage
          bg={COLOR_BLOCK_PAGE_BG[1]}
          headline={data.problem.headline}
          headlineColor={BRAND.orange}
          labelPrefix="PROBLEM"
          items={data.problem.items}
          itemTitleColor="#111111"
          itemBodyColor={BRAND.orange}
        />
      );
    case 2:
      return (
        <ItemListPage
          bg={COLOR_BLOCK_PAGE_BG[2]}
          headline={data.fix.headline}
          headlineColor={BRAND.orange}
          labelPrefix="FIX"
          items={data.fix.items}
          itemTitleColor={BRAND.white}
          itemBodyColor={BRAND.orange}
        />
      );
    case 3:
      return <FeaturesPage data={data.features} />;
    case 4:
      return <CtaPage data={data.cta} />;
    default:
      throw new Error(`colorBlock only has 5 pages (0-4), got index ${pageIndex}`);
  }
}

export const COLOR_BLOCK_PAGE_COUNT = 5;
