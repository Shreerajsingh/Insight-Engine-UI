// Colours are intentionally hardcoded, not tokenised: the mark must not restyle with the theme.
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

        <linearGradient id="mi-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a8cf7" />
          <stop offset="1" stopColor="#0b57d0" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#mi-tile)" />

      <path
        d="M10 6.5h12.5a3.5 3.5 0 0 1 3.5 3.5v8a3.5 3.5 0 0 1-3.5 3.5h-6.6l-4.2 3.9a1 1 0 0 1-1.7-.73V21.5H10A3.5 3.5 0 0 1 6.5 18v-8A3.5 3.5 0 0 1 10 6.5Z"
        fill="#ffffff"
      />

      <rect x="10.9" y="14" width="2.6" height="4.2" rx="1.3" fill="#0b57d0" />
      <rect x="14.9" y="12" width="2.6" height="6.2" rx="1.3" fill="#1b6ef3" />
      <rect x="18.9" y="9.8" width="2.6" height="8.4" rx="1.3" fill="#0b57d0" />
    </svg>
  );
}
