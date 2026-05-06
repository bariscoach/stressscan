export type SignalType =
  | 'shoulder'
  | 'neck'
  | 'brow'
  | 'jaw'
  | 'hands'
  | 'spine'
  | 'frontalis'
  | 'periorbital'
  | 'nasolabial'
  | 'temporalis'
  | 'trapezius'
  | 'respiratory';

export type MoodTag = 'Calm' | 'Focused' | 'Tense' | 'Overloaded';

export interface SignalRegion {
  x: number; // 0-1 fraction of image width
  y: number; // 0-1 fraction of image height
  w: number; // 0-1 fraction of image width
  h: number; // 0-1 fraction of image height
}

export interface Signal {
  type: SignalType;
  severity: number; // 0-10
  detected: boolean;
  label: string;
  region: SignalRegion;
}

export interface AnalysisResult {
  stress_score: number; // 1-10
  mood_tag: MoodTag;
  nudge: string;
  signals: Signal[];
  remaining: number;
}

export const SIGNAL_COLORS: Record<SignalType, string> = {
  spine:       '#00CCFF',
  shoulder:    '#FF4444',
  neck:        '#FFAA00',
  brow:        '#FF6B00',
  jaw:         '#CC44FF',
  hands:       '#FF4488',
  frontalis:   '#FFD60A',
  periorbital: '#00E5CC',
  nasolabial:  '#FF6B35',
  temporalis:  '#B4FF39',
  trapezius:   '#FF8FBF',
  respiratory: '#74B9FF',
};

export const MOOD_COLORS: Record<MoodTag, string> = {
  Calm:       '#00CC66',
  Focused:    '#FFCC00',
  Tense:      '#FF8C00',
  Overloaded: '#FF4444',
};

export function getScoreColor(score: number): string {
  const clamp = Math.max(1, Math.min(10, score));
  if (clamp <= 3) return interpolateColor('#00FF88', '#00CC66', (clamp - 1) / 2);
  if (clamp <= 6) return interpolateColor('#FFD700', '#FF8C00', (clamp - 3) / 3);
  return interpolateColor('#FF8C00', '#FF4444', (clamp - 6) / 4);
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);
  return `rgb(${r},${g},${b})`;
}
