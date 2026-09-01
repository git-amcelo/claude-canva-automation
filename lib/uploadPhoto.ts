import { resizeImageForUpload } from "@/lib/clientImage";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Thrown for problems worth showing the user verbatim (wrong format, too big, etc.). */
export class PhotoUploadError extends Error {}

/**
 * Validates, downscales and uploads one photo, returning the data URL the
 * templates render. Shared by the upload panel and click-to-replace on the
 * canvas so both paths enforce the same rules.
 */
export async function uploadPhotoFile(file: File, crop?: { x: number; y: number; width: number; height: number }): Promise<string> {
  const isHeic = /\.hei[cf]$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
  if (isHeic) {
    throw new PhotoUploadError(
      'HEIC photos (the default iPhone format) aren\'t supported. On your iPhone, when sharing/exporting the photo, choose "Most Compatible" (JPEG), or convert it first, then upload again.'
    );
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new PhotoUploadError(`Unsupported file type "${file.type || "unknown"}". Please upload JPEG, PNG, or WebP photos.`);
  }

  // Downscale before sending — keeps the request well under the hosting
  // platform's body-size limit; we only ever need ~1080x1350 for the render.
  const resized = await resizeImageForUpload(file);
  const formData = new FormData();
  formData.append("photo", resized, "photo.jpg");
  if (crop) formData.append("crop", JSON.stringify(crop));

  const res = await fetch("/api/upload-photo", { method: "POST", body: formData });
  const json = await res.json();
  if (!res.ok) throw new PhotoUploadError(json.error || "Upload failed.");
  return json.photoDataUrl as string;
}

/**
 * Opens the OS file picker and resolves with the chosen files (empty if the
 * user cancels). Files rather than uploads, because each one goes through the
 * crop dialog before it's sent. Used by the canvas's "+" tile and
 * click-to-replace, which have no visible file input of their own.
 */
export function pickPhotoFiles(options: { multiple?: boolean } = {}): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.multiple = !!options.multiple;
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      input.remove();
      resolve(files);
    });

    // Cancelling the dialog fires no event in most browsers; this cleans up
    // the orphaned input once focus returns without a selection.
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (document.body.contains(input) && (input.files?.length ?? 0) === 0) {
            input.remove();
            resolve([]);
          }
        }, 500);
      },
      { once: true }
    );

    input.click();
  });
}
