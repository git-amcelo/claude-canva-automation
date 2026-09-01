// Inline mirrors of assets/icons/*.svg (the ones the server render uses) —
// kept as plain SVG here instead of fetched files so the live canvas never
// has an extra network round-trip while editing.

export function CommentIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5C4 4.67157 4.67157 4 5.5 4H18.5C19.3284 4 20 4.67157 20 5.5V15.5C20 16.3284 19.3284 17 18.5 17H9L5 20.5V17H5.5C4.67157 17 4 16.3284 4 15.5V5.5Z"
        stroke="#536471"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RetweetIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 7H15.5C17.433 7 19 8.567 19 10.5V13" stroke="#536471" strokeWidth={1.7} strokeLinecap="round" />
      <path d="M8.5 4.5L6 7L8.5 9.5" stroke="#536471" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 17H8.5C6.567 17 5 15.433 5 13.5V11" stroke="#536471" strokeWidth={1.7} strokeLinecap="round" />
      <path d="M15.5 14.5L18 17L15.5 19.5" stroke="#536471" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20.2C12 20.2 4 15.6 4 9.9C4 7.2 6.1 5 8.7 5C10.1 5 11.3 5.7 12 6.7C12.7 5.7 13.9 5 15.3 5C17.9 5 20 7.2 20 9.9C20 15.6 12 20.2 12 20.2Z"
        fill="#F91880"
      />
    </svg>
  );
}

export function BookmarkIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6.5 4.5H17.5V20L12 16.5L6.5 20V4.5Z" stroke="#536471" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

export function ShareIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5V5" stroke="#536471" strokeWidth={1.7} strokeLinecap="round" />
      <path d="M8 8.5L12 4.5L16 8.5" stroke="#536471" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5.5 12.5V18.5C5.5 19.0523 5.94772 19.5 6.5 19.5H17.5C18.0523 19.5 18.5 19.0523 18.5 18.5V12.5"
        stroke="#536471"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
