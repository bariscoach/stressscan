'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { AnalysisResult, Signal, SIGNAL_COLORS, SignalType, getScoreColor } from '@/lib/types';

interface Props {
  isLimitReached: boolean;
  scansRemaining: number;
  scanHistory: number[];
  lastScore: number | null;
  userEmail: string;
  onAnalysis: (result: AnalysisResult) => void;
  onLimitReached: () => void;
  onError: (msg: string) => void;
}

type ScanPhase = 'live' | 'analyzing' | 'frozen';

const SCAN_TIMEOUT_MS = 25000;
const SCAN_TOTAL = 20;

// ─── Canvas helpers ────────────────────────────────────────────────────────────

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if ((ctx as unknown as { roundRect?: unknown }).roundRect) {
    (ctx as unknown as { roundRect: Function }).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
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

function drawSignal(ctx: CanvasRenderingContext2D, signal: Signal, W: number, H: number, opacity: number) {
  const { type, severity, label, region } = signal;
  const color = SIGNAL_COLORS[type as SignalType] ?? '#FFFFFF';
  const rx = region.x * W, ry = region.y * H, rw = region.w * W, rh = region.h * H;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case 'spine':
      ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(rx + rw / 2, ry); ctx.lineTo(rx + rw / 2, ry + rh); ctx.stroke();
      ctx.setLineDash([]); break;
    case 'shoulder':
      ctx.lineWidth = Math.max(1, Math.min(8, (severity / 10) * 7 + 1));
      ctx.beginPath(); ctx.moveTo(rx, ry + rh / 2); ctx.lineTo(rx + rw, ry + rh / 2); ctx.stroke(); break;
    case 'neck':
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(rx, ry + rh); ctx.lineTo(rx + rw, ry); ctx.stroke(); break;
    case 'brow':
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx + rw / 2, ry + rh, rw / 2, Math.PI, 0, false); ctx.stroke(); break;
    case 'jaw': {
      ctx.lineWidth = 2;
      const bs = Math.min(20, rw * 0.25, rh * 0.25);
      ctx.beginPath();
      ctx.moveTo(rx + bs, ry); ctx.lineTo(rx, ry); ctx.lineTo(rx, ry + bs);
      ctx.moveTo(rx + rw - bs, ry); ctx.lineTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + bs);
      ctx.moveTo(rx, ry + rh - bs); ctx.lineTo(rx, ry + rh); ctx.lineTo(rx + bs, ry + rh);
      ctx.moveTo(rx + rw - bs, ry + rh); ctx.lineTo(rx + rw, ry + rh); ctx.lineTo(rx + rw, ry + rh - bs);
      ctx.stroke(); break;
    }
    case 'hands':
      ctx.lineWidth = 2; ctx.strokeRect(rx, ry, rw, rh); break;

    case 'frontalis': {
      // Horizontal dashed lines across forehead (2 parallel furrow lines)
      ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      const lineGap = rh / 3;
      for (let li = 0; li < 2; li++) {
        const ly = ry + lineGap * (li + 1);
        ctx.beginPath(); ctx.moveTo(rx, ly); ctx.lineTo(rx + rw, ly); ctx.stroke();
      }
      ctx.setLineDash([]); break;
    }

    case 'periorbital': {
      // Ellipse around eye area
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2);
      ctx.stroke(); break;
    }

    case 'nasolabial': {
      // Two curved arcs at mouth corners (nasolabial folds)
      ctx.lineWidth = 2;
      const mx = rx + rw / 2, my = ry + rh / 2;
      const aw = rw * 0.35, ah = rh * 0.6;
      ctx.beginPath(); ctx.arc(mx - aw, my, ah, -Math.PI * 0.4, Math.PI * 0.4, false); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx + aw, my, ah, Math.PI * 0.6, Math.PI * 1.4, false); ctx.stroke();
      break;
    }

    case 'temporalis': {
      // Small arc bracket at temporal region
      ctx.lineWidth = 2;
      const tcx = rx + rw / 2, tcy = ry + rh / 2, tr = Math.min(rw, rh) * 0.45;
      ctx.beginPath(); ctx.arc(tcx, tcy, tr, -Math.PI * 0.75, Math.PI * 0.75, false); ctx.stroke();
      // dot at center
      ctx.beginPath(); ctx.arc(tcx, tcy, 2.5, 0, Math.PI * 2); ctx.fill(); break;
    }

    case 'trapezius': {
      // Inverted-V from neck base to shoulders (trapezius elevation)
      ctx.lineWidth = 2;
      const tx = rx + rw / 2, ty = ry;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(rx, ry + rh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(rx + rw, ry + rh); ctx.stroke(); break;
    }

    case 'respiratory': {
      // Large arc across upper chest (clavicular breathing elevation)
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx + rw / 2, ry + rh, rw / 2, Math.PI, 0, false);
      ctx.stroke(); break;
    }
  }

  ctx.shadowBlur = 0;

  // Label
  const fullLabel = `${label}  ${severity.toFixed(1)} · ${Math.round(severity * 10)}%`;
  ctx.font = '11px "JetBrains Mono", monospace';
  const mW = ctx.measureText(fullLabel).width;
  const padX = 6, lblH = 19, lblW = mW + padX * 2;
  const lblX = Math.min(rx, W - lblW - 2), lblY = Math.max(ry - lblH - 4, 2);
  ctx.globalAlpha = opacity * 0.9;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  drawRoundRect(ctx, lblX, lblY, lblW, lblH, 4); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(fullLabel, lblX + padX, lblY + lblH - 5);

  ctx.restore();
}

