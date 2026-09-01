"use client";

import type { GenerateCopyResult } from "@/lib/llm";

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="field-label">
      {label}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export default function CopyReviewEditor({
  copy,
  onChange,
}: {
  copy: GenerateCopyResult;
  onChange: (next: GenerateCopyResult) => void;
}) {
  function update(path: (draft: GenerateCopyResult) => void) {
    const next = structuredClone(copy);
    path(next);
    onChange(next);
  }

  return (
    <div>
      {copy.family === "colorBlock" && (
        <>
          <div className="slide-editor">
            <div className="slide-label">Slide 1 — Hook</div>
            <Field label="Subhead" value={copy.slides.hook.subhead} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.hook.subhead = v; })} />
            <Field label="Headline" value={copy.slides.hook.headline} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.hook.headline = v; })} multiline />
            <Field label="CTA line" value={copy.slides.hook.cta} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.hook.cta = v; })} />
          </div>

          <div className="slide-editor">
            <div className="slide-label">Slide 2 — Problem</div>
            <Field label="Headline" value={copy.slides.problem.headline} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.problem.headline = v; })} />
            {copy.slides.problem.items.map((item, i) => (
              <div key={i} style={{ marginTop: 10 }}>
                <Field label={`Problem ${i + 1} — title`} value={item.title} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.problem.items[i].title = v; })} />
                <Field label={`Problem ${i + 1} — body`} value={item.body} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.problem.items[i].body = v; })} multiline />
              </div>
            ))}
          </div>

          <div className="slide-editor">
            <div className="slide-label">Slide 3 — Fix</div>
            <Field label="Headline" value={copy.slides.fix.headline} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.fix.headline = v; })} />
            {copy.slides.fix.items.map((item, i) => (
              <div key={i} style={{ marginTop: 10 }}>
                <Field label={`Fix ${i + 1} — title`} value={item.title} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.fix.items[i].title = v; })} />
                <Field label={`Fix ${i + 1} — body`} value={item.body} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.fix.items[i].body = v; })} multiline />
              </div>
            ))}
          </div>

          <div className="slide-editor">
            <div className="slide-label">Slide 4 — Features</div>
            <Field label="Headline" value={copy.slides.features.headline} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.features.headline = v; })} />
            {copy.slides.features.items.map((item, i) => (
              <div key={i} style={{ marginTop: 10 }}>
                <Field label={`Item ${i + 1} — title`} value={item.title} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.features.items[i].title = v; })} />
                <Field label={`Item ${i + 1} — body (optional)`} value={item.body ?? ""} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.features.items[i].body = v; })} />
              </div>
            ))}
          </div>

          <div className="slide-editor">
            <div className="slide-label">Slide 5 — CTA</div>
            <Field label="Headline" value={copy.slides.cta.headline} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.cta.headline = v; })} />
            <Field label="Body" value={copy.slides.cta.body} onChange={(v) => update((d) => { if (d.family === "colorBlock") d.slides.cta.body = v; })} multiline />
          </div>
        </>
      )}

      {copy.family === "tweetCard" &&
        copy.slides.map((slide, i) => (
          <div className="slide-editor" key={i}>
            <div className="slide-label">Slide {i + 1} — posts as BuckStreaming</div>
            <div className="row">
              <div style={{ flex: 1, minWidth: 120 }}>
                <Field label="Timestamp" value={slide.timestamp} onChange={(v) => update((d) => { if (d.family === "tweetCard") d.slides[i].timestamp = v; })} />
              </div>
            </div>
            <Field label="Tweet body" value={slide.body} onChange={(v) => update((d) => { if (d.family === "tweetCard") d.slides[i].body = v; })} multiline />
            <div className="row">
              <div style={{ flex: 1, minWidth: 100 }}>
                <Field label="Comments" value={slide.comments} onChange={(v) => update((d) => { if (d.family === "tweetCard") d.slides[i].comments = v; })} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <Field label="Reposts" value={slide.reposts} onChange={(v) => update((d) => { if (d.family === "tweetCard") d.slides[i].reposts = v; })} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <Field label="Likes" value={slide.likes} onChange={(v) => update((d) => { if (d.family === "tweetCard") d.slides[i].likes = v; })} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <Field label="Bookmarks" value={slide.bookmarks} onChange={(v) => update((d) => { if (d.family === "tweetCard") d.slides[i].bookmarks = v; })} />
              </div>
            </div>
          </div>
        ))}

      {copy.family === "photoBubble" &&
        copy.slides.map((slide, i) => (
          <div className="slide-editor" key={i}>
            <div className="slide-label">Slide {i + 1}</div>
            <Field label="Bubble text" value={slide.bubbleText} onChange={(v) => update((d) => { if (d.family === "photoBubble") d.slides[i].bubbleText = v; })} multiline />
          </div>
        ))}

      {copy.family === "textPost" &&
        copy.slides.map((slide, i) => (
          <div className="slide-editor" key={i}>
            <div className="slide-label">Slide {i + 1}</div>
            <Field label="Post text (blank line = new paragraph)" value={slide.text} onChange={(v) => update((d) => { if (d.family === "textPost") d.slides[i].text = v; })} multiline />
          </div>
        ))}

      <div className="slide-editor">
        <div className="slide-label">Caption &amp; first comment</div>
        <Field label="Caption" value={copy.caption.caption} onChange={(v) => update((d) => { d.caption.caption = v; })} multiline />
        <Field label="First comment (link goes here)" value={copy.caption.firstComment} onChange={(v) => update((d) => { d.caption.firstComment = v; })} multiline />
      </div>
    </div>
  );
}
