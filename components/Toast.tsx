'use client';

import { useEffect } from 'react';

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, onDismiss, duration = 3500 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 text-sm animate-fade-in-up"
      style={{
        background: '#fff',
        border: '1px solid #fecaca',
        borderRadius: 12,
        color: '#374151',
        maxWidth: 320,
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: '#fef2f2', color: '#ef4444', fontSize: 13 }}
      >
        ⚠
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ color: '#d1d5db', fontSize: 18, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none', padding: 0, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}
