/** Illustration de marque en CSS/SVG (aucune image produit fictive). */
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden>
      <div className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-electric-500/40 via-night-800 to-night-900 shadow-[0_40px_80px_-30px_rgb(31_107_255/0.6)]" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="route" x1="0" x2="1">
            <stop offset="0" stopColor="#FF7A1A" />
            <stop offset="1" stopColor="#1F6BFF" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="130" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1" />
        <circle cx="200" cy="200" r="95" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1" />
        <path d="M70 280 C 130 120, 270 120, 330 200" fill="none" stroke="url(#route)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 12" className="[animation:dash_6s_linear_infinite]" />
        <circle cx="70" cy="280" r="9" fill="#FF7A1A" />
        <circle cx="330" cy="200" r="9" fill="#1F6BFF" />
        <g transform="translate(150 150)">
          <rect width="100" height="100" rx="18" fill="#FF7A1A" />
          <path d="M0 34h100M50 0v34" stroke="#fff" strokeOpacity=".55" strokeWidth="6" />
          <rect x="18" y="56" width="40" height="8" rx="4" fill="#fff" fillOpacity=".85" />
          <rect x="18" y="72" width="26" height="8" rx="4" fill="#fff" fillOpacity=".55" />
        </g>
      </svg>
      <style>{`@keyframes dash { to { stroke-dashoffset: -220; } }`}</style>
    </div>
  );
}
