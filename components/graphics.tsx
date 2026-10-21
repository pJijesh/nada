import type { TaalDef } from '@/lib/content';

export function TanpuraSvg({ plucks }: { plucks: number[] }) {
  return (
    <svg viewBox="0 0 80 210" width="78" role="img" aria-label="Tanpura">
      <ellipse cx="40" cy="158" rx="33" ry="40" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.4" />
      <ellipse cx="40" cy="158" rx="33" ry="40" fill="var(--accent)" opacity="0.14" />
      <ellipse cx="40" cy="150" rx="9" ry="9" fill="none" stroke="var(--ink)" strokeWidth="0.9" opacity="0.6" />
      <rect x="35" y="8" width="10" height="112" rx="3" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.4" />
      {[[29, 20], [29, 34], [51, 27], [51, 41]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.2" fill="var(--accent)" opacity="0.85" />
      ))}
      <rect x="29" y="176" width="22" height="3" rx="1.5" fill="var(--ink)" />
      {[0, 1, 2, 3].map((i) => {
        const x = 36.5 + i * 2.5;
        return <line key={`${i}-${plucks[i]}`} x1={x} y1={14} x2={x} y2={177} className={'str' + (plucks[i] ? ' pl' : '')} />;
      })}
    </svg>
  );
}

const WCX = 95, WCY = 95, WR = 66;
function wpos(semi: number, r: number): [number, number] {
  const a = ((-90 + semi * 30) * Math.PI) / 180;
  return [WCX + r * Math.cos(a), WCY + r * Math.sin(a)];
}

export function SwaraWheel({ semis, label, sub, active, letters }: {
  semis: number[]; label: string; sub: string; active: number; letters: string[];
}) {
  const pts = semis.map((s) => wpos(s, WR).join(',')).join(' ');
  return (
    <svg viewBox="0 0 190 190" role="img" aria-label={`Swara wheel for ${label}`}>
      <circle cx={WCX} cy={WCY} r={WR} fill="none" stroke="var(--line)" strokeWidth="1.2" />
      {Array.from({ length: 12 }, (_, k) => {
        const [x, y] = wpos(k, WR);
        return <circle key={k} cx={x} cy={y} r="2.4" fill="var(--muted)" opacity="0.5" />;
      })}
      <polygon points={pts} fill="var(--accent)" fillOpacity="0.1" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.5" />
      {semis.map((s, d) => {
        const [x, y] = wpos(s, WR);
        const on = d === active;
        return (
          <g key={d}>
            <circle cx={x} cy={y} r={on ? 13 : 10.5} fill={on ? 'var(--accent)' : 'var(--card)'} stroke="var(--accent)" strokeWidth="1.6" />
            <text x={x} y={y + 3.6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={on ? 'var(--on-accent)' : 'var(--ink)'}>{letters[d]}</text>
          </g>
        );
      })}
      <text x={WCX} y={WCY + 4} textAnchor="middle" fontSize="15" fontStyle="italic" fill="var(--ink)" fontFamily="var(--display)">{label}</text>
      <text x={WCX} y={WCY + 19} textAnchor="middle" fontSize="9.5" fill="var(--muted)">{sub}</text>
    </svg>
  );
}

export function BeatRing({ taal, active }: { taal: TaalDef; active: number | null }) {
  const cx = 52, cy = 52, r = 40;
  return (
    <svg viewBox="0 0 104 104" role="img" aria-label={`${taal.name} beat ring`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" />
      {Array.from({ length: taal.beats }, (_, j) => {
        const a = ((-90 + (j * 360) / taal.beats) * Math.PI) / 180;
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        const m = taal.marks[j];
        const big = m === 'x' || m === 'c';
        const hollow = m === '0' || m === 'w';
        const base = big ? 5.2 : m ? 4.2 : 2.6;
        return (
          <circle key={j} cx={x} cy={y} r={j === active ? base + 3 : base}
            fill={hollow ? 'var(--card)' : m ? 'var(--accent)' : 'var(--muted)'}
            stroke={m ? 'var(--accent)' : 'none'} strokeWidth="1.5" />
        );
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="var(--muted)">{active == null ? taal.beats : active + 1}</text>
    </svg>
  );
}

const GW = 300;
export function PitchGauge({ cents }: { cents: number | null }) {
  const off = cents != null && Math.abs(cents) > 30;
  return (
    <svg viewBox="0 0 300 34" role="img" aria-label="Pitch against the nearest swara, in cents">
      <rect x="0" y="14" width={GW} height="6" rx="3" fill="var(--line)" />
      <rect x={GW / 2 - (30 * GW) / 100} y="14" width={(60 * GW) / 100} height="6" rx="3" fill="var(--good)" opacity="0.35" />
      <line x1={GW / 2} y1="8" x2={GW / 2} y2="26" stroke="var(--ink)" strokeWidth="1.4" />
      {cents != null && (
        <circle cx={GW / 2 + (Math.max(-50, Math.min(50, cents)) * GW) / 100} cy="17" r="7"
          fill={off ? 'var(--warn)' : 'var(--good)'} stroke="var(--card)" strokeWidth="2" />
      )}
      <text x="2" y="33" fontSize="9.5" fill="var(--muted)">flat</text>
      <text x={GW - 2} y="33" textAnchor="end" fontSize="9.5" fill="var(--muted)">sharp</text>
    </svg>
  );
}
