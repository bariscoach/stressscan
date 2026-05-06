'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { AnalysisResult, Signal, SIGNAL_COLORS, SignalType, getScoreColor } from '@/lib/types';

interface Props {
  scanInterval: number;
  isPaused: boolean;
  isLimitReached: boolean;
  onAnalysis: (result: AnalysisResult) => void;
  onLimitReached: () => void;
  onError: (msg: string) => void;
}

type ScanStatus = 'idle' | 'initiating' | 'analyzing' | 'complete';

const SCAN_TIMEOUT_MS = 7000;

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  if ((ctx as unknown as { roundRect?: unknown }).roundRect) {
    (ctx as unknown as { roundRect: Function }).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  color: string,
  W: number
) {
  ctx.font = '11px "JetBrains Mono", monospace';
  const metrics = ctx.measureText(text);
  const padX = 6; const padY = 4;
  const lblW = metrics.width + padX * 2;
  const lblH = 19;
  const lblX = Math.min(x, W - lblW - 2);
  const lblY = Math.max(y - lblH - 4, 2);

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  drawRoundRect(ctx, lblX, lblY, lblW, lblH, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, lblX + padX, lblY + lblH - padY - 1);
}

function drawSignal(
  ctx: CanvasRenderingContext2D,
  signal: Signal,
  W: number, H: number,
  opacity: number
) {
  const { type, severity, label, region } = signal;
  const color = SIGNAL_COLORS[type as SignalType] ?? '#FFFFFF';
  const rx = region.x * W;
  const ry = region.y * H;
  const rw = region.w * W;
  const rh = region.h * H;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'spine': {
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(rx + rw / 2, ry);
      ctx.lineTo(rx + rw / 2, ry + rh);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'shoulder': {
      const thickness = Math.max(1, Math.min(8, (severity / 10) * 7 + 1));
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(rx, ry + rh / 2);
      ctx.lineTo(rx + rw, ry + rh / 2);
      ctx.stroke();
      break;
    }
    case 'neck': {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx, ry + rh);
      ctx.lineTo(rx + rw, ry);
      ctx.stroke();
      break;
    }
    case 'brow': {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx + rw / 2, ry + rh, rw / 2, Math.PI, 0, false);
      ctx.stroke();
      break;
    }
    case 'jaw': {
      ctx.lineWidth = 2;
      const bs = Math.min(20, rw * 0.25, rh * 0.25);
      ctx.beginPath();
      ctx.moveTo(rx + bs, ry); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry + bs);
      ctx.moveTo(rx + rw - bs, ry); ctx.lineTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + bs);
      ctx.moveTo(rx, ry + rh - bs); ctx.lineTo(rx, ry + rh); ctx.lineTo(rx + bs, ry + rh);
      ctx.moveTo(rx + rw - bs, ry + rh); ctx.lineTo(rx + rw, ry + rh); ctx.lineTo(rx + rw, ry + rh - bs);
      ctx.stroke();
      break;
    }
    case 'hands': {
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);
      break;
    }
  }

  ctx.shadowBlur = 0;

  // Label + severity number
  const severityPct = Math.round(severity * 10);
  const fullLabel = `${label}  ${severity.toFixed(1)} · ${severityPct}%`;
  drawLabel(ctx, fullLabel, rx, ry, color, W);

  ctx.restore();
}

