export function BrandLogo({ className = "", markOnly = false, title = "ERP" }) {
  const viewBox = markOnly ? "0 0 180 180" : "0 0 720 220";

  return (
    <svg
      aria-label={title}
      className={className}
      role="img"
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="erpBrandGradient" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#0B4DFF" />
          <stop offset="55%" stopColor="#1894FF" />
          <stop offset="100%" stopColor="#3CD7FF" />
        </linearGradient>
        <filter id="erpBrandGlow" x="-40%" y="-60%" width="180%" height="220%">
          <feGaussianBlur result="blur" stdDeviation="14" />
          <feColorMatrix
            in="blur"
            result="glow"
            type="matrix"
            values="0 0 0 0 0.07  0 0 0 0 0.48  0 0 0 0 1  0 0 0 1 0"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#erpBrandGlow)">
        <g fill="url(#erpBrandGradient)" fillOpacity="0.2" stroke="url(#erpBrandGradient)" strokeWidth="5">
          <rect x="24" y="38" width="178" height="36" rx="12" />
          <path d="M58 98h122v18c0 15-12 28-28 28H58z" />
          <path d="M74 144h82v20c0 12-10 22-22 22H96c-12 0-22-10-22-22z" />
        </g>

        {!markOnly && (
          <text
            fill="url(#erpBrandGradient)"
            fillOpacity="0.18"
            fontFamily="Arial Black, Arial, sans-serif"
            fontSize="128"
            fontWeight="900"
            letterSpacing="-4"
            stroke="url(#erpBrandGradient)"
            strokeWidth="4"
            x="250"
            y="170"
          >
            ERP
          </text>
        )}
      </g>
    </svg>
  );
}
