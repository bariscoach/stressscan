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
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 font-mono text-sm animate-fade-in-up"
      style={{
        background: 'rgba(20,10,10,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,68,68,0.3)',
        borderRadius: 10,
        color: 'rgba(255,255,255,0.8)',
        maxWidth: 320,
        boxShadow: '0 0 20px rgba(255,68,68,0.1)',
      }}
    >
      <span style={{ color: '#FF4444', fontSize: 16 }}>⚠</span>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 flex-shrink-0"
        style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        ×
      </button>
    </div>
  );
}
