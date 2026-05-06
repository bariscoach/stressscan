'use client';

import { useState, useRef } from 'react';
import Logo from '@/components/Logo';

interface Props {
  onEnter: (email: string) => void;
}

const TERMS = `TERMS OF USE — StressScan
Last updated: May 2026

1. DEMONSTRATION PURPOSE
StressScan is a technology demonstration. It is not a medical device, clinical tool, or health service of any kind. It does not provide medical advice, diagnosis, or treatment.

2. BIOMETRIC DATA — WE DO NOT COLLECT IT
We do not collect, store, process, or retain biometric data of any kind. This includes facial geometry, facial recognition data, voice prints, retina scans, and any other biological identifiers as defined under applicable privacy law (including BIPA, GDPR, and CCPA).

Video frames captured by your camera are transmitted in real time to Anthropic's API solely for momentary visual analysis. These frames are not stored, logged, or retained on any server after the API response is returned.

3. YOUR EMAIL ADDRESS
Your email address is collected and stored in a secure server-side database. It is used for the following purposes only: (a) to remember that you have agreed to these terms, (b) to enforce per-user scan limits, and (c) to allow the operator to contact you regarding this application.

Your email address will not be sold, shared with third parties, or used for marketing without your explicit consent. You may request deletion of your email address at any time by contacting barishiz@gmail.com.

4. CAMERA ACCESS
You voluntarily grant this application access to your camera for the purpose of real-time analysis. You may revoke camera access at any time through your browser settings. Camera data is processed locally in your browser except for the single compressed frame sent to the AI provider per scan.

5. NO MEDICAL ADVICE
Stress and tension signals identified by this application are AI estimates based on visual cues only. Results are not clinically validated. Do not make health, medical, or safety decisions based on output from this application.

6. ELIGIBILITY
By proceeding, you confirm that you are at least 18 years of age and are using this application voluntarily.

7. LIMITATION OF LIABILITY
StressScan is provided "as is" without warranties of any kind, express or implied. The creators shall not be liable for any direct, indirect, incidental, or consequential damages arising from use of this application.

8. CHANGES
These terms may be updated at any time. Continued use of the application constitutes acceptance of any revised terms.`;

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export default function GateScreen({ onEnter }: Props) {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [termsRead, setTermsRead] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);

  const handleTermsScroll = () => {
    const el = termsRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setTermsRead(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setEmailError('Please enter a valid email address.'); return; }
    if (!agreed) return;
    setSubmitting(true);
    const clean = email.trim().toLowerCase();
    // Store email server-side (fire-and-forget — don't block entry on failure)
    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
    onEnter(clean);
  };

  const canSubmit = isValidEmail(email) && agreed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#f5f5f7' }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Glow */}
      <div
        className="absolute"
        style={{
          width: 560, height: 560, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative w-full max-w-[420px] animate-fade-in-up">
        <div
          className="card p-8 flex flex-col gap-6"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Logo size={48} variant="mark" theme="light" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: '#1a1a2e' }}>
                Welcome to StressScan
              </h1>
              <p className="text-sm leading-relaxed mt-1" style={{ color: '#6b7280' }}>
                AI-powered tension analysis via your webcam.<br />
                No biometric data collected. Email stored for access control.
              </p>
            </div>
          </div>

          {/* Trust section */}
          <div className="flex flex-col gap-1.5">
            {[
              {
                label: 'No biometric data collected',
                sub: 'Frames are not stored after analysis',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                ),
                accent: '#10b981',
                bg: '#f0fdf4',
              },
              {
                label: 'Camera data stays local',
                sub: 'One compressed frame per scan, then discarded',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ),
                accent: '#0ea5e9',
                bg: '#f0f9ff',
              },
              {
                label: 'Not a medical device',
                sub: 'AI estimates only — not clinical advice',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  </svg>
                ),
                accent: '#f59e0b',
                bg: '#fffbeb',
              },
            ].map(({ label, sub, icon, accent, bg }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: bg, border: `1px solid ${accent}22` }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}18` }}>
                  {icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</span>
                  <span className="text-xs" style={{ color: '#9ca3af' }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium" style={{ color: '#374151' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                className="w-full px-4 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: '#f9fafb',
                  border: emailError ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  color: '#1a1a2e',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={(e) => (e.target.style.borderColor = emailError ? '#ef4444' : '#0ea5e9')}
                onBlur={(e) => (e.target.style.borderColor = emailError ? '#ef4444' : '#e5e7eb')}
              />
              {emailError && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{emailError}</p>
              )}
            </div>

            {/* Terms */}
            <div>
              <button
                type="button"
                onClick={() => setTermsOpen((o) => !o)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left transition-all"
                style={{
                  background: '#f9fafb',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: termsOpen ? '10px 10px 0 0' : 10,
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span className="text-xs font-medium">
                  Terms of Use
                  {termsRead && <span className="ml-2" style={{ color: '#10b981' }}>✓ Read</span>}
                </span>
                <span style={{
                  color: '#9ca3af', fontSize: 11,
                  transform: termsOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease', display: 'inline-block',
                }}>▾</span>
              </button>

              {termsOpen && (
                <div
                  ref={termsRef}
                  onScroll={handleTermsScroll}
                  className="text-xs leading-relaxed overflow-y-auto"
                  style={{
                    background: '#f9fafb',
                    border: '1.5px solid #e5e7eb',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    maxHeight: 180,
                    padding: '12px 16px',
                    color: '#6b7280',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {TERMS}
                </div>
              )}
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <div className="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" className="sr-only" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <div
                  className="w-4 h-4 rounded flex items-center justify-center transition-all"
                  style={{
                    background: agreed ? '#0ea5e9' : '#fff',
                    border: agreed ? '1.5px solid #0ea5e9' : '1.5px solid #d1d5db',
                  }}
                >
                  {agreed && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.2 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                I have read and agree to the{' '}
                <button type="button" onClick={() => setTermsOpen(true)}
                  style={{ color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}>
                  Terms of Use
                </button>
                . I understand this app does not collect biometric data and is not a medical tool.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full py-3 text-sm font-semibold transition-all"
              style={{
                borderRadius: 10,
                background: canSubmit ? 'linear-gradient(135deg, #0ea5e9, #38bdf8)' : '#f3f4f6',
                color: canSubmit ? '#fff' : '#9ca3af',
                border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit ? '0 4px 14px rgba(14,165,233,0.35)' : 'none',
                fontFamily: 'Inter, sans-serif',
                transform: canSubmit ? 'none' : 'none',
                letterSpacing: '0.01em',
              }}
            >
              {submitting ? 'Entering…' : 'Enter StressScan →'}
            </button>
          </form>

          <p className="text-center text-xs" style={{ color: '#d1d5db' }}>
            Email stored securely · No passwords · No biometrics
          </p>
        </div>
      </div>
    </div>
  );
}
