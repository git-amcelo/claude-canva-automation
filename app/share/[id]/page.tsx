import type { Metadata } from "next";
import { getBundle } from "@/lib/share/store";
import SaveAllButton from "./SaveAllButton";
import CopyButton from "./CopyButton";
import "./share.css";

export const runtime = "nodejs";
// Always read the current bundle — a link opened after cleanup must show the
// expiry notice, not a cached gallery.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your carousel — BUCK",
  // This page is a private hand-off to the user's own phone, never a public page.
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await getBundle(id);

  if (!bundle || bundle.expiresAt <= Date.now()) {
    return (
      <main className="share-wrap">
        <div className="share-empty">
          <h1>This link has expired</h1>
          <p>Share links last a limited time. Open the generator again and create a new one.</p>
        </div>
      </main>
    );
  }

  const expires = new Date(bundle.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <main className="share-wrap">
      <header className="share-head">
        <h1>Your carousel</h1>
        <p>
          {bundle.images.length} slide{bundle.images.length === 1 ? "" : "s"} · save them, then post from the Instagram app.
        </p>
      </header>

      <SaveAllButton images={bundle.images} />

      <p className="share-hint">
        If saving all isn&apos;t offered, press and hold any slide below and choose <strong>Save to Photos</strong>.
      </p>

      <ol className="share-slides">
        {bundle.images.map((src, i) => (
          <li key={src}>
            {/* Plain img, not next/image: these must stay untouched full-resolution
                files so what reaches the camera roll is exactly what was exported. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Slide ${i + 1}`} />
            <span className="share-slide-idx">{i + 1}</span>
          </li>
        ))}
      </ol>

      {bundle.caption && (
        <section className="share-text">
          <h2>Caption</h2>
          <p>{bundle.caption}</p>
          <CopyButton value={bundle.caption} label="Copy caption" />
        </section>
      )}

      {bundle.firstComment && (
        <section className="share-text">
          <h2>First comment</h2>
          <p>{bundle.firstComment}</p>
          <CopyButton value={bundle.firstComment} label="Copy first comment" />
          <span className="share-note">Paste this as the first comment — Instagram captions can&apos;t have clickable links.</span>
        </section>
      )}

      <footer className="share-foot">Link expires {expires}</footer>
    </main>
  );
}
