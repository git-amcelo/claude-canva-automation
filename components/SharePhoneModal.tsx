"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Shows the share link as a QR code to scan with a phone, plus the raw link
 * for anywhere a camera isn't handy.
 */
export default function SharePhoneModal({
  url,
  expiresAt,
  onClose,
}: {
  url: string;
  expiresAt: number;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Rendered client-side so the URL never has to round-trip anywhere.
    QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const expires = new Date(expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="cropper-backdrop" role="dialog" aria-label="Send to phone" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cropper-head">
          <strong>Scan with your phone</strong>
          <span className="hint">Save the slides, then post from the Instagram app.</span>
        </div>

        <div className="share-qr">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code for the share link" />
          ) : (
            <span className="hint">Generating…</span>
          )}
        </div>

        <div className="share-link">
          <input type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button
            className="btn secondary small"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>

        <p className="hint share-expiry">Link works until {expires}.</p>

        <div className="cropper-actions">
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
