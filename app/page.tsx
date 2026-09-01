"use client";

import { Fragment, useState } from "react";
import MicButton from "@/components/MicButton";
import PhotoUpload from "@/components/PhotoUpload";
import CopyReviewEditor from "@/components/CopyReviewEditor";
import SlideStage from "@/components/preview/SlideStage";
import { buildImageZip, downloadBlob } from "@/lib/zip";
import { buildBlankCopy } from "@/lib/blankCopy";
import { pickPhotoFiles, uploadPhotoFile } from "@/lib/uploadPhoto";
import { readJson } from "@/lib/apiClient";
import PhotoCropper from "@/components/PhotoCropper";
import SharePhoneModal from "@/components/SharePhoneModal";
import type { GenerateCopyResult } from "@/lib/llm";
import type { RenderSlideInput, TemplateFamily, Variant } from "@/lib/templates/shared/types";

interface Selection {
  family: TemplateFamily;
  variant: Variant;
  slideCount: number;
  auto: boolean;
}

type ContentMode = "ai" | "manual";

const MAX_SLIDES = 10;

/** Moves one array item to a new index, returning a new array. */
function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

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

const VARIANT_CHIPS: { id: Variant; label: string }[] = [
  { id: "branded", label: "Branded orange" },
  { id: "neutral", label: "Neutral" },
];

const STEPS = [
  { n: 1, label: "Set up" },
  { n: 2, label: "Edit slides" },
  { n: 3, label: "Export" },
] as const;

const STEP_HEADINGS: Record<number, { title: string; subtitle: (mode: ContentMode) => string }> = {
  1: {
    title: "Describe the post. Get the carousel.",
    subtitle: (mode) =>
      mode === "ai"
        ? "Type what the post is about — Claude picks the template, writes the copy and renders every slide."
        : "Already have the copy from somewhere else? Skip the AI — pick a style, then paste your content straight onto each slide.",
  },
  2: {
    title: "Edit your slides.",
    subtitle: () => "Click any text to rewrite it, drag it to move it, and recolour backgrounds or bubbles as you go.",
  },
  3: {
    title: "Export your carousel.",
    subtitle: () =>
      "Download the slides, or send them to your phone to post from the Instagram app. The caption travels with the phone link; remember the URL belongs in the first comment, since Instagram captions can't have clickable links.",
  },
};

