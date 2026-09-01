import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BLOCK_PAGE_BG, BRAND, EYEBROW_LABEL } from "./shared/constants";
import type { ColorBlockSlides, Offset } from "./shared/types";

/**
 * Turns a stored drag offset into the `transform` Satori/CSS needs. Returns
 * undefined for untouched elements so their style objects stay byte-identical
 * to what they were before drag support existed.
 */
export function offsetStyle(offset?: Offset): { transform?: string } {
  if (!offset || (offset.x === 0 && offset.y === 0)) return {};
  return { transform: `translate(${offset.x}px, ${offset.y}px)` };
}

/** Background for a page, honouring a user override. */
function pageBg(slides: ColorBlockSlides, pageIndex: number): string {
  return slides.backgrounds?.[pageIndex] || COLOR_BLOCK_PAGE_BG[pageIndex];
}

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

function HookPage({ data, bg, positions }: { data: ColorBlockSlides["hook"]; bg: string; positions?: Record<string, Offset> }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: bg,
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
          ...offsetStyle(positions?.["hook.subhead"]),
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
          ...offsetStyle(positions?.["hook.headline"]),
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
          ...offsetStyle(positions?.["hook.cta"]),
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
  keyPrefix,
  positions,
}: {
  bg: string;
  headline: string;
  headlineColor: string;
  labelPrefix: string;
  items: { title: string; body: string }[];
  itemTitleColor: string;
  itemBodyColor: string;
  keyPrefix: "problem" | "fix";
  positions?: Record<string, Offset>;
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
          ...offsetStyle(positions?.[`${keyPrefix}.headline`]),
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
                ...offsetStyle(positions?.[`${keyPrefix}.item.${i}.title`]),
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
                ...offsetStyle(positions?.[`${keyPrefix}.item.${i}.body`]),
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

function FeaturesPage({ data, bg, positions }: { data: ColorBlockSlides["features"]; bg: string; positions?: Record<string, Offset> }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: bg,
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
          ...offsetStyle(positions?.["features.headline"]),
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
                ...offsetStyle(positions?.[`features.item.${i}.title`]),
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
                  ...offsetStyle(positions?.[`features.item.${i}.body`]),
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

function CtaPage({ data, bg, positions }: { data: ColorBlockSlides["cta"]; bg: string; positions?: Record<string, Offset> }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: bg,
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
          ...offsetStyle(positions?.["cta.headline"]),
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
          ...offsetStyle(positions?.["cta.body"]),
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
  const positions = data.positions;
  switch (pageIndex) {
    case 0:
      return <HookPage data={data.hook} bg={pageBg(data, 0)} positions={positions} />;
    case 1:
      return (
        <ItemListPage
          bg={pageBg(data, 1)}
          headline={data.problem.headline}
          headlineColor={BRAND.orange}
          labelPrefix="PROBLEM"
          items={data.problem.items}
          itemTitleColor="#111111"
          itemBodyColor={BRAND.orange}
          keyPrefix="problem"
          positions={positions}
        />
      );
    case 2:
      return (
        <ItemListPage
          bg={pageBg(data, 2)}
          headline={data.fix.headline}
          headlineColor={BRAND.orange}
          labelPrefix="FIX"
          items={data.fix.items}
          itemTitleColor={BRAND.white}
          itemBodyColor={BRAND.orange}
          keyPrefix="fix"
          positions={positions}
        />
      );
    case 3:
      return <FeaturesPage data={data.features} bg={pageBg(data, 3)} positions={positions} />;
    case 4:
      return <CtaPage data={data.cta} bg={pageBg(data, 4)} positions={positions} />;
    default:
      throw new Error(`colorBlock only has 5 pages (0-4), got index ${pageIndex}`);
  }
}

export const COLOR_BLOCK_PAGE_COUNT = 5;
