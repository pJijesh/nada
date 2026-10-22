/* Hand-drawn style SVG ornaments. Simple shapes on purpose: they can be replaced with real artwork later. */

export function Lotus({ size = 90, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size * 0.7} viewBox="0 0 120 84" aria-hidden="true">
      <ellipse cx="60" cy="74" rx="52" ry="8" fill="var(--green)" opacity="0.25" />
      <g stroke="#B5547A" strokeWidth="1.2" fill="#F6C6D6">
        <path d="M60 70 C40 62 30 40 44 22 C52 36 58 50 60 70Z" />
        <path d="M60 70 C80 62 90 40 76 22 C68 36 62 50 60 70Z" />
        <path d="M60 70 C30 66 14 50 18 34 C34 40 52 52 60 70Z" fill="#F9D5E1" />
        <path d="M60 70 C90 66 106 50 102 34 C86 40 68 52 60 70Z" fill="#F9D5E1" />
        <path d="M60 70 C46 56 46 30 60 10 C74 30 74 56 60 70Z" fill="#FBE3EB" />
      </g>
      <circle cx="60" cy="62" r="3" fill="#E7B53C" />
    </svg>
  );
}

export function Diya({ size = 70, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size * 1.25} viewBox="0 0 80 100" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="50%">
          <stop offset="0" stopColor="#FFE9A6" stopOpacity="0.9" /><stop offset="1" stopColor="#FFE9A6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="30" r="26" fill="url(#glow)" />
      <path d="M40 10 C48 20 48 32 40 38 C32 32 32 20 40 10Z" fill="#F2A33A" />
      <path d="M40 20 C44 26 44 32 40 35 C36 32 36 26 40 20Z" fill="#FFE08A" />
      <path d="M12 48 C14 64 28 72 40 72 C52 72 66 64 68 48 C56 54 24 54 12 48Z" fill="#C79A2E" stroke="#8B6A17" strokeWidth="1.2" />
      <rect x="32" y="72" width="16" height="6" fill="#B38622" />
      <rect x="24" y="78" width="32" height="6" rx="2" fill="#C79A2E" stroke="#8B6A17" strokeWidth="1.2" />
    </svg>
  );
}

export function Sprig({ size = 80, flip = false, className }: { size?: number; flip?: boolean; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M12 74 C20 50 34 30 62 8" stroke="var(--green)" strokeWidth="2" fill="none" opacity="0.7" />
      {[[22, 56, -30], [30, 44, -20], [40, 32, -10], [50, 20, 0], [58, 12, 10]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="9" ry="4" transform={`rotate(${-40 + r} ${x} ${y})`} fill="var(--green)" opacity={0.35 + i * 0.07} />
      ))}
    </svg>
  );
}

/** Soft wave band used above the page footer. */
export function WaveBand() {
  return (
    <svg viewBox="0 0 1200 60" preserveAspectRatio="none" width="100%" height="40" aria-hidden="true" style={{ display: 'block', marginTop: 40 }}>
      <path d="M0 30 C150 5 300 55 450 30 S750 5 900 30 S1100 50 1200 25 V60 H0Z" fill="var(--navy)" opacity="0.14" />
      <path d="M0 40 C200 20 350 60 600 38 S950 22 1200 42 V60 H0Z" fill="var(--navy)" opacity="0.22" />
    </svg>
  );
}
