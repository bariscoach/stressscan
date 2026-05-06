'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnalysisResult } from '@/lib/types';
import CameraView from '@/components/CameraView';
import StressMeter from '@/components/StressMeter';
import SignalsList from '@/components/SignalsList';
import NudgeCard from '@/components/NudgeCard';
import Toast from '@/components/Toast';
import GateScreen from '@/components/GateScreen';

const GATE_KEY = 'stressscan_accepted';

export default function Home() {
  const [gateCleared, setGateCleared] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scansRemaining, setScansRemaining] = useState(100);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [scanTrigger, setScanTrigger] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nudgeKey, setNudgeKey] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(GATE_KEY);
      if (saved) {
        const { email } = JSON.parse(saved);
        if (email) { setUserEmail(email); setGateCleared(true); }
      }
    } catch { /* ignore */ }
  }, []);

  const handleEnter = useCallback((email: string) => {
    localStorage.setItem(GATE_KEY, JSON.stringify({ email, ts: Date.now() }));
    setUserEmail(email);
    setGateCleared(true);
  }, []);

  const handleAnalysis = useCallback((data: AnalysisResult) => {
    if (typeof data.remaining === 'number') {
      setScansRemaining(data.remaining);
      if (data.remaining <= 0) setIsLimitReached(true);
    }
    setResult(data);
    setNudgeKey((k) => k + 1);
    setIsScanning(false);
  }, []);

  const handleLimitReached = useCallback(() => {
    setIsLimitReached(true);
    setScansRemaining(0);
    setIsScanning(false);
  }, []);

  const handleError = useCallback((msg: string) => {
    setToast(msg);
    setIsScanning(false);
  }, []);

  const handleScanClick = () => {
    if (isScanning || isLimitReached) return;
    setIsScanning(true);
    setScanTrigger((t) => t + 1);
  };

  if (!gateCleared) return <GateScreen onEnter={handleEnter} />;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f5f5f7' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isLimitReached ? '#ef4444' : isScanning ? '#0ea5e9' : '#10b981',
              boxShadow: `0 0 0 3px ${isLimitReached ? '#fee2e2' : isScanning ? '#e0f2fe' : '#d1fae5'}`,
              transition: 'all 0.3s ease',
            }}
          />
          <span className="font-semibold text-sm tracking-tight" style={{ color: '#1a1a2e' }}>
            StressScan
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono hidden sm:inline-block"
            style={{ background: '#f0f9ff', color: '#0ea5e9', border: '1px solid #bae6fd' }}
          >
            Claude Vision
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block" style={{ color: '#9ca3af' }}>{userEmail}</span>
          <div
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
            style={{
              background: scansRemaining <= 5 ? '#fef2f2' : '#f9fafb',
              color: scansRemaining <= 5 ? '#ef4444' : '#6b7280',
              border: `1px solid ${scansRemaining <= 5 ? '#fecaca' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            <span style={{ color: scansRemaining <= 5 ? '#ef4444' : '#d1d5db' }}>⬡</span>
            {scansRemaining} left
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-col md:flex-row flex-1 gap-5 p-4 md:p-6 max-w-[1200px] mx-auto w-full">
        {/* Camera section */}
        <section className="w-full md:w-[62%] flex-shrink-0 flex flex-col gap-3">
          <CameraView
            scanTrigger={scanTrigger}
            isLimitReached={isLimitReached}
            onAnalysis={handleAnalysis}
            onLimitReached={handleLimitReached}
            onError={handleError}
          />

          {/* Scan button row */}
          <div className="flex items-center justify-between gap-3 px-1">
            <button
              onClick={handleScanClick}
              disabled={isScanning || isLimitReached}
              className="btn-scan"
            >
              {isScanning ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Scanning…
                </>
              ) : result ? (
                <> Scan Again</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Start Scan
                </>
              )}
            </button>

            {result && !isScanning && (
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                Last scan: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </section>

        {/* Data panel */}
        <section className="w-full md:w-[38%] flex flex-col gap-4 overflow-y-auto pb-4">
          <StressMeter score={result?.stress_score ?? 0} moodTag={result?.mood_tag ?? null} />
          <SignalsList signals={result?.signals ?? []} />
          <NudgeCard nudge={result?.nudge ?? null} nudgeKey={nudgeKey} />
        </section>
      </main>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
