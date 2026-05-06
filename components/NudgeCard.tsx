'use client';

import { useEffect, useState } from 'react';

interface Props {
  nudge: string | null;
  nudgeKey: number;
}

export default function NudgeCard({ nudge, nudgeKey }: Props) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!nudge) return;
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 4200); // 2s x 3 iterations ≈ but we cap
    return () => clearTimeout(t);
  }, [nudgeKey, nudge]);

  return (
    <div
      className="glass p-4 relative overflow-hidden"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderLeft: '2px solid rgba(0,204,255,0.4)',
      }}
    >
      <div
        className="text-xs font-mono uppercase tracking-widest mb-2"
        style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em' }}
      >
        Grounding Tip
      </div>

      {nudge ? (
        <p
          key={nudgeKey}
          className={`text-sm italic leading-relaxed ${animating ? 'animate-nudge-pulse' : ''}`}
          style={{
            color: 'rgba(255,255,255,0.72)',
            fontStyle: 'italic',
          }}
        >
          {nudge}
        </p>
      ) : (
        <p
          className="text-sm"
          style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}
        >
          Tip will appear after first scan…
        </p>
      )}

      {/* Accent glow */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{
          background: 'linear-gradient(180deg, transparent, #00CCFF, transparent)',
          opacity: 0.5,
        }}
      />
    </div>
  );
}
