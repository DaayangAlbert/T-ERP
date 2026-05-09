export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect fill="url(#logo-grad)" x="6" y="14" width="52" height="11" rx="2" />
      <rect fill="url(#logo-grad)" x="14" y="29" width="36" height="11" rx="2" />
      <rect fill="url(#logo-grad)" x="22" y="44" width="20" height="11" rx="2" />
    </svg>
  );
}