function drawDataHUD(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  stressScore: number,
  moodTag: string,
  signalCount: number,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;

  const rows = [
    { label: 'STRESS', value: `${stressScore}  / 10`, color: getScoreColor(stressScore) },
    { label: 'MOOD  ', value: moodTag.toUpperCase(), color: 'rgba(255,255,255,0.7)' },
    { label: 'SIGNALS', value: `${signalCount} DETECTED`, color: '#00CCFF' },
  ];

  const lineH = 18;
  const padX = 10;
  const padY = 8;
  const boxW = 190;
  const boxH = rows.length * lineH + padY * 2;
  const bx = 12;
  const by = H - boxH - 12;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  drawRoundRect(ctx, bx, by, boxW, boxH, 6);
  ctx.fill();

  // Left accent bar
  ctx.fillStyle = '#00CCFF';
  drawRoundRect(ctx, bx, by, 2, boxH, 2);
  ctx.fill();

  ctx.font = '10px "JetBrains Mono", monospace';

  rows.forEach((row, i) => {
    const y = by + padY + i * lineH + 11;

    // Label (dim)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(row.label, bx + padX, y);

    // Value (colored)
    ctx.fillStyle = row.color;
    ctx.fillText(row.value, bx + padX + 68, y);
  });

  // Timestamp
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText(ts, bx + padX, by + boxH + 10);

  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CameraView({
  scanInterval,
  isPaused,
  isLimitReached,
  onAnalysis,
  onLimitReached,
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraError, setCameraError] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const rafRef = useRef<number | null>(null);
  const signalsRef = useRef<Signal[]>([]);
  const hudDataRef = useRef<{ score: number; mood: string; count: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // ── Camera init
  useEffect(() => {
    mountedRef.current = true;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } })
      .then((s) => {
        stream = s;
        if (videoRef.current && mountedRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => { if (mountedRef.current) setCameraError(true); });
    return () => {
      mountedRef.current = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Canvas sizing
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }, []);

  useEffect(() => {
    syncCanvasSize();
    const ro = new ResizeObserver(syncCanvasSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [syncCanvasSize]);

  // ── Draw frame
  const drawFrame = useCallback((opacity: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const signal of signalsRef.current) {
      if (!signal.detected) continue;
      drawSignal(ctx, signal, canvas.width, canvas.height, opacity);
    }

    if (hudDataRef.current && opacity > 0.1) {
      drawDataHUD(
        ctx,
        canvas.width, canvas.height,
        hudDataRef.current.score,
        hudDataRef.current.mood,
        hudDataRef.current.count,
        opacity
      );
    }
  }, []);

  // ── Animate overlay in
  const animateOverlay = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();
    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / 300, 1);
      drawFrame(progress);
      if (progress < 1) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [drawFrame]);

  // ── Capture + analyze
  const captureAndAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || !mountedRef.current) return;

    // Initiation flash
    setScanStatus('initiating');
    await new Promise((r) => setTimeout(r, 600));
    if (!mountedRef.current) return;

    setScanStatus('analyzing');

    // Capture frame
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    offscreen.getContext('2d')!.drawImage(video, 0, 0);
    const base64 = offscreen.toDataURL('image/jpeg', 0.8).split(',')[1];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!mountedRef.current) return;

      const data = await res.json();

      if (data.error === 'limit_reached') {
        onLimitReached();
        setScanStatus('idle');
        return;
      }
      if (data.error) {
        onError('Analysis error — skipping frame.');
        setScanStatus('idle');
        return;
      }

      // Update canvas data
      const detected = (data.signals ?? []).filter((s: Signal) => s.detected);
      signalsRef.current = detected;
      hudDataRef.current = {
        score: data.stress_score ?? 0,
        mood: data.mood_tag ?? '—',
        count: detected.length,
      };
      syncCanvasSize();
      animateOverlay();

      onAnalysis(data as AnalysisResult);

      setScanStatus('complete');
      await new Promise((r) => setTimeout(r, 2200));
      if (mountedRef.current) setScanStatus('idle');

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      onError(isAbort ? 'Scan timed out (7s). Try again.' : 'Network error. Check your connection.');
      setScanStatus('idle');
    }
  }, [onAnalysis, onLimitReached, onError, animateOverlay, syncCanvasSize]);

  // ── Scan interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPaused || isLimitReached) return;

    intervalRef.current = setInterval(() => {
      // Don't stack scans
      if (scanStatus !== 'idle') return;
      captureAndAnalyze();
    }, scanInterval * 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [scanInterval, isPaused, isLimitReached, captureAndAnalyze, scanStatus]);

  // ── Camera error
  if (cameraError) {
    return (
      <div className="glass flex flex-col items-center justify-center gap-4 text-center"
        style={{ aspectRatio: '16/9', maxWidth: 900, width: '100%' }}>
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14m0 0V8m0 6H7a2 2 0 01-2-2V8a2 2 0 012-2h8m0 8v-8" />
          <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
        <div>
          <p className="text-base font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Camera access denied
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Allow camera permissions in your browser settings,<br />then reload the page.
          </p>
        </div>
      </div>
    );
  }

  const isScanning = scanStatus === 'analyzing';

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        width: '100%',
        maxWidth: 900,
        aspectRatio: '16/9',
        borderRadius: 12,
        border: isScanning
          ? '1px solid rgba(0,204,255,0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isScanning ? '0 0 24px rgba(0,204,255,0.18)' : 'none',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Video */}
      <video ref={videoRef} autoPlay muted playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

      {/* Canvas overlay */}
      <canvas ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      {/* Scanlines */}
      <div className="scanlines absolute inset-0" style={{ pointerEvents: 'none' }} />

      {/* Corner brackets */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
        <div key={pos}
          className={`absolute ${pos.includes('t') ? 'top-3' : 'bottom-3'} ${pos.includes('l') ? 'left-3' : 'right-3'}`}
          style={{ pointerEvents: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d={pos === 'tl' ? 'M0 8V0H8' : pos === 'tr' ? 'M16 8V0H8' : pos === 'bl' ? 'M0 8V16H8' : 'M16 8V16H8'}
              stroke="#00CCFF" strokeWidth="1.5" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* ── Status overlays ── */}

      {/* INITIATING */}
      {scanStatus === 'initiating' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00CCFF' }} />
            <span className="font-mono text-sm tracking-widest uppercase" style={{ color: '#00CCFF', letterSpacing: '0.2em' }}>
              Initiating Scan
            </span>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00CCFF', animationDelay: '0.3s' }} />
          </div>
        </div>
      )}

      {/* ANALYZING */}
      {scanStatus === 'analyzing' && (
        <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-4 gap-2" style={{ pointerEvents: 'none' }}>
          {/* Top scanning bar */}
          <div style={{ width: '90%', height: 2, background: 'rgba(0,204,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, transparent, #00CCFF, transparent)',
              animation: 'scan-sweep 1.4s ease-in-out infinite',
              width: '40%',
            }} />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 font-mono text-xs"
            style={{ background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.25)', borderRadius: 999, color: '#00CCFF' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00CCFF' }} />
            ANALYZING · {SCAN_TIMEOUT_MS / 1000}s MAX
          </div>
        </div>
      )}

      {/* Scanning pulse border */}
      {isScanning && (
        <div className="absolute inset-0 animate-pulse-border" style={{ borderRadius: 12, pointerEvents: 'none' }} />
      )}

      {/* COMPLETE */}
      {scanStatus === 'complete' && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-2 px-5 py-2.5 font-mono text-sm animate-fade-in-up"
            style={{
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.3)',
              borderRadius: 999,
              color: '#00FF88',
              letterSpacing: '0.1em',
              boxShadow: '0 0 20px rgba(0,255,136,0.15)',
            }}>
            ✓ SCAN COMPLETE
          </div>
        </div>
      )}

      {/* LIMIT REACHED */}
      {isLimitReached && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
          style={{ background: 'rgba(7,7,15,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div style={{ color: '#00CCFF', fontSize: 40 }}>⏹</div>
          <p className="font-mono text-base font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            100 scan limit reached.
          </p>
          <p className="text-sm max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            This limit exists to control API costs on this demo.
          </p>
        </div>
      )}
    </div>
  );
}
