import PptxGenJS from "pptxgenjs";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { BRAND, TWEET_CARD_BG, PHOTO_BUBBLE_COLOR, TEXT_POST, EYEBROW_LABEL, TWEET_NAME, TWEET_HANDLE } from "../templates/shared/constants";
import type { GenerateCopyResult } from "../llm/schemas";
import type { Variant, ColorBlockSlides } from "../templates/shared/types";

/**
 * Builds a PPTX mirror of the carousel with REAL text boxes and shapes (not
 * flattened images), sized 1080x1350. Canva's design import converts these
 * into fully editable Canva elements — that's what makes every slide's text
 * editable in Canva after import.
 */

// 1080x1350 px at 96dpi
const PAGE_W_IN = 11.25;
const PAGE_H_IN = 14.0625;
const px = (n: number) => n / 96; // px → inches
const pt = (n: number) => n * 0.75; // px → points

const c = (hex: string) => hex.replace("#", "");

type Slide = PptxGenJS.Slide;

function newDeck(): PptxGenJS {
  const pres = new PptxGenJS();
  pres.defineLayout({ name: "IG_PORTRAIT", width: PAGE_W_IN, height: PAGE_H_IN });
  pres.layout = "IG_PORTRAIT";
  return pres;
}

// ---------- colorBlock ----------

function addColorBlockSlides(pres: PptxGenJS, data: ColorBlockSlides) {
  // Page 1 — Hook (black)
  {
    const s = pres.addSlide();
    s.background = { color: c(BRAND.black) };
    s.addText(data.hook.subhead, {
      x: px(70), y: px(90), w: px(940), h: px(90),
      fontFace: "Inter", bold: true, fontSize: pt(26), color: "FFFFFF", align: "center", valign: "top",
    });
    s.addText(data.hook.headline, {
      x: px(70), y: px(210), w: px(940), h: px(700),
      fontFace: "Archivo Black", fontSize: pt(76), color: c(BRAND.orange), align: "center", valign: "top",
      lineSpacingMultiple: 1.15,
    });
    s.addText(data.hook.cta, {
      x: px(70), y: px(1140), w: px(940), h: px(70),
      fontFace: "Inter", bold: true, fontSize: pt(34), color: "FFFFFF", align: "center",
    });
    s.addText(EYEBROW_LABEL, {
      x: px(70), y: px(1230), w: px(940), h: px(40),
      fontFace: "Inter", bold: true, fontSize: pt(18), color: c(BRAND.orange), align: "center", charSpacing: 2,
    });
  }

  // Pages 2 & 3 — Problem (olive) / Fix (black)
  const itemPages: { bg: string; headline: string; label: string; items: { title: string; body: string }[]; titleColor: string; bodyColor: string }[] = [
    { bg: BRAND.olive, headline: data.problem.headline, label: "PROBLEM", items: data.problem.items, titleColor: "#111111", bodyColor: BRAND.orange },
    { bg: BRAND.black, headline: data.fix.headline, label: "FIX", items: data.fix.items, titleColor: BRAND.white, bodyColor: BRAND.orange },
  ];
  for (const page of itemPages) {
    const s = pres.addSlide();
    s.background = { color: c(page.bg) };
    s.addText(EYEBROW_LABEL, {
      x: px(64), y: px(80), w: px(952), h: px(36),
      fontFace: "Inter", bold: true, fontSize: pt(20), color: c(BRAND.orange), align: "center", charSpacing: 2,
    });
    s.addText(page.headline, {
      x: px(64), y: px(140), w: px(952), h: px(140),
      fontFace: "Archivo Black", fontSize: pt(46), color: c(BRAND.orange), align: "center", valign: "top", lineSpacingMultiple: 1.2,
    });
    page.items.forEach((item, i) => {
      s.addText(
        [
          { text: `${page.label} ${i + 1}`, options: { fontFace: "Inter", bold: true, fontSize: pt(24), color: c(BRAND.orange), breakLine: true } },
          { text: item.title, options: { fontFace: "Inter", bold: true, fontSize: pt(28), color: c(page.titleColor), breakLine: true } },
          { text: item.body, options: { fontFace: "Inter", fontSize: pt(22), color: c(page.bodyColor) } },
        ],
        { x: px(64), y: px(320) + i * px(310), w: px(952), h: px(290), align: "left", valign: "top", lineSpacingMultiple: 1.3 }
      );
    });
  }

  // Page 4 — Features (cream)
  {
    const s = pres.addSlide();
    s.background = { color: c(BRAND.cream) };
    s.addText(EYEBROW_LABEL, {
      x: px(70), y: px(80), w: px(940), h: px(36),
      fontFace: "Inter", bold: true, fontSize: pt(20), color: c(BRAND.orange), align: "center", charSpacing: 2,
    });
    s.addText(data.features.headline, {
      x: px(70), y: px(140), w: px(940), h: px(120),
      fontFace: "Archivo Black", fontSize: pt(48), color: "111111", align: "center", valign: "top",
    });
    const runs: PptxGenJS.TextProps[] = [];
    data.features.items.forEach((item, i) => {
      runs.push({ text: `${i + 1}. ${item.title}`, options: { fontFace: "Inter", bold: true, fontSize: pt(25), color: "111111", breakLine: true, paraSpaceAfter: item.body ? 2 : 12 } });
      if (item.body) {
        runs.push({ text: item.body, options: { fontFace: "Inter", fontSize: pt(20), color: "2B2B2B", breakLine: true, paraSpaceAfter: 12 } });
      }
    });
    s.addText(runs, { x: px(70), y: px(300), w: px(940), h: px(950), align: "left", valign: "top", lineSpacingMultiple: 1.35 });
  }

  // Page 5 — CTA (orange)
  {
    const s = pres.addSlide();
    s.background = { color: c(BRAND.orange) };
    s.addText("BUCK", { x: px(70), y: px(90), w: px(600), h: px(110), fontFace: "Archivo Black", fontSize: pt(64), color: "FFFFFF", align: "left" });
    s.addText(data.cta.headline, {
      x: px(70), y: px(240), w: px(940), h: px(180),
      fontFace: "Inter", bold: true, fontSize: pt(40), color: "FFFFFF", align: "left", valign: "top", lineSpacingMultiple: 1.3,
    });
    s.addText(data.cta.body, {
      x: px(70), y: px(440), w: px(940), h: px(400),
      fontFace: "Inter", fontSize: pt(26), color: "FFFFFF", align: "left", valign: "top", lineSpacingMultiple: 1.4,
    });
    s.addText(EYEBROW_LABEL, {
      x: px(70), y: px(1230), w: px(940), h: px(40),
      fontFace: "Inter", bold: true, fontSize: pt(18), color: "FFFFFF", align: "left", charSpacing: 1,
    });
  }
}

