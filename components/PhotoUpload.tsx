"use client";

import { useRef, useState } from "react";
import { resizeImageForUpload } from "@/lib/clientImage";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_PHOTOS = 10;

export default function PhotoUpload({
  photos,
  onChange,
  onError,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function moveTo(from: number, to: number) {
    if (from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  async function uploadOne(file: File): Promise<string | null> {
    const isHeic = /\.hei[cf]$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
    if (isHeic) {
      onError(
        "HEIC photos (the default iPhone format) aren't supported. On your iPhone, when sharing/exporting the photo, choose \"Most Compatible\" (JPEG), or convert it first, then upload again."
      );
      return null;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError(`Unsupported file type "${file.type || "unknown"}". Please upload JPEG, PNG, or WebP photos.`);
      return null;
    }

    // Downscale before sending — keeps the request well under the hosting
    // platform's body-size limit; we only ever need ~1080x1350 for the render.
    const resized = await resizeImageForUpload(file);
    const formData = new FormData();
    formData.append("photo", resized, "photo.jpg");
    const res = await fetch("/api/upload-photo", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload failed.");
    return json.photoDataUrl as string;
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      onError(`You can upload at most ${MAX_PHOTOS} photos.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, room)) {
        const dataUrl = await uploadOne(file);
        if (dataUrl) uploaded.push(dataUrl);
      }
      if (uploaded.length > 0) onChange([...photos, ...uploaded]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      {photos.length > 0 && (
        <>
          <div className="photo-thumbs">
            {photos.map((dataUrl, i) => (
              <div
                className={`photo-thumb${dragIndex === i ? " dragging" : ""}${
                  overIndex === i && dragIndex !== null && dragIndex !== i ? " drop-target" : ""
                }`}
                key={i}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                  // Some browsers need data set for the drag to start.
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overIndex !== i) setOverIndex(i);
                }}
                onDragLeave={() => {
                  if (overIndex === i) setOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndex !== null) moveTo(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUrl} alt={`Photo ${i + 1}`} />
                <span className="photo-thumb-idx">Slide {i + 1}</span>
                <button
                  type="button"
                  className="photo-thumb-remove"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(i);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {photos.length > 1 && <div className="photo-thumbs-hint">Drag photos to reorder — order = slide order.</div>}
        </>
      )}

      <div
        className="photo-drop"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(Array.from(e.dataTransfer.files ?? []));
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        {uploading ? (
          <span>
            <span className="spinner" /> Uploading &amp; preparing photos…
          </span>
        ) : photos.length > 0 ? (
          <div>Click or drop to add more photos — they're used in order, one per slide (cycled if there are more slides than photos)</div>
        ) : (
          <div>Click or drop photos here (JPEG/PNG/WebP) — upload several and each slide gets its own photo, in order</div>
        )}
      </div>
    </div>
  );
}
