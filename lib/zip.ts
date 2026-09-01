import JSZip from "jszip";

export interface ZipImage {
  filename: string;
  /** base64-encoded PNG bytes, no data-URI prefix */
  base64: string;
}

/** Bundles rendered slide PNGs into a single zip Blob for download. */
export async function buildImageZip(images: ZipImage[]): Promise<Blob> {
  const zip = new JSZip();
  for (const img of images) {
    zip.file(img.filename, img.base64, { base64: true });
  }
  return zip.generateAsync({ type: "blob" });
}

/** Triggers a browser download for a Blob without needing a server round-trip. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
