"use client";

// Mirrors lib/templates/colorBlock.tsx layout/styles exactly (same style
// objects) but with every text leaf swapped for a draggable EditableText and
// the background clickable to recolour — keep the two in sync if the server
// template's design ever changes.

import EditableText from "./EditableText";
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BLOCK_PAGE_BG, BRAND, EYEBROW_LABEL } from "@/lib/templates/shared/constants";
import type { ColorBlockSlides, Offset } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

/** Everything a page needs to wire its text into the copy + position state. */
interface PageWiring {
  positions?: Record<string, Offset>;
  patch: PatchFn;
  /** Fires when the user presses the slide background (not a text box). */
  onBackgroundClick: (e: React.MouseEvent) => void;
  bg: string;
}

/** Reads/writes one element's drag offset by its stable key. */
function positionProps(key: string, { positions, patch }: PageWiring) {
  return {
    position: positions?.[key],
    onPositionChange: (next: Offset) =>
      patch((d) => {
        if (d.family !== "colorBlock") return;
        d.slides.positions = { ...(d.slides.positions ?? {}), [key]: next };
      }),
  };
}

const eyebrow = (color: string) => (
  <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 20, letterSpacing: 2, color, marginBottom: 18 }}>
    {EYEBROW_LABEL}
  </div>
);

function HookPageEditable({ data, wiring }: { data: ColorBlockSlides["hook"]; wiring: PageWiring }) {
  const { patch } = wiring;
  return (
    <div
      onMouseDown={wiring.onBackgroundClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        background: wiring.bg,
        padding: "90px 70px",
        textAlign: "center",
      }}
    >
      <EditableText
        value={data.subhead}
        placeholder="Short supporting line…"
        multiline={false}
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.hook.subhead = v; })}
        {...positionProps("hook.subhead", wiring)}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 26, color: BRAND.white, lineHeight: 1.4, marginBottom: 30 }}
      />
      <EditableText
        value={data.headline}
        placeholder="Big bold hook…"
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.hook.headline = v; })}
        {...positionProps("hook.headline", wiring)}
        style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 76, color: BRAND.orange, lineHeight: 1.15 }}
      />
      <div style={{ display: "flex", flexGrow: 1 }} />
      <EditableText
        value={data.cta}
        placeholder="CTA line…"
        multiline={false}
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.hook.cta = v; })}
        {...positionProps("hook.cta", wiring)}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 34, color: BRAND.white, marginBottom: 14 }}
      />
      <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 18, letterSpacing: 1, color: BRAND.orange }}>
        {EYEBROW_LABEL}
      </div>
    </div>
  );
}

