export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

export const BRAND = {
  orange: "#E24C39",
  orangeLight: "#F2825A",
  black: "#0B0B0B",
  olive: "#C9C93B",
  cream: "#FAF3E3",
  white: "#FFFFFF",
};

export const COLOR_BLOCK_PAGE_BG = [
  BRAND.black, // 1: hook
  BRAND.olive, // 2: problem
  BRAND.black, // 3: fix
  BRAND.cream, // 4: features
  BRAND.orange, // 5: cta
] as const;

export const TWEET_CARD_BG = {
  neutral: { base: "#6EC6F1", diagonal: "#1B75C4" },
  branded: { base: BRAND.orangeLight, diagonal: BRAND.orange },
} as const;

export const PHOTO_BUBBLE_COLOR = {
  neutral: { bubble: BRAND.white, text: "#000000" },
  branded: { bubble: BRAND.orange, text: BRAND.white },
} as const;

export const EYEBROW_LABEL = "BUCKSTREAMING.COM";

/** The tweet template always posts as the brand — never model-generated. */
export const TWEET_NAME = "BuckStreaming";
export const TWEET_HANDLE = "@buckstreaming";

export const TEXT_POST = {
  bg: BRAND.white,
  ink: "#0F1419",
  avatarBg: BRAND.orange,
  check: "#1DA1F2",
} as const;
