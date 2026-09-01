"use client";

import { useState } from "react";
import MicButton from "@/components/MicButton";
import PhotoUpload from "@/components/PhotoUpload";
import CopyReviewEditor from "@/components/CopyReviewEditor";
import SlideStage from "@/components/preview/SlideStage";
import { buildImageZip, downloadBlob } from "@/lib/zip";
import { buildBlankCopy } from "@/lib/blankCopy";
import type { GenerateCopyResult } from "@/lib/llm";
import type { RenderSlideInput, TemplateFamily, Variant } from "@/lib/templates/shared/types";

interface Selection {
  family: TemplateFamily;
  variant: Variant;
  slideCount: number;
  auto: boolean;
}

type ContentMode = "ai" | "manual";

const FAMILY_CHIPS: { id: TemplateFamily; label: string }[] = [
  { id: "colorBlock", label: "Color-block" },
  { id: "photoBubble", label: "Photo + bubble" },
  { id: "textPost", label: "Text post" },
  { id: "tweetCard", label: "Tweet card" },
];

const FAMILY_NAMES: Record<TemplateFamily, string> = {
  colorBlock: "Color-block",
  tweetCard: "Tweet card",
  photoBubble: "Photo + bubble",
  textPost: "Text post",
};

export default function Page() {
  const [contentMode, setContentMode] = useState<ContentMode>("ai");
  const [prompt, setPrompt] = useState("");
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [familyOverride, setFamilyOverride] = useState<TemplateFamily | null>(null);
  const [slideCountChoice, setSlideCountChoice] = useState<number | null>(null);
  const [variantChoice, setVariantChoice] = useState<Variant>("branded");

  const [copy, setCopy] = useState<GenerateCopyResult | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const [generating, setGenerating] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const showPhotoCaptions = familyOverride === "photoBubble" && contentMode === "manual";
  const needsPhoto = familyOverride === "photoBubble" && photoDataUrls.length === 0;
  const needsTemplate = familyOverride === null;
  const canStart = !needsTemplate && !needsPhoto && !generating && (contentMode === "manual" || prompt.trim().length > 0);

  function buildRenderInput(currentCopy: GenerateCopyResult, variant: Variant): RenderSlideInput {
    if (currentCopy.family === "colorBlock") return { family: "colorBlock", slides: currentCopy.slides };
    if (currentCopy.family === "tweetCard") return { family: "tweetCard", variant, slides: currentCopy.slides };
    if (currentCopy.family === "textPost") return { family: "textPost", slides: currentCopy.slides };
    return { family: "photoBubble", variant, slides: currentCopy.slides, photoDataUrls };
  }

  function handleCopyChange(next: GenerateCopyResult) {
    setCopy(next);
  }

  async function handleGenerate() {
    if (!canStart || contentMode !== "ai") return;
    setError(null);
    setGenerating(true);
    setCopy(null);
    setSelection(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          photoDataUrls: photoDataUrls.length > 0 ? photoDataUrls : undefined,
          family: familyOverride ?? undefined,
          slideCount: slideCountChoice ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate the post.");
      setCopy(json.copy);
      setSelection(json.selection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the post.");
    } finally {
      setGenerating(false);
    }
  }

  /** "I already have the content" — skips the AI call entirely; starts from a blank shell you fill in on the slide canvas. */
  function handleStartBlank() {
    if (!canStart || !familyOverride || contentMode !== "manual") return;
    setError(null);
    const slideCount =
      familyOverride === "colorBlock" ? 5 : familyOverride === "photoBubble" ? Math.min(photoDataUrls.length, 10) : slideCountChoice ?? 3;
    const blank = buildBlankCopy(familyOverride, { slideCount, photoBubbleTexts: photoCaptions });
    setCopy(blank);
    setSelection({ family: familyOverride, variant: variantChoice, slideCount, auto: false });
  }

  async function handleApplyEdit() {
    if (!copy || !selection || !editInstruction.trim() || editing) return;
    setError(null);
    setEditing(true);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy,
          instruction: editInstruction,
          variant: selection.variant,
          photoDataUrls: photoDataUrls.length > 0 ? photoDataUrls : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to apply the edit.");
      setCopy(json.copy);
      setEditInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply the edit.");
    } finally {
      setEditing(false);
    }
  }

  /** Renders every slide fresh from the current copy — always up to date with on-canvas edits, no separate render step to remember. */
  async function renderAllFresh(): Promise<{ index: number; base64: string }[]> {
    if (!copy || !selection) throw new Error("Nothing to export yet.");
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: buildRenderInput(copy, selection.variant) }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to render images.");
    return json.slides;
  }

  async function handleDownloadAll() {
    if (!copy || !selection || exportingAll) return;
    setError(null);
    setExportingAll(true);
    try {
      const rendered = await renderAllFresh();
      const images = rendered
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((s) => ({ filename: `slide-${s.index + 1}.png`, base64: s.base64 }));
      const blob = await buildImageZip(images);
      downloadBlob(blob, "buckstreaming-carousel.zip");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download the carousel.");
    } finally {
      setExportingAll(false);
    }
  }

  async function handleExportSlide(index: number) {
    if (!copy || !selection) return;
    setError(null);
    setExportingIndex(index);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: buildRenderInput(copy, selection.variant), pageIndices: [index] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to render the slide.");
      const base64 = json.slides[0].base64 as string;
      const a = document.createElement("a");
      a.href = `data:image/png;base64,${base64}`;
      a.download = `slide-${index + 1}.png`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export the slide.");
    } finally {
      setExportingIndex(null);
    }
  }

  async function copyText(field: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  function handleStartOver() {
    setPrompt("");
    setPhotoDataUrls([]);
    setPhotoCaptions([]);
    setFamilyOverride(null);
    setSlideCountChoice(null);
    setCopy(null);
    setSelection(null);
    setEditInstruction("");
    setError(null);
  }

  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <div className="shell">
        <main className="panel prompt-hero">
          <div className="top">
            <div className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand-logo" src="https://buckstreaming.com/logo-primary.svg" alt="BUCK" />
            </div>
            <div className="safe-badge">
              <span className="dot" />
              Draft only — nothing auto-posts
            </div>
          </div>

          <p className="eyebrow">Carousel Generator</p>
          <h1>Describe the post. Get the carousel.</h1>
          <p className="subtitle">
            {contentMode === "ai"
              ? "Type what the post is about — Claude picks the template, writes the copy and renders every slide. Then tweak it in plain English or click straight on a slide to edit."
              : "Already have the copy from somewhere else? Skip the AI — pick a style, then paste your content straight onto each slide."}
          </p>

          <div className="mode-toggle" role="group" aria-label="Content source">
            <button className={contentMode === "ai" ? "active" : ""} onClick={() => setContentMode("ai")}>
              ✨ Write with AI
            </button>
            <button className={contentMode === "manual" ? "active" : ""} onClick={() => setContentMode("manual")}>
              📋 I already have the content
            </button>
          </div>

          {contentMode === "ai" && (
            <div className="textarea-wrap">
              <textarea
                className="prompt-input"
                placeholder="e.g. Announce the new referral program: existing members get a free month for every friend who signs up."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
              />
              <MicButton value={prompt} onChange={setPrompt} onError={setError} />
            </div>
          )}

          <div className="chip-row" role="group" aria-label="Template (required)">
            <span className="chip-row-label">Style</span>
            {FAMILY_CHIPS.map((chip) => (
              <span className="chip-wrap" key={chip.label}>
                <button
                  className={`chip-btn${familyOverride === chip.id ? " active" : ""}`}
                  onClick={() => setFamilyOverride(chip.id)}
                >
                  {chip.label}
                </button>
                <span className="chip-preview" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/sample/${chip.id}?v=2`} alt="" loading="lazy" />
                  <span className="chip-preview-label">{chip.label} sample</span>
                </span>
              </span>
            ))}
          </div>

          {familyOverride && (
            <div className="count-row">
              <span className="chip-row-label">Slides</span>
              {familyOverride === "colorBlock" && <span className="hint">5 — fixed for this template</span>}
              {familyOverride === "photoBubble" && (
                <span className="hint">
                  {photoDataUrls.length > 0 ? `${photoDataUrls.length} — one per uploaded photo` : "one per uploaded photo"}
                </span>
              )}
              {(familyOverride === "tweetCard" || familyOverride === "textPost") && (
                <select
                  className="count-select"
                  value={slideCountChoice ?? "auto"}
                  onChange={(e) => setSlideCountChoice(e.target.value === "auto" ? null : Number(e.target.value))}
                >
                  <option value="auto">{contentMode === "manual" ? "3 (default)" : "Auto"}</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {contentMode === "manual" && familyOverride && (familyOverride === "tweetCard" || familyOverride === "photoBubble") && (
            <div className="variant-row">
              <span className="chip-row-label">Colors</span>
              <select className="count-select" value={variantChoice} onChange={(e) => setVariantChoice(e.target.value as Variant)}>
                <option value="branded">Branded (orange)</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
          )}

          <details className="photo-details" open={familyOverride === "photoBubble"}>
            <summary>
              Add photos (optional — required for Photo + bubble; one photo per slide, in order)
              {showPhotoCaptions ? " — add each slide's callout text right on its photo below" : ""}
            </summary>
            <PhotoUpload
              photos={photoDataUrls}
              onChange={setPhotoDataUrls}
              onError={setError}
              captions={showPhotoCaptions ? photoCaptions : undefined}
              onCaptionsChange={showPhotoCaptions ? setPhotoCaptions : undefined}
            />
          </details>

          <div className="generate-row">
            <button
              className="btn generate-btn"
              disabled={!canStart}
              onClick={() => (contentMode === "manual" ? handleStartBlank() : handleGenerate())}
            >
              {generating ? (
                <>
                  <span className="spinner" /> Writing &amp; rendering…
                </>
              ) : contentMode === "manual" ? (
                "Start — I'll fill it in"
              ) : (
                "Generate post"
              )}
            </button>
            {needsTemplate && (contentMode === "manual" || prompt.trim().length > 0) && <span className="hint">Pick a style above first.</span>}
            {needsPhoto && <span className="hint">Photo + bubble needs a photo first.</span>}
            {(copy || generating) && !needsPhoto && (
              <button className="btn secondary small" onClick={handleStartOver} disabled={generating}>
                New post
              </button>
            )}
          </div>
        </main>

        {generating && (
          <section className="section-panel">
            <div className="status-line">
              <span className="spinner" />
              {`Writing copy for the ${familyOverride ? FAMILY_NAMES[familyOverride] : "chosen"} template and rendering slides…`}
            </div>
            <div className="preview-grid">
              {Array.from({ length: familyOverride === "colorBlock" ? 5 : 4 }, (_, i) => (
                <div className="skeleton-tile" key={i} />
              ))}
            </div>
          </section>
        )}

        {copy && selection && (
          <>
            <section className="section-panel">
              <div className="result-head">
                <div className="section-label" style={{ margin: 0 }}>
                  Your carousel
                </div>
                <span className="sel-summary">
                  {FAMILY_NAMES[selection.family]}
                  {selection.family !== "colorBlock" ? ` · ${selection.variant}` : ""} · {selection.slideCount} slides
                  {selection.auto ? " · picked automatically" : ""}
                </span>
              </div>

              <SlideStage
                copy={copy}
                onChange={handleCopyChange}
                variant={selection.variant}
                photoDataUrls={photoDataUrls}
                onExportOne={handleExportSlide}
                exportingIndex={exportingIndex}
              />

              {contentMode === "ai" && (
                <div className="edit-bar">
                  <div className="textarea-wrap" style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder='Tweak it in plain English — e.g. "make slide 3 punchier" or "change the CTA"'
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleApplyEdit();
                      }}
                      disabled={editing}
                    />
                  </div>
                  <button className="btn" onClick={handleApplyEdit} disabled={!editInstruction.trim() || editing}>
                    {editing ? (
                      <>
                        <span className="spinner" /> Applying…
                      </>
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              )}

              <details className="manual-edit">
                <summary>Edit as a form instead</summary>
                <CopyReviewEditor copy={copy} onChange={handleCopyChange} />
              </details>
            </section>

            <section className="section-panel">
              <div className="section-label">Caption</div>
              <label className="field-label">
                Caption
                <textarea
                  value={copy.caption.caption}
                  onChange={(e) => handleCopyChange({ ...copy, caption: { ...copy.caption, caption: e.target.value } })}
                />
              </label>
              <label className="field-label">
                First comment (paste after posting — the link goes here)
                <textarea
                  value={copy.caption.firstComment}
                  onChange={(e) => handleCopyChange({ ...copy, caption: { ...copy.caption, firstComment: e.target.value } })}
                />
              </label>
            </section>

            <div className="ship-bar">
              <button className="btn" onClick={handleDownloadAll} disabled={!copy || exportingAll}>
                {exportingAll ? (
                  <>
                    <span className="spinner" /> Rendering…
                  </>
                ) : (
                  "⬇ Download ZIP"
                )}
              </button>
              <button className="btn secondary" onClick={() => copyText("caption", copy.caption.caption)}>
                {copiedField === "caption" ? "Copied ✓" : "Copy caption"}
              </button>
              <button className="btn secondary" onClick={() => copyText("comment", copy.caption.firstComment)}>
                {copiedField === "comment" ? "Copied ✓" : "Copy first comment"}
              </button>
            </div>
          </>
        )}

        {error && <div className="error-banner">{error}</div>}
      </div>
    </>
  );
}
