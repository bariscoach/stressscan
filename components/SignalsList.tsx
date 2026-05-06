'use client';

import { Signal, SIGNAL_COLORS, SignalType } from '@/lib/types';

interface Props {
  signals: Signal[];
}

const SIGNAL_LABELS: Record<SignalType, string> = {
  spine: 'Spine',
  shoulder: 'Shoulder',
  neck: 'Neck',
  brow: 'Brow',
  jaw: 'Jaw',
  hands: 'Hands',
};

export default function SignalsList({ signals }: Props) {
  const detected = signals.filter((s) => s.detected);

  return (
    <div
      className="glass p-4"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className="text-xs font-mono uppercase tracking-widest mb-3"
        style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em' }}
      >
        Signals Detected
      </div>

      {detected.length === 0 ? (
        <div
          className="text-sm py-4 text-center"
          style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}
        >
          No signals detected yet
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {detected.map((signal, i) => {
            const color = SIGNAL_COLORS[signal.type as SignalType] ?? '#FFFFFF';
            const pct = Math.round((signal.severity / 10) * 100);

            return (
              <div
                key={`${signal.type}-${i}`}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${i * 80}ms`,
                  animationFillMode: 'both',
                }}
              >
                {/* Top border line */}
                <div
                  style={{
                    height: 1,
                    background: `linear-gradient(90deg, ${color}60 0%, transparent 100%)`,
                    marginBottom: 6,
                  }}
                />
                <div className="flex items-center gap-3">
                  {/* Color dot */}
                  <div
                    className="flex-shrink-0 w-2 h-2 rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />

                  {/* Label */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-mono"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {SIGNAL_LABELS[signal.type as SignalType] ?? signal.type}
                      </span>
                      <span
                        className="text-xs font-mono ml-2 flex-shrink-0"
                        style={{ color }}
                      >
                        {signal.label}
                      </span>
                    </div>

                    {/* Severity bar */}
                    <div className="severity-bar">
                      <div
                        className="severity-fill"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}80, ${color})`,
                          boxShadow: `0 0 4px ${color}60`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Severity number */}
                  <span
                    className="text-xs font-mono flex-shrink-0 w-6 text-right"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    {signal.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
