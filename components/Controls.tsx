'use client';

interface Props {
  scanInterval: number;
  isPaused: boolean;
  scansRemaining: number;
  isLimitReached: boolean;
  onIntervalChange: (interval: number) => void;
  onPauseToggle: () => void;
}

const INTERVALS = [5, 10, 15];

export default function Controls({
  scanInterval,
  isPaused,
  scansRemaining,
  isLimitReached,
  onIntervalChange,
  onPauseToggle,
}: Props) {
  const remainingColor =
    scansRemaining <= 1 ? '#FF4444' : scansRemaining <= 2 ? '#FF8C00' : 'rgba(255,255,255,0.5)';

  return (
    <div
      className="glass p-4 flex flex-col gap-3"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className="text-xs font-mono uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em' }}
      >
        Controls
      </div>

      {/* Interval row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono mr-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Interval
        </span>
        <div className="flex gap-1.5">
          {INTERVALS.map((s) => (
            <button
              key={s}
              className={`pill-toggle ${scanInterval === s ? 'active' : ''}`}
              onClick={() => onIntervalChange(s)}
              disabled={isLimitReached}
              style={{ opacity: isLimitReached ? 0.4 : 1 }}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>

      {/* Pause + remaining row */}
      <div className="flex items-center justify-between gap-3">
        <button
          className={`btn-pause ${isPaused ? 'paused' : ''}`}
          onClick={onPauseToggle}
          disabled={isLimitReached}
          style={{ opacity: isLimitReached ? 0.4 : 1 }}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Scans remaining:
          </span>
          <span
            className="text-sm font-mono font-semibold"
            style={{
              color: remainingColor,
              transition: 'color 0.3s ease',
              textShadow: scansRemaining <= 1 ? '0 0 8px #FF444466' : 'none',
            }}
          >
            {isLimitReached ? 0 : scansRemaining}
          </span>
        </div>
      </div>

      {/* Limit reached message */}
      {isLimitReached && (
        <div
          className="text-xs font-mono text-center py-1 rounded"
          style={{
            background: 'rgba(255,68,68,0.08)',
            border: '1px solid rgba(255,68,68,0.2)',
            color: '#FF4444',
            borderRadius: 8,
          }}
        >
          Scan limit reached — demo cap
        </div>
      )}
    </div>
  );
}