// ---------- tweetCard ----------

const ICON_ORDER = ["comment.svg", "retweet.svg", "heart.svg", "bookmark.svg", "share.svg"] as const;

async function loadIconPngs(): Promise<string[]> {
  const dir = path.join(process.cwd(), "assets", "icons");
  return Promise.all(
    ICON_ORDER.map(async (file) => {
      const svg = await readFile(path.join(dir, file));
      const png = await sharp(svg, { density: 300 }).resize(44, 44, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    })
  );
}

async function addTweetCardSlides(pres: PptxGenJS, variant: Variant, slides: { timestamp: string; body: string; comments: string; reposts: string; likes: string; bookmarks: string }[]) {
  const bg = TWEET_CARD_BG[variant];
  const icons = await loadIconPngs();

  for (const slide of slides) {
    const s = pres.addSlide();
    s.background = { color: c(bg.base) };

    // diagonal accent
    s.addShape("rect", { x: px(350), y: px(550), w: px(1500), h: px(1500), fill: { color: c(bg.diagonal) }, rotate: 25, line: { type: "none" } });

    // white tweet card
    s.addShape("roundRect", { x: px(70), y: px(460), w: px(940), h: px(560), fill: { color: "FFFFFF" }, rectRadius: px(40), line: { type: "none" } });

    // avatar + identity
    s.addShape("ellipse", { x: px(114), y: px(500), w: px(76), h: px(76), fill: { color: "3B82C4" }, line: { type: "none" } });
    s.addText(TWEET_NAME, { x: px(210), y: px(498), w: px(420), h: px(44), fontFace: "Inter", bold: true, fontSize: pt(32), color: "0F1419", align: "left", valign: "middle" });
    s.addShape("ellipse", { x: px(492), y: px(506), w: px(28), h: px(28), fill: { color: "1DA1F2" }, line: { type: "none" } });
    s.addText(`${TWEET_HANDLE} · ${slide.timestamp}`, { x: px(210), y: px(544), w: px(500), h: px(36), fontFace: "Inter", fontSize: pt(22), color: "71767B", align: "left", valign: "middle" });

    // body
    s.addText(slide.body, {
      x: px(114), y: px(610), w: px(852), h: px(280),
      fontFace: "Inter", fontSize: pt(28), color: "0F1419", align: "left", valign: "top", lineSpacingMultiple: 1.5,
    });

    // engagement row
    const counts = [slide.comments, slide.reposts, slide.likes, slide.bookmarks, ""];
    const xs = [114, 300, 486, 672, 906];
    icons.forEach((icon, i) => {
      s.addImage({ data: icon, x: px(xs[i]), y: px(925), w: px(22), h: px(22) });
      if (counts[i]) {
        s.addText(counts[i], { x: px(xs[i] + 30), y: px(918), w: px(140), h: px(36), fontFace: "Inter", fontSize: pt(20), color: "536471", align: "left", valign: "middle" });
      }
    });
  }
}

// ---------- photoBubble ----------

function addPhotoBubbleSlides(pres: PptxGenJS, variant: Variant, slides: { bubbleText: string }[], photos: string[]) {
  const colors = PHOTO_BUBBLE_COLOR[variant];
  slides.forEach((slide, i) => {
    const s = pres.addSlide();
    const photo = photos.length > 0 ? photos[i % photos.length] : null;
    if (photo) {
      s.addImage({ data: photo, x: 0, y: 0, w: PAGE_W_IN, h: PAGE_H_IN });
    } else {
      s.background = { color: "9AA5B1" };
    }
    s.addShape("roundRect", { x: px(90), y: px(210), w: px(900), h: px(180), fill: { color: c(colors.bubble) }, rectRadius: px(24), line: { type: "none" } });
    s.addText(slide.bubbleText, {
      x: px(90), y: px(210), w: px(900), h: px(180),
      fontFace: "Inter", bold: true, fontSize: pt(46), color: c(colors.text), align: "center", valign: "middle", lineSpacingMultiple: 1.3,
    });
  });
}

// ---------- textPost ----------

function addTextPostSlides(pres: PptxGenJS, slides: { text: string }[]) {
  for (const slide of slides) {
    const s = pres.addSlide();
    s.background = { color: c(TEXT_POST.bg) };

    s.addShape("ellipse", { x: px(96), y: px(90), w: px(96), h: px(96), fill: { color: c(TEXT_POST.avatarBg) }, line: { type: "none" } });
    s.addText("B", { x: px(96), y: px(90), w: px(96), h: px(96), fontFace: "Inter", bold: true, fontSize: pt(48), color: "FFFFFF", align: "center", valign: "middle" });
    s.addText(TWEET_NAME, { x: px(220), y: px(108), w: px(430), h: px(60), fontFace: "Inter", bold: true, fontSize: pt(40), color: c(TEXT_POST.ink), align: "left", valign: "middle" });
    s.addShape("ellipse", { x: px(560), y: px(122), w: px(34), h: px(34), fill: { color: c(TEXT_POST.check) }, line: { type: "none" } });

    const paragraphs = slide.text.split(/\n+/).filter((p) => p.trim().length > 0);
    const runs: PptxGenJS.TextProps[] = paragraphs.map((p, i) => ({
      text: p,
      options: { fontFace: "Inter", fontSize: pt(42), color: c(TEXT_POST.ink), breakLine: true, paraSpaceAfter: i === paragraphs.length - 1 ? 0 : 20 },
    }));
    s.addText(runs, { x: px(96), y: px(250), w: px(888), h: px(1010), align: "left", valign: "top", lineSpacingMultiple: 1.45 });
  }
}

// ---------- entry point ----------

export async function buildCarouselPptx(copy: GenerateCopyResult, variant: Variant, photoDataUrls: string[]): Promise<Buffer> {
  const pres = newDeck();

  if (copy.family === "colorBlock") addColorBlockSlides(pres, copy.slides);
  else if (copy.family === "tweetCard") await addTweetCardSlides(pres, variant, copy.slides);
  else if (copy.family === "photoBubble") addPhotoBubbleSlides(pres, variant, copy.slides, photoDataUrls);
  else addTextPostSlides(pres, copy.slides);

  const b64 = (await pres.write({ outputType: "base64" })) as string;
  return Buffer.from(b64, "base64");
}
