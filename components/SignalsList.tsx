'use client';

import { Signal, SIGNAL_COLORS, SignalType } from '@/lib/types';

interface Props { signals: Signal[]; }

const SIGNAL_LABELS: Record<SignalType, string> = {
  spine:       'Spine',
  shoulder:    'Shoulder',
  neck:        'Neck',
  brow:        'Brow',
  jaw:         'Jaw',
  hands:       'Hands',
  frontalis:   'Frontalis',
  periorbital: 'Periorbital',
  nasolabial:  'Nasolabial',
  temporalis:  'Temporalis',
  trapezius:   'Trapezius',
  respiratory: 'Respiratory',
};

const SIGNAL_BG: Record<SignalType, string> = {
  spine:       '#f0f9ff',
  shoulder:    '#fef2f2',
  neck:        '#fffbeb',
  brow:        '#fff7ed',
  jaw:         '#faf5ff',
  hands:       '#fdf2f8',
  frontalis:   '#fefce8',
  periorbital: '#f0fdfb',
  nasolabial:  '#fff4f0',
  temporalis:  '#f7ffe0',
  trapezius:   '#fff0f5',
  respiratory: '#f0f7ff',
};

export default function SignalsList({ signals }: Props) {
  const detected = signals.filter((s) => s.detected);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9ca3af', letterSpacing: '0.1em' }}>
          Detected Signals
        </span>
        {detected.length > 0 && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#f0f9ff', color: '#0ea5e9', border: '1px solid #bae6fd' }}
          >
            {detected.length} found
          </span>
        )}
      </div>

      {detected.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f9fafb' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: '#d1d5db' }}>No signals yet — run a scan</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {detected.map((signal, i) => {
            const color = SIGNAL_COLORS[signal.type as SignalType] ?? '#6b7280';
            const bg = SIGNAL_BG[signal.type as SignalType] ?? '#f9fafb';
            const pct = Math.round((signal.severity / 10) * 100);

            return (
              <div
                key={`${signal.type}-${i}`}
                className="animate-fade-in-up rounded-xl p-3"
                style={{ background: bg, animationDelay: `${i * 70}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                      {SIGNAL_LABELS[signal.type as SignalType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#6b7280' }}>{signal.label}</span>
                    <span className="text-xs font-mono font-semibold" style={{ color }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="severity-bar">
                  <div
                    className="severity-fill"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}80, ${color})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