function ItemListPageEditable({
  headline,
  headlineColor,
  labelPrefix,
  items,
  itemTitleColor,
  itemBodyColor,
  keyPrefix,
  wiring,
}: {
  headline: string;
  headlineColor: string;
  labelPrefix: string;
  items: { title: string; body: string }[];
  itemTitleColor: string;
  itemBodyColor: string;
  keyPrefix: "problem" | "fix";
  wiring: PageWiring;
}) {
  const { patch } = wiring;
  return (
    <div
      onMouseDown={wiring.onBackgroundClick}
      style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: wiring.bg, padding: "80px 64px" }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{eyebrow(BRAND.orange)}</div>
      <EditableText
        value={headline}
        placeholder="Section headline…"
        multiline={false}
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides[keyPrefix].headline = v; })}
        {...positionProps(`${keyPrefix}.headline`, wiring)}
        style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 46, color: headlineColor, textAlign: "center", justifyContent: "center", lineHeight: 1.2, marginBottom: 40 }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: 30 }}>
            <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 24, color: BRAND.orange, marginBottom: 6 }}>
              {labelPrefix} {i + 1}
            </div>
            <EditableText
              value={item.title}
              placeholder="Title…"
              multiline={false}
              onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides[keyPrefix].items[i].title = v; })}
              {...positionProps(`${keyPrefix}.item.${i}.title`, wiring)}
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 28, color: itemTitleColor, lineHeight: 1.3, marginBottom: 6 }}
            />
            <EditableText
              value={item.body}
              placeholder="Body…"
              onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides[keyPrefix].items[i].body = v; })}
              {...positionProps(`${keyPrefix}.item.${i}.body`, wiring)}
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 22, color: itemBodyColor, lineHeight: 1.4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesPageEditable({ data, wiring }: { data: ColorBlockSlides["features"]; wiring: PageWiring }) {
  const { patch } = wiring;
  return (
    <div
      onMouseDown={wiring.onBackgroundClick}
      style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: wiring.bg, padding: "80px 70px" }}
    >
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{eyebrow(BRAND.orange)}</div>
      <EditableText
        value={data.headline}
        placeholder="THE FEATURES"
        multiline={false}
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.features.headline = v; })}
        {...positionProps("features.headline", wiring)}
        style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 48, color: "#111111", textAlign: "center", justifyContent: "center", marginBottom: 36 }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {data.items.map((item, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
            <EditableText
              value={item.title}
              placeholder={`${i + 1}. Feature title…`}
              multiline={false}
              onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.features.items[i].title = v; })}
              {...positionProps(`features.item.${i}.title`, wiring)}
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 25, color: "#111111", lineHeight: 1.35 }}
            />
            <EditableText
              value={item.body ?? ""}
              placeholder="Body (optional)…"
              onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.features.items[i].body = v; })}
              {...positionProps(`features.item.${i}.body`, wiring)}
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 20, color: "#2b2b2b", lineHeight: 1.4, marginTop: 4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaPageEditable({ data, wiring }: { data: ColorBlockSlides["cta"]; wiring: PageWiring }) {
  const { patch } = wiring;
  return (
    <div
      onMouseDown={wiring.onBackgroundClick}
      style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: wiring.bg, padding: "90px 70px" }}
    >
      <div style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 64, color: BRAND.white, marginBottom: 40 }}>BUCK</div>
      <EditableText
        value={data.headline}
        placeholder="CTA headline…"
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.cta.headline = v; })}
        {...positionProps("cta.headline", wiring)}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: BRAND.white, lineHeight: 1.3, marginBottom: 24 }}
      />
      <EditableText
        value={data.body}
        placeholder="Body…"
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.cta.body = v; })}
        {...positionProps("cta.body", wiring)}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 26, color: BRAND.white, lineHeight: 1.4 }}
      />
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 18, letterSpacing: 1, color: BRAND.white }}>{EYEBROW_LABEL}</div>
    </div>
  );
}

/** Returns the editable JSX for one of the 5 fixed color-block pages (0-indexed). */
export function renderEditableColorBlockPage(
  pageIndex: number,
  slides: ColorBlockSlides,
  patch: PatchFn,
  onBackgroundClick: (e: React.MouseEvent) => void
) {
  const wiring: PageWiring = {
    positions: slides.positions,
    patch,
    // Only a press on the background itself counts — presses that bubbled up
    // from a text box are that box's business, not the background's.
    onBackgroundClick: (e) => {
      if (e.target === e.currentTarget) onBackgroundClick(e);
    },
    bg: slides.backgrounds?.[pageIndex] || COLOR_BLOCK_PAGE_BG[pageIndex],
  };

  switch (pageIndex) {
    case 0:
      return <HookPageEditable data={slides.hook} wiring={wiring} />;
    case 1:
      return (
        <ItemListPageEditable
          headline={slides.problem.headline}
          headlineColor={BRAND.orange}
          labelPrefix="PROBLEM"
          items={slides.problem.items}
          itemTitleColor="#111111"
          itemBodyColor={BRAND.orange}
          keyPrefix="problem"
          wiring={wiring}
        />
      );
    case 2:
      return (
        <ItemListPageEditable
          headline={slides.fix.headline}
          headlineColor={BRAND.orange}
          labelPrefix="FIX"
          items={slides.fix.items}
          itemTitleColor={BRAND.white}
          itemBodyColor={BRAND.orange}
          keyPrefix="fix"
          wiring={wiring}
        />
      );
    case 3:
      return <FeaturesPageEditable data={slides.features} wiring={wiring} />;
    case 4:
      return <CtaPageEditable data={slides.cta} wiring={wiring} />;
    default:
      throw new Error(`colorBlock only has 5 pages (0-4), got index ${pageIndex}`);
  }
}
