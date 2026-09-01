"use client";

import { useState } from "react";
import MicButton from "@/components/MicButton";
import PhotoUpload from "@/components/PhotoUpload";
import CopyReviewEditor from "@/components/CopyReviewEditor";
import SlidePreviewGrid, { RenderedSlide } from "@/components/SlidePreviewGrid";
import { buildImageZip, downloadBlob } from "@/lib/zip";
import type { GenerateCopyResult } from "@/lib/llm";
import type { RenderSlideInput, TemplateFamily, Variant } from "@/lib/templates/shared/types";

interface Selection {
  family: TemplateFamily;
  variant: Variant;
  slideCount: number;
  auto: boolean;
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

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [familyOverride, setFamilyOverride] = useState<TemplateFamily | null>(null);
  const [slideCountChoice, setSlideCountChoice] = useState<number | null>(null);

  const [copy, setCopy] = useState<GenerateCopyResult | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [slides, setSlides] = useState<RenderedSlide[]>([]);

  const [generating, setGenerating] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [rerendering, setRerendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [canvaBusy, setCanvaBusy] = useState(false);
  const [canvaUrl, setCanvaUrl] = useState<string | null>(null);

  const needsPhoto = familyOverride === "photoBubble" && photoDataUrls.length === 0;
  const needsTemplate = familyOverride === null;
  const canGenerate = prompt.trim().length > 0 && !needsTemplate && !needsPhoto && !generating;
  const allSlidesReady = slides.length > 0 && slides.every((s) => !!s.base64);

  function buildRenderInput(currentCopy: GenerateCopyResult, variant: Variant): RenderSlideInput {
    if (currentCopy.family === "colorBlock") return { family: "colorBlock", slides: currentCopy.slides };
    if (currentCopy.family === "tweetCard") return { family: "tweetCard", variant, slides: currentCopy.slides };
    if (currentCopy.family === "textPost") return { family: "textPost", slides: currentCopy.slides };
    return { family: "photoBubble", variant, slides: currentCopy.slides, photoDataUrls };
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setError(null);
    setGenerating(true);
    setCopy(null);
    setSelection(null);
    setSlides([]);

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
      setSlides(json.slides.map((s: { index: number; base64: string }) => ({ ...s, loading: false })));
      setCanvaUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the post.");
    } finally {
      setGenerating(false);
    }
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
      const updated: { index: number; base64: string }[] = json.slides;
      if (json.full) {
        setSlides(updated.map((s) => ({ ...s, loading: false })));
      } else if (updated.length > 0) {
        setSlides((prev) =>
          prev.map((s) => {
            const match = updated.find((u) => u.index === s.index);
            return match ? { ...s, base64: match.base64, loading: false } : s;
          })
        );
      }
      setEditInstruction("");
      setCanvaUrl(null); // copy changed — a previously exported Canva design is stale
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply the edit.");
    } finally {
      setEditing(false);
    }
  }

  function connectCanvaPopup(): Promise<void> {
    return new Promise((resolve, reject) => {
      const win = window.open("/api/canva/auth", "canva-auth", "width=620,height=820");
      if (!win) {
        reject(new Error("Popup blocked — allow popups for this site and try again."));
        return;
      }
      const onMessage = (e: MessageEvent) => {
        if (e.data === "canva-connected") {
          cleanup();
          resolve();
        }
      };
      const closedTimer = setInterval(() => {
        if (win.closed) {
          cleanup();
          reject(new Error("Canva window closed before connecting."));
        }
      }, 500);
      function cleanup() {
        window.removeEventListener("message", onMessage);
        clearInterval(closedTimer);
      }
      window.addEventListener("message", onMessage);
    });
  }

  async function handleEditInCanva() {
    if (!copy || !selection || canvaBusy) return;
    if (canvaUrl) {
      window.open(canvaUrl, "_blank");
      return;
    }
    setError(null);
    setCanvaBusy(true);

    const post = () =>
      fetch("/api/canva/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy,
          variant: selection.variant,
          photoDataUrls: photoDataUrls.length > 0 ? photoDataUrls : undefined,
          title: `BUCK — ${prompt.slice(0, 60) || "carousel"}`,
        }),
      });

    try {
      let res = await post();
      if (res.status === 401) {
        await connectCanvaPopup();
        res = await post();
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to export to Canva.");
      setCanvaUrl(json.editUrl);
      window.open(json.editUrl, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export to Canva.");
    } finally {
      setCanvaBusy(false);
    }
  }

  async function handleRerenderAll(nextCopy?: GenerateCopyResult) {
    const currentCopy = nextCopy ?? copy;
    if (!currentCopy || !selection) return;
    setError(null);
    setRerendering(true);
    setSlides((prev) => prev.map((s) => ({ ...s, loading: true })));

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: buildRenderInput(currentCopy, selection.variant) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to render images.");
      setSlides(json.slides.map((s: { index: number; base64: string }) => ({ ...s, loading: false })));
      setCanvaUrl(null); // manual text edits — any exported Canva design is stale
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render images.");
      setSlides((prev) => prev.map((s) => ({ ...s, loading: false })));
    } finally {
      setRerendering(false);
    }
  }

  async function handleRegenerateSlide(index: number) {
    if (!copy || !selection) return;
    setError(null);
    setSlides((prev) => prev.map((s) => (s.index === index ? { ...s, loading: true } : s)));

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: buildRenderInput(copy, selection.variant), pageIndices: [index] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to render image.");
      const updated = json.slides[0];
      setSlides((prev) => prev.map((s) => (s.index === index ? { ...s, base64: updated.base64, loading: false } : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render image.");
      setSlides((prev) => prev.map((s) => (s.index === index ? { ...s, loading: false } : s)));
    }
  }

  async function copyText(field: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  async function handleDownloadAll() {
    const images = slides
      .filter((s): s is RenderedSlide & { base64: string } => !!s.base64)
      .sort((a, b) => a.index - b.index)
      .map((s) => ({ filename: `slide-${s.index + 1}.png`, base64: s.base64 }));
    const blob = await buildImageZip(images);
    downloadBlob(blob, "buckstreaming-carousel.zip");
  }

  function handleStartOver() {
    setPrompt("");
    setPhotoDataUrls([]);
    setFamilyOverride(null);
    setSlideCountChoice(null);
    setCopy(null);
    setSelection(null);
    setSlides([]);
    setEditInstruction("");
    setError(null);
    setCanvaUrl(null);
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
            Type what the post is about — Claude picks the template, writes the copy and renders every slide. Then tweak it in plain
            English.
          </p>

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
                  <option value="auto">Auto</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <details className="photo-details" open={familyOverride === "photoBubble"}>
            <summary>
              Add photos (optional — required for Photo + bubble; one photo per slide, in order)
            </summary>
            <PhotoUpload photos={photoDataUrls} onChange={setPhotoDataUrls} onError={setError} />
          </details>

          <div className="generate-row">
            <button className="btn generate-btn" disabled={!canGenerate} onClick={handleGenerate}>
              {generating ? (
                <>
                  <span className="spinner" /> Writing &amp; rendering…
                </>
              ) : (
                "Generate post"
              )}
            </button>
            {needsTemplate && prompt.trim().length > 0 && <span className="hint">Pick a style above first.</span>}
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

        {copy && selection && slides.length > 0 && (
          <>
            <section className="section-panel">
              <div className="result-head">
                <div className="section-label" style={{ margin: 0 }}>
                  Your carousel
                </div>
                <span className="sel-summary">
                  {FAMILY_NAMES[selection.family]}
                  {selection.family !== "colorBlock" ? ` · ${selection.variant}` : ""} · {slides.length} slides
                  {selection.auto ? " · picked automatically" : ""}
                </span>
              </div>

              <SlidePreviewGrid slides={slides} onRegenerate={handleRegenerateSlide} />

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

              <details className="manual-edit">
                <summary>Edit the text manually instead</summary>
                <CopyReviewEditor copy={copy} onChange={setCopy} onRender={() => handleRerenderAll()} rendering={rerendering} />
              </details>
            </section>

            <section className="section-panel">
              <div className="section-label">Caption</div>
              <div className="copy-block">
                <div className="label">Caption</div>
                {copy.caption.caption}
              </div>
              <div className="copy-block">
                <div className="label">First comment (paste after posting — the link goes here)</div>
                {copy.caption.firstComment}
              </div>
            </section>

            <div className="ship-bar">
              <button className="btn canva-btn" onClick={handleEditInCanva} disabled={canvaBusy || !allSlidesReady}>
                {canvaBusy ? (
                  <>
                    <span className="spinner" /> Sending to Canva…
                  </>
                ) : canvaUrl ? (
                  "Open in Canva ↗"
                ) : (
                  "Edit in Canva"
                )}
              </button>
              <button className="btn" onClick={handleDownloadAll} disabled={!allSlidesReady}>
                ⬇ Download ZIP
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
