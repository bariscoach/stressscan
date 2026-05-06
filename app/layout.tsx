import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StressScan — Real-time Stress Analysis',
  description: 'Live webcam stress and tension analysis powered by Claude Vision AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