export default function Page() {
  const [step, setStep] = useState(1);
  const [contentMode, setContentMode] = useState<ContentMode>("ai");
  const [prompt, setPrompt] = useState("");
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
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
  // Photos are cropped one at a time before use: `cropQueue` holds the files
  // still waiting, and `cropTarget` says where the finished crop should land —
  // appended as new slides, or swapped into an existing one.
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [cropTarget, setCropTarget] = useState<{ mode: "append" } | { mode: "replace"; index: number } | null>(null);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [share, setShare] = useState<{ url: string; expiresAt: number } | null>(null);

  // In manual mode the photo+bubble carousel is built entirely on the canvas —
  // photos are added there with the + tile, so nothing is needed up front.
  const canvasManagesPhotos = familyOverride === "photoBubble" && contentMode === "manual";
  const needsPhoto = familyOverride === "photoBubble" && contentMode === "ai" && photoDataUrls.length === 0;
  const needsTemplate = familyOverride === null;
  // Tweet card and text post have no natural slide count to fall back on
  // (color-block is fixed at 5, photo+bubble follows the photos), so in the
  // manual flow the count is an explicit choice rather than a silent default.
  const picksSlideCount = familyOverride === "tweetCard" || familyOverride === "textPost";
  const needsSlideCount = contentMode === "manual" && picksSlideCount && slideCountChoice === null;
  const canStart =
    !needsTemplate && !needsPhoto && !needsSlideCount && !generating && (contentMode === "manual" || prompt.trim().length > 0);

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
      const json = await readJson<{ copy: GenerateCopyResult; selection: Selection }>(res, "Failed to generate the post.");
      setCopy(json.copy);
      setSelection(json.selection);
      setStep(2);
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
      familyOverride === "colorBlock"
        ? 5
        : familyOverride === "photoBubble"
          ? // Always at least one slide, so there's a canvas to add the first photo to.
            Math.min(Math.max(photoDataUrls.length, 1), 10)
          : (slideCountChoice ?? 1);
    const blank = buildBlankCopy(familyOverride, { slideCount });
    setCopy(blank);
    setSelection({ family: familyOverride, variant: variantChoice, slideCount, auto: false });
    setStep(2);
  }

  /** Adds photos from the canvas's + tile — each one is cropped first. */
  async function handleAddPhoto() {
    setError(null);
    try {
      const files = await pickPhotoFiles({ multiple: true });
      if (files.length === 0) return;
      const room = MAX_SLIDES - photoDataUrls.length;
      if (room <= 0) {
        setError(`You can use at most ${MAX_SLIDES} photos.`);
        return;
      }
      startCropping(files.slice(0, room), { mode: "append" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add the photo.");
    }
  }

  /** Swaps the photo behind one slide (or fills an empty one). */
  async function handleReplacePhoto(index: number) {
    setError(null);
    try {
      const files = await pickPhotoFiles();
      if (files.length === 0) return;
      startCropping(files.slice(0, 1), { mode: "replace", index });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to replace the photo.");
    }
  }

  function startCropping(files: File[], target: { mode: "append" } | { mode: "replace"; index: number }) {
    setCropTarget(target);
    setCropQueue(files);
    setCropPreview(URL.createObjectURL(files[0]));
  }

  /** Moves to the next queued photo, or closes the dialog when done. */
  function advanceCropQueue(remaining: File[]) {
    if (cropPreview) URL.revokeObjectURL(cropPreview);
    if (remaining.length === 0) {
      setCropQueue([]);
      setCropTarget(null);
      setCropPreview(null);
      return;
    }
    setCropQueue(remaining);
    setCropPreview(URL.createObjectURL(remaining[0]));
  }

  async function handleCropConfirm(box: { x: number; y: number; width: number; height: number }) {
    const file = cropQueue[0];
    const target = cropTarget;
    if (!file || !target) return;
    setCropping(true);
    setError(null);
    try {
      const dataUrl = await uploadPhotoFile(file, box);
      if (target.mode === "replace") {
        const index = target.index;
        setPhotoDataUrls((prev) => (index < prev.length ? prev.map((p, i) => (i === index ? dataUrl : p)) : [...prev, dataUrl]));
      } else {
        const nextPhotos = [...photoDataUrls, dataUrl];
        setPhotoDataUrls(nextPhotos);
        // The first slide starts photo-less, so it absorbs the first upload
        // instead of adding a slide alongside it.
        if (photoDataUrls.length > 0) {
          setCopy((prev) => {
            if (!prev || prev.family !== "photoBubble") return prev;
            return { ...prev, slides: [...prev.slides, { bubbles: [{ text: "" }] }] };
          });
        }
        setSelection((prev) => (prev ? { ...prev, slideCount: nextPhotos.length } : prev));
      }
      advanceCropQueue(cropQueue.slice(1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process the photo.");
      advanceCropQueue([]);
    } finally {
      setCropping(false);
    }
  }

  /** Removes a slide and its photo together. */
  function handleDeleteSlide(index: number) {
    setError(null);
    const nextPhotos = photoDataUrls.filter((_, i) => i !== index);
    setPhotoDataUrls(nextPhotos);
    setCopy((prev) => {
      if (!prev || prev.family !== "photoBubble") return prev;
      const slides = prev.slides.filter((_, i) => i !== index);
      // Never drop to zero — keep one empty slide so there's still a canvas
      // to add the next photo to.
      return { ...prev, slides: slides.length > 0 ? slides : [{ bubbles: [{ text: "" }] }] };
    });
    setSelection((prev) => (prev ? { ...prev, slideCount: Math.max(1, nextPhotos.length) } : prev));
  }

  /** Reorders a slide and its photo together, so bubble text stays with its image. */
  function handleReorderSlides(from: number, to: number) {
    setPhotoDataUrls((prev) => moveItem(prev, from, to));
    setCopy((prev) => {
      if (!prev || prev.family !== "photoBubble") return prev;
      return { ...prev, slides: moveItem(prev.slides, from, to) };
    });
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
      const json = await readJson<{ copy: GenerateCopyResult }>(res, "Failed to apply the edit.");
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
    const json = await readJson<{ slides: { index: number; base64: string }[] }>(res, "Failed to render images.");
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

  /** Renders the carousel, stores it, and shows a QR to open it on a phone. */
  async function handleSendToPhone() {
    if (!copy || !selection || sharing) return;
    setError(null);
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: buildRenderInput(copy, selection.variant),
          caption: copy.caption.caption,
          firstComment: copy.caption.firstComment,
        }),
      });
      const json = await readJson<{ url: string; expiresAt: number }>(res, "Failed to create the share link.");
      setShare({ url: json.url, expiresAt: json.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the share link.");
    } finally {
      setSharing(false);
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
      const json = await readJson<{ slides: { base64: string }[] }>(res, "Failed to render the slide.");
      const base64 = json.slides[0].base64;
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


  function handleStartOver() {
    setPrompt("");
    setPhotoDataUrls([]);
    setFamilyOverride(null);
    setSlideCountChoice(null);
    setCopy(null);
    setSelection(null);
    setEditInstruction("");
    setError(null);
    setStep(1);
  }

  function handleConfirmStartOver() {
    if (window.confirm("Are you sure you want to start again? All progress will be lost.")) {
      handleStartOver();
    }
  }

  /** Steps past setup only make sense once there's a carousel to work on. */
  const canVisitStep = (n: number) => n === 1 || (!!copy && !!selection);

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

          <ol className="steps" aria-label="Progress">
            {STEPS.map((s, i) => (
              <Fragment key={s.n}>
                {i > 0 && <li className="step-rule" aria-hidden="true" />}
                <li>
                  <button
                    type="button"
                    className={`step${step === s.n ? " is-active" : ""}${s.n < step ? " is-done" : ""}`}
                    onClick={() => canVisitStep(s.n) && setStep(s.n)}
                    disabled={!canVisitStep(s.n)}
                    aria-current={step === s.n ? "step" : undefined}
                  >
                    <span className="step-index">{s.n < step ? "✓" : s.n}</span>
                    {s.label}
                  </button>
                </li>
              </Fragment>
            ))}
          </ol>

          <p className="eyebrow">Carousel Generator</p>
          <h1>{STEP_HEADINGS[step].title}</h1>
          <p className="subtitle">{STEP_HEADINGS[step].subtitle(contentMode)}</p>

          {step > 1 && (
            <div className="step-nav">
              <div className="step-nav-left">
                <button className="btn secondary" onClick={() => setStep(step - 1)}>
                  ← {step === 3 ? "Back to slides" : "Back"}
                </button>
                {step === 3 && copy && (
                  <>
                    <button className="btn secondary" onClick={handleDownloadAll} disabled={exportingAll}>
                      {exportingAll ? (
                        <>
                          <span className="spinner" /> Rendering…
                        </>
                      ) : (
                        "⬇ Download ZIP"
                      )}
                    </button>
                    <button className="btn secondary" onClick={handleSendToPhone} disabled={sharing}>
                      {sharing ? (
                        <>
                          <span className="spinner" /> Preparing…
                        </>
                      ) : (
                        "📱 Send to phone"
                      )}
                    </button>
                  </>
                )}
              </div>
              {step === 2 ? (
                <button className="btn" onClick={() => setStep(3)}>
                  Next: export →
                </button>
              ) : (
                <button className="btn secondary" onClick={handleConfirmStartOver}>
                  Start again
                </button>
              )}
            </div>
          )}

          {step === 1 && (
          <>
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

          {/* Touch devices don't get the hover popup, so the chosen style is
              shown here instead. */}
          {familyOverride && (
            <div className="selected-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/sample/${familyOverride}?variant=${variantChoice}&v=2`} alt="" loading="lazy" />
              <span className="selected-preview-text">
                <strong>{FAMILY_NAMES[familyOverride]}</strong>
                This is how your slides will look.
              </span>
            </div>
          )}

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
                  className={`count-select${needsSlideCount ? " needs-choice" : ""}`}
                  value={slideCountChoice ?? ""}
                  onChange={(e) => setSlideCountChoice(e.target.value === "" ? null : Number(e.target.value))}
                >
                  <option value="" disabled>
                    {contentMode === "manual" ? "Choose…" : "Auto"}
                  </option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {contentMode === "manual" && (familyOverride === "tweetCard" || familyOverride === "photoBubble") && (
            <div className="chip-row" role="group" aria-label="Colors">
              <span className="chip-row-label">Colors</span>
              {VARIANT_CHIPS.map((chip) => (
                <span className="chip-wrap" key={chip.id}>
                  <button
                    className={`chip-btn${variantChoice === chip.id ? " active" : ""}`}
                    onClick={() => setVariantChoice(chip.id)}
                  >
                    {chip.label}
                  </button>
                  <span className="chip-preview" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/sample/${familyOverride}?variant=${chip.id}&v=2`} alt="" loading="lazy" />
                    <span className="chip-preview-label">{chip.label} sample</span>
                  </span>
                </span>
              ))}
            </div>
          )}

          {canvasManagesPhotos ? (
            <p className="hint photo-canvas-note">
              Photos are added on the slide itself — hit Start, then use the <strong>+</strong> tile to add each one and type its
              callout straight onto the photo.
            </p>
          ) : (
            <details className="photo-details" open={familyOverride === "photoBubble"}>
              <summary>Add photos (optional — required for Photo + bubble; one photo per slide, in order)</summary>
              <PhotoUpload photos={photoDataUrls} onChange={setPhotoDataUrls} onError={setError} />
            </details>
          )}

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
            {needsSlideCount && !needsTemplate && <span className="hint">Choose how many slides first.</span>}
            {copy && !generating && (
              <button className="btn secondary small" onClick={handleConfirmStartOver}>
                Start again
              </button>
            )}
          </div>

          {generating && (
            <div className="generating-note">
              <div className="status-line">
                <span className="spinner" />
                {`Writing copy for the ${familyOverride ? FAMILY_NAMES[familyOverride] : "chosen"} template…`}
              </div>
            </div>
          )}
          </>
          )}

          {step === 2 && copy && selection && (
            <>
              <div className="result-head">
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
                onAddPhoto={handleAddPhoto}
                onReplacePhoto={handleReplacePhoto}
                onReorderSlides={handleReorderSlides}
                onDeleteSlide={handleDeleteSlide}
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
                <summary>Edit as a form instead — including the caption</summary>
                <CopyReviewEditor copy={copy} onChange={handleCopyChange} />
              </details>
            </>
          )}
        </main>

        {error && <div className="error-banner">{error}</div>}

        {share && <SharePhoneModal url={share.url} expiresAt={share.expiresAt} onClose={() => setShare(null)} />}

        {cropPreview && (
          <PhotoCropper
            src={cropPreview}
            busy={cropping}
            onCancel={() => advanceCropQueue([])}
            onConfirm={handleCropConfirm}
          />
        )}
      </div>
    </>
  );
}
