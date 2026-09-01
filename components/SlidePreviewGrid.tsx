"use client";

export interface RenderedSlide {
  index: number;
  base64: string | null;
  loading: boolean;
}

export default function SlidePreviewGrid({
  slides,
  onRegenerate,
}: {
  slides: RenderedSlide[];
  onRegenerate: (index: number) => void;
}) {
  return (
    <div className="preview-grid">
      {slides
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((slide) => (
          <div className="preview-tile" key={slide.index}>
            {slide.loading ? (
              <div
                style={{
                  aspectRatio: "1080 / 1350",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-dim)",
                  fontSize: 12,
                }}
              >
                <span className="spinner" /> rendering…
              </div>
            ) : slide.base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`data:image/png;base64,${slide.base64}`} alt={`Slide ${slide.index + 1}`} />
            ) : null}
            <div className="tile-footer">
              <span className="idx">Slide {slide.index + 1}</span>
              <span className="tile-actions">
                {slide.base64 && (
                  <a
                    className="btn secondary small"
                    href={`data:image/png;base64,${slide.base64}`}
                    download={`slide-${slide.index + 1}.png`}
                  >
                    Export
                  </a>
                )}
                <button className="btn secondary small" onClick={() => onRegenerate(slide.index)} disabled={slide.loading}>
                  Regenerate
                </button>
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
