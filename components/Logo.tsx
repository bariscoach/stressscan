// StressScan logo — a pulse/EEG waveform inside a rounded square
// Works at any size; default is 32px

interface Props {
  size?: number;
  variant?: 'full' | 'mark'; // full = icon + wordmark, mark = icon only
  theme?: 'light' | 'dark';
}

export default function Logo({ size = 32, variant = 'full', theme = 'light' }: Props) {
  const textColor = theme === 'dark' ? '#ffffff' : '#1a1a2e';
  const subColor  = theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#9ca3af';

  return (
    <div className="flex items-center gap-2.5" style={{ userSelect: 'none' }}>
      {/* Icon mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Rounded square background */}
        <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />

        {/* Pulse waveform: flat → spike up → flat → dip → flat */}
        <polyline
          points="4,20 10,20 13,13 16,27 19,20 23,20 26,15 29,25 32,20 36,20"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />

        {/* Small dot at peak — the "scan" indicator */}
        <circle cx="26" cy="15" r="1.8" fill="white" opacity="0.7" />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: size * 0.44,
              color: textColor,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            StressScan
          </span>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: size * 0.28,
              color: subColor,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}
          >
            Claude Vision
          </span>
        </div>
      )}
    </div>
  );
}
