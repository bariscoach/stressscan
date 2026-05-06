'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { AnalysisResult, Signal, SIGNAL_COLORS, SignalType } from '@/lib/types';

interface Props {
  scanInterval: number;
  isPaused: boolean;
  isLimitReached: boolean;
  onAnalysis: (result: AnalysisResult) => void;
  onLimitReached: () => void;
  onError: (msg: string) => void;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if ((ctx as unknown as { roundRect?: Function }).roundRect) {
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

function drawSignal(
  ctx: CanvasRenderingContext2D,
  signal: Signal,
  W: number,
  H: number,
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
      // TL
      ctx.moveTo(rx + bs, ry);
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx, ry + bs);
      // TR
      ctx.moveTo(rx + rw - bs, ry);
      ctx.lineTo(rx + rw, ry);
      ctx.lineTo(rx + rw, ry + bs);
      // BL
      ctx.moveTo(rx, ry + rh - bs);
      ctx.lineTo(rx, ry + rh);
      ctx.lineTo(rx + bs, ry + rh);
      // BR
      ctx.moveTo(rx + rw - bs, ry + rh);
      ctx.lineTo(rx + rw, ry + rh);
      ctx.lineTo(rx + rw, ry + rh - bs);
      ctx.stroke();
      break;
    }
    case 'hands': {
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);
      break;
    }
  }

  // Label
  ctx.shadowBlur = 0;
  ctx.font = '11px "JetBrains Mono", monospace';
  const metrics = ctx.measureText(label);
  const padX = 6;
  const padY = 4;
  const lblW = metrics.width + padX * 2;
  const lblH = 19;
  const lblX = Math.min(rx, W - lblW - 2);
  const lblY = Math.max(ry - lblH - 4, 2);

  ctx.globalAlpha = opacity * 0.88;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  drawRoundRect(ctx, lblX, lblY, lblW, lblH, 4);
  ctx.fill();

  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fillText(label, lblX + padX, lblY + lblH - padY - 1);

  ctx.restore();
}

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const rafRef = useRef<number | null>(null);
  const signalsRef = useRef<Signal[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Start camera
  useEffect(() => {
    mountedRef.current = true;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        if (videoRef.current && mountedRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (mountedRef.current) setCameraError(true);
      }
    };

    startCamera();

    return () => {
      mountedRef.current = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Sync canvas size with container
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
  }, []);

  const animateOverlay = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();

    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / 300, 1);
      drawFrame(progress);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(frame);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [drawFrame]);

  const captureAndAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || !mountedRef.current) return;

    setIsAnalyzing(true);

    // Capture frame
    const offscreen = document.createElement('canvas');
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx2d = offscreen.getContext('2d')!;
    ctx2d.drawImage(video, 0, 0);
    const base64 = offscreen.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!mountedRef.current) return;

      const data = await res.json();

      if (data.error === 'limit_reached') {
        onLimitReached();
        return;
      }

      if (data.error) {
        onError('Analysis error. Retrying next interval.');
        return;
      }

      // Update overlay
      signalsRef.current = (data.signals ?? []).filter((s: Signal) => s.detected);
      syncCanvasSize();
      animateOverlay();

      onAnalysis(data as AnalysisResult);
    } catch {
      if (mountedRef.current) {
        onError('Network error. Check your connection.');
      }
    } finally {
      if (mountedRef.current) setIsAnalyzing(false);
    }
  }, [onAnalysis, onLimitReached, onError, animateOverlay, syncCanvasSize]);

  // Scan interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPaused || isLimitReached) return;

    intervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, scanInterval * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scanInterval, isPaused, isLimitReached, captureAndAnalyze]);

  if (cameraError) {
    return (
      <div
        className="glass flex flex-col items-center justify-center gap-4 text-center"
        style={{ aspectRatio: '16/9', maxWidth: 900, width: '100%' }}
      >
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14m0 0V8m0 6H7a2 2 0 01-2-2V8a2 2 0 012-2h8m0 8v-8" />
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

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        width: '100%',
        maxWidth: 900,
        aspectRatio: '16/9',
        borderRadius: 12,
        border: isAnalyzing
          ? '1px solid rgba(0,204,255,0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isAnalyzing ? '0 0 20px rgba(0,204,255,0.2)' : 'none',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Scanlines */}
      <div
        className="scanlines absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />

      {/* Analyzing pulse ring */}
      {isAnalyzing && (
        <div
          className="absolute inset-0 animate-pulse-border"
          style={{ borderRadius: 12, pointerEvents: 'none' }}
        />
      )}

      {/* Corner decorations */}
      <div className="absolute top-3 left-3" style={{ pointerEvents: 'none' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M0 8V0H8" stroke="#00CCFF" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>
      <div className="absolute top-3 right-3" style={{ pointerEvents: 'none' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M16 8V0H8" stroke="#00CCFF" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>
      <div className="absolute bottom-3 left-3" style={{ pointerEvents: 'none' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M0 8V16H8" stroke="#00CCFF" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>
      <div className="absolute bottom-3 right-3" style={{ pointerEvents: 'none' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M16 8V16H8" stroke="#00CCFF" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>

      {/* Analyzing badge */}
      {isAnalyzing && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 font-mono text-xs"
          style={{
            background: 'rgba(0,204,255,0.12)',
            border: '1px solid rgba(0,204,255,0.3)',
            borderRadius: 999,
            color: '#00CCFF',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#00CCFF' }}
          />
          SCANNING
        </div>
      )}

      {/* Limit reached overlay */}
      {isLimitReached && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
          style={{
            background: 'rgba(7,7,15,0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ color: '#00CCFF', fontSize: 40, lineHeight: 1 }}>⏹</div>
          <p
            className="font-mono text-base font-semibold"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            5 free scans used.
          </p>
          <p
            className="text-sm max-w-xs"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            This limit exists to control API costs on this demo.
          </p>
        </div>
      )}
    </div>
  );
}
