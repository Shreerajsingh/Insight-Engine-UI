/**
 * The app's mark: a conversation with a chart inside it.
 *
 * The tile was a generic Material grid glyph before, which is the icon a hundred dashboards use and
 * says nothing about this one. The two things this product actually is are a meeting and the
 * numbers pulled out of it, so the mark is a speech bubble with bars rising inside it — legible at
 * 26px in the bar, and the same drawing serves as the favicon.
 *
 * Its colours are fixed rather than tokenised. A logo that restyles itself with the theme is not a
 * logo; the blue stays the blue in both, and the white bubble carries enough contrast against it
 * either way.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Meeting Intelligence"
      focusable="false"
    >
      <defs>
        {/* Top-left to bottom-right, so the tile reads as lit from the same place as every other
            elevated surface in the app. */}
        <linearGradient id="mi-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a8cf7" />
          <stop offset="1" stopColor="#0b57d0" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#mi-tile)" />

      {/* The bubble, with its tail at the lower left — the direction a reply comes from. */}
      <path
        d="M10 6.5h12.5a3.5 3.5 0 0 1 3.5 3.5v8a3.5 3.5 0 0 1-3.5 3.5h-6.6l-4.2 3.9a1 1 0 0 1-1.7-.73V21.5H10A3.5 3.5 0 0 1 6.5 18v-8A3.5 3.5 0 0 1 10 6.5Z"
        fill="#ffffff"
      />

      {/* Three bars, ascending, sitting on a shared baseline inside the bubble. */}
      <rect x="10.9" y="14" width="2.6" height="4.2" rx="1.3" fill="#0b57d0" />
      <rect x="14.9" y="12" width="2.6" height="6.2" rx="1.3" fill="#1b6ef3" />
      <rect x="18.9" y="9.8" width="2.6" height="8.4" rx="1.3" fill="#0b57d0" />
    </svg>
  );
}
