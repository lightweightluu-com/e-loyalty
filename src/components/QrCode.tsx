'use client';

import { QRCodeSVG } from 'qrcode.react';

/** Weisser Hintergrund + Ruhezone, damit Kameras auch im Dunkelmodus zuverlässig lesen. */
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  return (
    <div className="inline-block rounded-2xl bg-white p-3">
      <QRCodeSVG value={value} size={size} level="M" role="img" aria-label={label} />
    </div>
  );
}

/** Skaliert mit dem Plakat (SVG füllt die Breite des Containers). */
export function PosterQr({ value, label }: { value: string; label: string }) {
  return <QRCodeSVG value={value} size={512} level="M" role="img" aria-label={label} style={{ width: 'calc(var(--u) * 90)', height: 'calc(var(--u) * 90)' }} />;
}
