import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#07070f',
        primary: '#00CCFF',
        shoulder: '#FF4444',
        neck: '#FFAA00',
        brow: '#FF6B00',
        jaw: '#CC44FF',
        hands: '#FF4488',
        spine: '#00CCFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};

export default config;
