'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnalysisResult } from '@/lib/types';
import CameraView from '@/components/CameraView';
import StressMeter from '@/components/StressMeter';
import SignalsList from '@/components/SignalsList';
import NudgeCard from '@/components/NudgeCard';
import Toast from '@/components/Toast';
import GateScreen from '@/components/GateScreen';
import Logo from '@/components/Logo';

const GATE_KEY = 'stressscan_accepted';
const SCAN_TOTAL = 20;

export default function Home() {
  const [gateCleared, setGateCleared] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scansRemaining, setScansRemaining] = useState(5);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [scanHistory, setScanHistory] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setScanHistory((prev) => [...prev.slice(-4), data.stress_score ?? 0]);
    setDrawerOpen(true); // auto-open mobile drawer after scan
  }, []);

  const handleLimitReached = useCallback(() => {
    setIsLimitReached(true);
    setScansRemaining(0);
  }, []);

  const handleError = useCallback((msg: string) => setToast(msg), []);

  if (!gateCleared) return <GateScreen onEnter={handleEnter} />;

  const dataPanel = (
    <>
      <StressMeter score={result?.stress_score ?? 0} moodTag={result?.mood_tag ?? null} />
      <SignalsList signals={result?.signals ?? []} />
      <NudgeCard nudge={result?.nudge ?? null} nudgeKey={nudgeKey} />
    </>
  );

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f5f5f7' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3">
          <Logo size={34} variant="full" theme="light" />
          {/* Live status dot */}
          <div
            className="w-1.5 h-1.5 rounded-full hidden sm:block"
            style={{
              background: isLimitReached ? '#ef4444' : result ? '#10b981' : '#94a3b8',
              boxShadow: `0 0 0 2px ${isLimitReached ? '#fee2e2' : result ? '#d1fae5' : '#f1f5f9'}`,
              transition: 'all 0.3s ease',
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block" style={{ color: '#9ca3af' }}>{userEmail}</span>
          <div
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full"
            style={{
              background: scansRemaining <= 2 ? '#fef2f2' : '#f9fafb',
              color: scansRemaining <= 2 ? '#ef4444' : '#6b7280',
              border: `1px solid ${scansRemaining <= 2 ? '#fecaca' : 'rgba(0,0,0,0.08)'}`,
              transition: 'all 0.3s ease',
            }}
          >
            {scansRemaining} scan{scansRemaining !== 1 ? 's' : ''} left
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-col md:flex-row flex-1 gap-5 p-4 md:p-6 max-w-[1200px] mx-auto w-full">
        {/* Camera */}
        <section className="w-full md:w-[62%] flex-shrink-0">
          <CameraView
            isLimitReached={isLimitReached}
            scansRemaining={scansRemaining}
            scanHistory={scanHistory}
            lastScore={result?.stress_score ?? null}
            userEmail={userEmail}
            onAnalysis={handleAnalysis}
            onLimitReached={handleLimitReached}
            onError={handleError}
          />
        </section>

        {/* Desktop data panel */}
        <section className="hidden md:flex w-full md:w-[38%] flex-col gap-4 overflow-y-auto pb-4">
          {dataPanel}
        </section>
      </main>

      {/* Mobile slide-up drawer */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-40"
        style={{
          transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
          transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
          background: '#f5f5f7',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Drag handle */}
        <button
          className="flex items-center justify-center w-full py-3"
          onClick={() => setDrawerOpen((o) => !o)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: 36, height: 4, background: '#d1d5db', borderRadius: 2 }} />
        </button>

        {/* Drawer content */}
        <div
          className="flex flex-col gap-4 px-4 pb-8 overflow-y-auto"
          style={{ maxHeight: 'calc(80vh - 48px)' }}
        >
          {dataPanel}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="text-center py-4 px-6 text-xs"
        style={{ color: '#9ca3af', borderTop: '1px solid rgba(0,0,0,0.05)' }}
      >
        StressScan · AI-powered tension analysis ·{' '}
        <a
          href="mailto:barishiz@gmail.com"
          style={{ color: '#0ea5e9', textDecoration: 'none' }}
        >
          barishiz@gmail.com
        </a>
      </footer>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