function drawDataHUD(ctx: CanvasRenderingContext2D, W: number, H: number, score: number, mood: string, count: number, opacity: number) {
  ctx.save();
  ctx.globalAlpha = opacity;
  const rows = [
    { label: 'STRESS ', value: `${score} / 10`, color: getScoreColor(score) },
    { label: 'MOOD   ', value: mood.toUpperCase(), color: 'rgba(255,255,255,0.75)' },
    { label: 'SIGNALS', value: `${count} detected`, color: '#38bdf8' },
  ];
  const lineH = 18, padX = 10, padY = 8, boxW = 192;
  const boxH = rows.length * lineH + padY * 2;
  const bx = 12, by = H - boxH - 92; // above the shutter bar

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  drawRoundRect(ctx, bx, by, boxW, boxH, 8); ctx.fill();
  ctx.fillStyle = '#0ea5e9';
  drawRoundRect(ctx, bx, by, 3, boxH, 2); ctx.fill();

  ctx.font = '10px "JetBrains Mono", monospace';
  rows.forEach((row, i) => {
    const y = by + padY + i * lineH + 11;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(row.label, bx + padX, y);
    ctx.fillStyle = row.color; ctx.fillText(row.value, bx + padX + 72, y);
  });

  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText(ts, bx + padX, by + boxH + 10);
  ctx.restore();
}

