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
    const t = setTimeout(() => setAnimating(false), 4500);
    return () => clearTimeout(t);
  }, [nudgeKey, nudge]);

  return (
    <div
      className="card p-5"
      style={{ borderLeft: '3px solid #0ea5e9' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#f0f9ff' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a7 7 0 0 1 7 7c0 3.5-2 5.5-2 8H7c0-2.5-2-4.5-2-8a7 7 0 0 1 7-7z" />
            <path d="M9 21h6M12 21v-4" />
          </svg>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9ca3af', letterSpacing: '0.1em' }}>
          Grounding Tip
        </span>
      </div>

      {nudge ? (
        <p
          key={nudgeKey}
          className={`text-sm leading-relaxed ${animating ? 'animate-nudge-pulse' : ''}`}
          style={{ color: '#374151', fontStyle: 'italic' }}
        >
          "{nudge}"
        </p>
      ) : (
        <p className="text-sm" style={{ color: '#d1d5db', fontStyle: 'italic' }}>
          A grounding tip will appear after your first scan…
        </p>
      )}
    </div>
  );
}
