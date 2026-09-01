"use client";

// Mirrors lib/templates/colorBlock.tsx layout/styles exactly (same style
// objects) but with every text leaf swapped for EditableText — keep the two
// in sync if the server template's design ever changes.

import EditableText from "./EditableText";
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BLOCK_PAGE_BG, BRAND, EYEBROW_LABEL } from "@/lib/templates/shared/constants";
import type { ColorBlockSlides } from "@/lib/templates/shared/types";
import type { PatchFn } from "./types";

const eyebrow = (color: string) => (
  <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 20, letterSpacing: 2, color, marginBottom: 18 }}>
    {EYEBROW_LABEL}
  </div>
);

function HookPageEditable({ data, patch }: { data: ColorBlockSlides["hook"]; patch: PatchFn }) {
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
      <EditableText
        value={data.subhead}
        placeholder="Short supporting line…"
        multiline={false}
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.hook.subhead = v; })}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 26, color: BRAND.white, lineHeight: 1.4, marginBottom: 30 }}
      />
      <EditableText
        value={data.headline}
        placeholder="Big bold hook…"
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.hook.headline = v; })}
        style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 76, color: BRAND.orange, lineHeight: 1.15 }}
      />
      <div style={{ display: "flex", flexGrow: 1 }} />
      <EditableText
        value={data.cta}
        placeholder="CTA line…"
        multiline={false}
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.hook.cta = v; })}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 34, color: BRAND.white, marginBottom: 14 }}
      />
      <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 18, letterSpacing: 1, color: BRAND.orange }}>
        {EYEBROW_LABEL}
      </div>
    </div>
  );
}

function ItemListPageEditable({
  bg,
  headline,
  headlineColor,
  labelPrefix,
  items,
  itemTitleColor,
  itemBodyColor,
  onHeadlineChange,
  onItemChange,
}: {
  bg: string;
  headline: string;
  headlineColor: string;
  labelPrefix: string;
  items: { title: string; body: string }[];
  itemTitleColor: string;
  itemBodyColor: string;
  onHeadlineChange: (v: string) => void;
  onItemChange: (i: number, field: "title" | "body", v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: bg, padding: "80px 64px" }}>
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{eyebrow(BRAND.orange)}</div>
      <EditableText
        value={headline}
        placeholder="Section headline…"
        multiline={false}
        onChange={onHeadlineChange}
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
              onChange={(v) => onItemChange(i, "title", v)}
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 28, color: itemTitleColor, lineHeight: 1.3, marginBottom: 6 }}
            />
            <EditableText
              value={item.body}
              placeholder="Body…"
              onChange={(v) => onItemChange(i, "body", v)}
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 22, color: itemBodyColor, lineHeight: 1.4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesPageEditable({ data, patch }: { data: ColorBlockSlides["features"]; patch: PatchFn }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: COLOR_BLOCK_PAGE_BG[3], padding: "80px 70px" }}>
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{eyebrow(BRAND.orange)}</div>
      <EditableText
        value={data.headline}
        placeholder="THE FEATURES"
        multiline={false}
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.features.headline = v; })}
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
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 25, color: "#111111", lineHeight: 1.35 }}
            />
            <EditableText
              value={item.body ?? ""}
              placeholder="Body (optional)…"
              onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.features.items[i].body = v; })}
              style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 20, color: "#2b2b2b", lineHeight: 1.4, marginTop: 4 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaPageEditable({ data, patch }: { data: ColorBlockSlides["cta"]; patch: PatchFn }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: COLOR_BLOCK_PAGE_BG[4], padding: "90px 70px" }}>
      <div style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 64, color: BRAND.white, marginBottom: 40 }}>BUCK</div>
      <EditableText
        value={data.headline}
        placeholder="CTA headline…"
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.cta.headline = v; })}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 40, color: BRAND.white, lineHeight: 1.3, marginBottom: 24 }}
      />
      <EditableText
        value={data.body}
        placeholder="Body…"
        onChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.cta.body = v; })}
        style={{ display: "flex", fontFamily: "Inter", fontWeight: 400, fontSize: 26, color: BRAND.white, lineHeight: 1.4 }}
      />
      <div style={{ display: "flex", flexGrow: 1 }} />
      <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 800, fontSize: 18, letterSpacing: 1, color: BRAND.white }}>{EYEBROW_LABEL}</div>
    </div>
  );
}

/** Returns the editable JSX for one of the 5 fixed color-block pages (0-indexed). */
export function renderEditableColorBlockPage(pageIndex: number, slides: ColorBlockSlides, patch: PatchFn) {
  switch (pageIndex) {
    case 0:
      return <HookPageEditable data={slides.hook} patch={patch} />;
    case 1:
      return (
        <ItemListPageEditable
          bg={COLOR_BLOCK_PAGE_BG[1]}
          headline={slides.problem.headline}
          headlineColor={BRAND.orange}
          labelPrefix="PROBLEM"
          items={slides.problem.items}
          itemTitleColor="#111111"
          itemBodyColor={BRAND.orange}
          onHeadlineChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.problem.headline = v; })}
          onItemChange={(i, field, v) => patch((d) => { if (d.family === "colorBlock") d.slides.problem.items[i][field] = v; })}
        />
      );
    case 2:
      return (
        <ItemListPageEditable
          bg={COLOR_BLOCK_PAGE_BG[2]}
          headline={slides.fix.headline}
          headlineColor={BRAND.orange}
          labelPrefix="FIX"
          items={slides.fix.items}
          itemTitleColor={BRAND.white}
          itemBodyColor={BRAND.orange}
          onHeadlineChange={(v) => patch((d) => { if (d.family === "colorBlock") d.slides.fix.headline = v; })}
          onItemChange={(i, field, v) => patch((d) => { if (d.family === "colorBlock") d.slides.fix.items[i][field] = v; })}
        />
      );
    case 3:
      return <FeaturesPageEditable data={slides.features} patch={patch} />;
    case 4:
      return <CtaPageEditable data={slides.cta} patch={patch} />;
    default:
      throw new Error(`colorBlock only has 5 pages (0-4), got index ${pageIndex}`);
  }
}