// Cover-mode draw: mirrors CSS object-fit: cover
function drawVideoCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, cW: number, cH: number) {
  const vW = video.videoWidth, vH = video.videoHeight;
  if (!vW || !vH) return;
  const scale = Math.max(cW / vW, cH / vH);
  const dx = (cW - vW * scale) / 2, dy = (cH - vH * scale) / 2;
  ctx.drawImage(video, dx, dy, vW * scale, vH * scale);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CameraView({ isLimitReached, scansRemaining, scanHistory, lastScore, userEmail, onAnalysis, onLimitReached, onError }: Props) {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const overlayRef     = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const rafRef         = useRef<number | null>(null);
  const signalsRef     = useRef<Signal[]>([]);
  const hudDataRef     = useRef<{ score: number; mood: string; count: number } | null>(null);
  const mountedRef     = useRef(true);

  const [cameraError,    setCameraError]    = useState(false);
  const [phase,          setPhase]          = useState<ScanPhase>('live');
  const [shutterPressed, setShutterPressed] = useState(false);
  const [borderColor,    setBorderColor]    = useState<string | null>(null);
  const [frozenDataUrl,  setFrozenDataUrl]  = useState<string | null>(null);
  const [countdown,      setCountdown]      = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Camera
  useEffect(() => {
    mountedRef.current = true;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } })
      .then((s) => { stream = s; if (videoRef.current && mountedRef.current) videoRef.current.srcObject = s; })
      .catch(() => { if (mountedRef.current) setCameraError(true); });
    return () => { mountedRef.current = false; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // ── Update border color when lastScore changes (after scan)
  useEffect(() => {
    if (lastScore !== null && lastScore > 0) {
      setBorderColor(getScoreColor(lastScore));
      // Fade back to default after 3s
      const t = setTimeout(() => setBorderColor(null), 3000);
      return () => clearTimeout(t);
    }
  }, [lastScore]);

  // ── Sync canvas sizes
  const syncSizes = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const W = c.clientWidth, H = c.clientHeight;
    if (overlayRef.current) { overlayRef.current.width = W; overlayRef.current.height = H; }
  }, []);

  useEffect(() => {
    syncSizes();
    const ro = new ResizeObserver(syncSizes);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [syncSizes]);

  // ── Overlay animation
  const animateOverlay = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();
    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / 350, 1);
      const canvas = overlayRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      signalsRef.current.forEach((s) => { if (s.detected) drawSignal(ctx, s, canvas.width, canvas.height, progress); });
      if (hudDataRef.current) drawDataHUD(ctx, canvas.width, canvas.height, hudDataRef.current.score, hudDataRef.current.mood, hudDataRef.current.count, progress);
      if (progress < 1) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  // ── Clear overlay
  const clearOverlay = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const canvas = overlayRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    signalsRef.current = [];
    hudDataRef.current = null;
  }, []);

  // ── Countdown timer
  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(SCAN_TIMEOUT_MS / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
  }, []);

  // ── Shutter sound (Web Audio API — no file needed)
  const playShutterSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      // Mechanical click: short noise burst + quick low thud
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3200;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + 0.06);
    } catch { /* ignore — audio not critical */ }
  }, []);

  // ── Shutter pressed
  const handleShutter = useCallback(async () => {
    if (phase !== 'live' || isLimitReached) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    // Press animation + shutter sound
    playShutterSound();
    setShutterPressed(true);
    setTimeout(() => setShutterPressed(false), 120);

    setPhase('analyzing');
    startCountdown();

    // Capture frame as data URL — stored in state, immune to canvas clearing
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    offscreen.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.88);
    setFrozenDataUrl(dataUrl);
    const base64 = dataUrl.split(',')[1];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, email: userEmail || undefined }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;

      const data = await res.json();

      stopCountdown();
      if (data.error === 'limit_reached') { onLimitReached(); setPhase('live'); return; }
      if (data.error) { onError('Analysis error — please try again.'); setPhase('live'); return; }

      signalsRef.current = (data.signals ?? []).filter((s: Signal) => s.detected);
      hudDataRef.current = { score: data.stress_score ?? 0, mood: data.mood_tag ?? '—', count: signalsRef.current.length };

      // Freeze immediately, then animate overlay on the still frame
      setPhase('frozen');
      animateOverlay();
      onAnalysis(data as AnalysisResult);

    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (!mountedRef.current) return;
      stopCountdown();
      const isAbort = err instanceof Error && err.name === 'AbortError';
      onError(isAbort ? 'Scan timed out. Try again.' : 'Network error — check your connection.');
      setPhase('live');
    }
  }, [phase, isLimitReached, syncSizes, animateOverlay, playShutterSound, startCountdown, stopCountdown, onAnalysis, onLimitReached, onError]);

  // ── Rescan: unfreeze, resume live
  const handleRescan = useCallback(() => {
    if (phase !== 'frozen') return;
    clearOverlay();
    setFrozenDataUrl(null);
    setBorderColor(null);
    setPhase('live');
  }, [phase, clearOverlay]);

  // ── Camera error
  if (cameraError) {
    return (
      <div className="card flex flex-col items-center justify-center gap-4 text-center"
        style={{ aspectRatio: '16/9', width: '100%' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14m0 0V8m0 6H7a2 2 0 01-2-2V8a2 2 0 012-2h8" />
            <line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>Camera access denied</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>Allow camera permissions in your browser, then reload.</p>
        </div>
      </div>
    );
  }

  const isAnalyzing = phase === 'analyzing';
  const isFrozen    = phase === 'frozen';
  const scansUsed   = SCAN_TOTAL - scansRemaining;
  const isApproaching = scansRemaining <= 2 && scansRemaining > 0 && !isLimitReached;

  // Border color: score color when frozen, analyzing color when analyzing, default otherwise
  const activeBorderColor = isAnalyzing
    ? 'rgba(14,165,233,0.45)'
    : (phase === 'frozen' && borderColor)
      ? `${borderColor}88`
      : 'rgba(0,0,0,0.1)';

  const activeShadow = isAnalyzing
    ? '0 0 0 4px rgba(14,165,233,0.1), 0 8px 32px rgba(0,0,0,0.12)'
    : (phase === 'frozen' && borderColor)
      ? `0 0 0 4px ${borderColor}22, 0 8px 32px rgba(0,0,0,0.12)`
      : '0 4px 24px rgba(0,0,0,0.08)';

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: 16,
        border: `${isAnalyzing || (phase === 'frozen' && borderColor) ? '2px' : '1px'} solid ${activeBorderColor}`,
        boxShadow: activeShadow,
        transition: 'border 0.35s ease, box-shadow 0.35s ease',
      }}
    >
      {/* ── Layer 1: Live video (hidden when frozen) */}
      <video
        ref={videoRef}
        autoPlay muted playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: isFrozen ? 0 : 1,
          transition: 'opacity 0.15s ease',
        }}
      />

      {/* ── Layer 2: Frozen still frame */}
      {isFrozen && frozenDataUrl && (
        <img
          src={frozenDataUrl}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* ── Layer 3: Signal overlay */}
      <canvas
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />

      {/* ── Scanlines */}
      <div className="scanlines absolute inset-0" style={{ pointerEvents: 'none' }} />

      {/* ── Corner brackets */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
        <div key={pos}
          className={`absolute ${pos.includes('t') ? 'top-3' : 'bottom-[88px]'} ${pos.includes('l') ? 'left-3' : 'right-3'}`}
          style={{ pointerEvents: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d={pos === 'tl' ? 'M0 8V0H8' : pos === 'tr' ? 'M16 8V0H8' : pos === 'bl' ? 'M0 8V16H8' : 'M16 8V16H8'}
              stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
          </svg>
        </div>
      ))}

      {/* ── LIVE badge (top-left) */}
      {phase === 'live' && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ef4444' }} />
          <span className="text-xs font-mono font-medium" style={{ color: '#fff', letterSpacing: '0.06em' }}>LIVE</span>
        </div>
      )}

      {/* ── FROZEN / ANALYZING badge (top-left) */}
      {(phase === 'frozen' || isAnalyzing) && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <span className="text-xs font-mono font-medium" style={{ color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em' }}>
            {isAnalyzing ? 'ANALYZING' : 'FROZEN'}
          </span>
        </div>
      )}

      {/* ── Approaching limit warning (top-right badge) */}
      {isApproaching && phase === 'live' && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full animate-fade-in"
          style={{ background: 'rgba(239,68,68,0.85)', backdropFilter: 'blur(6px)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span className="text-xs font-mono font-medium" style={{ color: '#fff' }}>
            {scansRemaining} left
          </span>
        </div>
      )}

      {/* ── Analyzing sweep bar (top) */}
      {isAnalyzing && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, transparent, #0ea5e9, transparent)',
            animation: 'scan-sweep 1.4s ease-in-out infinite',
            width: '40%',
          }} />
        </div>
      )}

      {/* ── LIMIT REACHED overlay */}
      {isLimitReached && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" />
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: '#1a1a2e' }}>{SCAN_TOTAL} free scans used.</p>
          <p className="text-sm max-w-xs" style={{ color: '#9ca3af' }}>
            This limit exists to control API costs on this demo.
          </p>
        </div>
      )}

      {/* ── Bottom bar: iPhone-style shutter UI */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
        style={{
          height: 80,
          background: 'rgba(0,0,0,0.42)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Left: scan counter */}
        <div className="absolute left-5 flex flex-col items-start">
          {phase === 'live' && (
            <span
              className="text-xs font-mono"
              style={{ color: isApproaching ? '#f87171' : 'rgba(255,255,255,0.45)' }}
            >
              {scansUsed} / {SCAN_TOTAL}
            </span>
          )}
          {phase === 'frozen' && (
            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
              tap to rescan
            </span>
          )}
        </div>

        {/* Shutter button */}
        <button
          onClick={phase === 'frozen' ? handleRescan : handleShutter}
          disabled={isAnalyzing || isLimitReached}
          style={{
            width: 68, height: 68,
            borderRadius: '50%',
            border: `3px solid ${isLimitReached ? 'rgba(255,255,255,0.2)' : phase === 'frozen' ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.9)'}`,
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isAnalyzing || isLimitReached ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.3s ease',
            padding: 0,
          }}
        >
          {isAnalyzing ? (
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="white" strokeWidth="3"
                strokeLinecap="round" strokeDasharray="28 85" />
            </svg>
          ) : phase === 'frozen' ? (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </div>
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: isLimitReached ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.95)',
              transform: shutterPressed ? 'scale(0.82)' : 'scale(1)',
              transition: 'transform 0.1s ease, background 0.2s ease',
            }} />
          )}
        </button>

        {/* Right: scan history circles OR analyzing badge OR done */}
        <div className="absolute right-5 flex items-center gap-1.5">
          {isAnalyzing ? (
            <span
              className="text-xs font-mono animate-fade-in"
              style={{ color: countdown !== null && countdown <= 5 ? '#f87171' : '#38bdf8' }}
            >
              {countdown !== null ? `${countdown}s` : '…'}
            </span>
          ) : phase === 'frozen' ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-xs font-mono" style={{ color: '#22c55e' }}>Done</span>
            </div>
          ) : scanHistory.length > 0 ? (
            // Scan history circles (last 5)
            <div className="flex items-center gap-1">
              {scanHistory.slice(-5).map((score, i) => (
                <div
                  key={i}
                  title={`Score: ${score}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: getScoreColor(score),
                    opacity: 0.7 + (i / scanHistory.slice(-5).length) * 0.3,
                    boxShadow: `0 0 4px ${getScoreColor(score)}88`,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
