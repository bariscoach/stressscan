'use client';

import { useEffect, useRef, useState } from 'react';
import { MoodTag, MOOD_COLORS, getScoreColor } from '@/lib/types';

interface Props {
  score: number;
  moodTag: MoodTag | null;
}

const RADIUS = 58;
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
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = end;
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

export default function StressMeter({ score, moodTag }: Props) {
  const display = useCountUp(score);
  const color = getScoreColor(score || 0);
  const dashOffset = score > 0 ? CIRCUMFERENCE - (score / 10) * CIRCUMFERENCE : CIRCUMFERENCE;

  return (
    <div
      className="glass p-5 flex flex-col items-center gap-4"
      style={{ borderTop: `1px solid rgba(0,204,255,0.2)` }}
    >
      <div
        className="text-xs font-mono uppercase tracking-widest w-full"
        style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em' }}
      >
        Stress Level
      </div>

      {/* Arc + number */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Track */}
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          {/* Progress */}
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 80 80)"
            style={{
              transition: 'stroke-dashoffset 0.5s ease, stroke 0.4s ease',
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="flex flex-col items-center z-10">
          <span
            key={display}
            className="font-mono font-semibold leading-none"
            style={{
              fontSize: 72,
              color: score > 0 ? color : 'rgba(255,255,255,0.15)',
              transition: 'color 0.4s ease',
              lineHeight: 1,
              textShadow: score > 0 ? `0 0 20px ${color}40` : 'none',
            }}
          >
            {score > 0 ? display : '—'}
          </span>
          <span
            className="text-xs font-mono"
            style={{ color: 'rgba(255,255,255,0.2)', marginTop: 2 }}
          >
            / 10
          </span>
        </div>
      </div>

      {/* Mood badge */}
      {moodTag ? (
        <div
          className="px-4 py-1.5 font-mono text-xs font-medium"
          style={{
            borderRadius: 999,
            background: `${MOOD_COLORS[moodTag]}18`,
            border: `1px solid ${MOOD_COLORS[moodTag]}40`,
            color: MOOD_COLORS[moodTag],
            transition: 'all 0.3s ease',
            letterSpacing: '0.06em',
          }}
        >
          {moodTag}
        </div>
      ) : (
        <div
          className="px-4 py-1.5 font-mono text-xs"
          style={{
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          Awaiting scan…
        </div>
      )}
    </div>
  );
}
