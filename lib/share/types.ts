/** One carousel bundle, shared to a phone via a link + QR. */
export interface ShareBundle {
  id: string;
  /** Slide images in order, as public URLs or share-route paths. */
  images: string[];
  caption: string;
  firstComment: string;
  /** Epoch ms. Past this the bundle is deleted by the cleanup route. */
  expiresAt: number;
  createdAt: number;
}

/** Days a share link stays alive before cleanup removes it. */
export const SHARE_TTL_DAYS = Number(process.env.SHARE_TTL_DAYS || 7);
