'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnalysisResult } from '@/lib/types';
import CameraView from '@/components/CameraView';
import StressMeter from '@/components/StressMeter';
import SignalsList from '@/components/SignalsList';
import NudgeCard from '@/components/NudgeCard';
import Controls from '@/components/Controls';
import Toast from '@/components/Toast';

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scansRemaining, setScansRemaining] = useState(5);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scanInterval, setScanInterval] = useState(5);
  const [toast, setToast] = useState<string | null>(null);
  const [nudgeKey, setNudgeKey] = useState(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const handleAnalysis = useCallback((data: AnalysisResult) => {
    if (typeof data.remaining === 'number') {
      setScansRemaining(data.remaining);
      if (data.remaining <= 0) {
        setIsLimitReached(true);
        setIsPaused(true);
      }
    }
    setResult(data);
    setNudgeKey((k) => k + 1);
  }, []);

  const handleLimitReached = useCallback(() => {
    setIsLimitReached(true);
    setIsPaused(true);
    setScansRemaining(0);
  }, []);

  const handleError = useCallback(
    (msg: string) => {
      showToast(msg);
    },
    [showToast]
  );

  // Pause auto-activates when limit reached
  useEffect(() => {
    if (isLimitReached) setIsPaused(true);
  }, [isLimitReached]);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#07070f' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: isLimitReached ? '#FF4444' : isPaused ? '#FFAA00' : '#00FF88', boxShadow: `0 0 6px ${isLimitReached ? '#FF4444' : isPaused ? '#FFAA00' : '#00FF88'}` }}
          />
          <span className="font-mono text-sm tracking-widest uppercase" style={{ color: '#00CCFF', letterSpacing: '0.15em' }}>
            StressScan
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Claude Vision · v1.0
        </span>
      </header>

      {/* Main content */}
      <main className="flex flex-col md:flex-row flex-1 gap-4 p-4 md:p-6">
        {/* Camera — 65% desktop, full mobile */}
        <section className="w-full md:w-[65%] flex-shrink-0">
          <CameraView
            scanInterval={scanInterval}
            isPaused={isPaused}
            isLimitReached={isLimitReached}
            onAnalysis={handleAnalysis}
            onLimitReached={handleLimitReached}
            onError={handleError}
          />
        </section>

        {/* Data panel — 35% desktop, full mobile */}
        <section className="w-full md:w-[35%] flex flex-col gap-3 overflow-y-auto pb-4">
          <StressMeter
            score={result?.stress_score ?? 0}
            moodTag={result?.mood_tag ?? null}
          />
          <SignalsList signals={result?.signals ?? []} />
          <NudgeCard nudge={result?.nudge ?? null} nudgeKey={nudgeKey} />
          <Controls
            scanInterval={scanInterval}
            isPaused={isPaused}
            scansRemaining={scansRemaining}
            isLimitReached={isLimitReached}
            onIntervalChange={setScanInterval}
            onPauseToggle={() => setIsPaused((p) => !p)}
          />
        </section>
      </main>

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </div>
  );
}
