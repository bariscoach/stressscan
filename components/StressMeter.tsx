'use client';

import { useEffect, useRef, useState } from 'react';
import { MoodTag, MOOD_COLORS, getScoreColor } from '@/lib/types';

interface Props {
  score: number;
  moodTag: MoodTag | null;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function useCountUp(target: number, duration = 500) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === prevRef.current) return;
    const start = prevRef.current;
    const end = target;
    const startTime = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const animate = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
      else prevRef.current = end;
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

const MOOD_BG: Record<MoodTag, string> = {
  Calm: '#f0fdf4',
  Focused: '#fefce8',
  Tense: '#fff7ed',
  Overloaded: '#fef2f2',
};

const MOOD_BORDER: Record<MoodTag, string> = {
  Calm: '#bbf7d0',
  Focused: '#fef08a',
  Tense: '#fed7aa',
  Overloaded: '#fecaca',
};

export default function StressMeter({ score, moodTag }: Props) {
  const display = useCountUp(score);
  const color = score > 0 ? getScoreColor(score) : '#e5e7eb';
  const dashOffset = score > 0 ? CIRCUMFERENCE - (score / 10) * CIRCUMFERENCE : CIRCUMFERENCE;

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9ca3af', letterSpacing: '0.1em' }}>
          Stress Level
        </span>
        {moodTag && (
          <span
            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{
              background: MOOD_BG[moodTag],
              color: MOOD_COLORS[moodTag],
              border: `1px solid ${MOOD_BORDER[moodTag]}`,
            }}
          >
            {moodTag}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* Arc */}
        <div className="relative flex-shrink-0" style={{ width: 130, height: 130 }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ position: 'absolute' }}>
            <circle cx="65" cy="65" r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth="7" />
            <circle
              cx="65" cy="65" r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 65 65)"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 200,
                fontSize: 52,
                lineHeight: 1,
                color: score > 0 ? color : '#d1d5db',
                transition: 'color 0.4s ease',
                letterSpacing: '-0.03em',
              }}
            >
              {score > 0 ? display : '—'}
            </span>
            <span className="text-xs font-mono mt-0.5" style={{ color: '#d1d5db' }}>/ 10</span>
          </div>
        </div>

        {/* Score scale */}
        <div className="flex flex-col gap-1.5 flex-1">
          {[
            { label: 'Relaxed', range: '1–3', color: '#10b981' },
            { label: 'Focused', range: '4–6', color: '#f59e0b' },
            { label: 'Tense',   range: '7–8', color: '#f97316' },
            { label: 'Critical',range: '9–10',color: '#ef4444' },
          ].map(({ label, range, color: c }) => {
            const [lo, hi] = range.split('–').map(Number);
            const active = score >= lo && score <= hi;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: active ? c : '#e5e7eb' }}
                />
                <span className="text-xs flex-1" style={{ color: active ? '#374151' : '#9ca3af', fontWeight: active ? 600 : 400 }}>
                  {label}
                </span>
                <span className="text-xs font-mono" style={{ color: active ? c : '#d1d5db' }}>
                  {range}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      {score > 0 && (
        <div style={{ height: 4, borderRadius: 2, background: '#f3f4f6', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${score * 10}%`,
            background: `linear-gradient(90deg, #10b981, ${color})`,
            borderRadius: 2,
            transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
      )}
    </div>
  );
}
