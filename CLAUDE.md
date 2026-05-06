# StressScan — CLAUDE.md

## Standing Instructions

- **Auto git commit and Vercel deploy at the end of every Claude Code session.**
- Default scan interval is **5s**, configurable in the UI (5s | 10s | 15s toggles).

## Project Overview

StressScan is a Next.js 14 App Router app that uses live webcam capture + Claude Vision API
to detect physical stress/tension signals in real time, drawing a Tesla-style canvas overlay.

## Tech Stack

- **Next.js 14** (App Router, strict TypeScript)
- **Tailwind CSS** for layout/spacing
- **@anthropic-ai/sdk** for Claude Vision API calls
- **@upstash/redis** for permanent per-IP rate limiting (5 scans/IP, no TTL)
- Google Fonts: Inter (UI) + JetBrains Mono (numbers/data)

## Key Files

| Path | Purpose |
|------|---------|
| `app/api/analyze/route.ts` | POST endpoint — rate limit + Claude Vision call |
| `components/CameraView.tsx` | Webcam feed + canvas overlay + scan loop |
| `components/StressMeter.tsx` | SVG arc gauge + animated count-up |
| `components/SignalsList.tsx` | Per-signal severity rows |
| `components/NudgeCard.tsx` | Glassmorphism grounding tip card |
| `components/Controls.tsx` | Interval pills + pause + remaining counter |
| `lib/types.ts` | Shared TypeScript types |

## Environment Variables

```
ANTHROPIC_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Rate Limit Logic

- Key: `ratelimit:ip:{ip}` in Upstash Redis
- Max 5 analyses per IP, permanent (no TTL)
- Returns `{ error: "limit_reached", remaining: 0 }` at 429 when exhausted

## Canvas Overlay Signal Colors

| Signal | Color | Shape |
|--------|-------|-------|
| spine | #00CCFF cyan | vertical line |
| shoulder | #FF4444 red | horizontal line (thickness = severity) |
| neck | #FFAA00 amber | angled line |
| brow | #FF6B00 orange | arc |
| jaw | #CC44FF purple | corner brackets |
| hands | #FF4488 pink | bounding box |
