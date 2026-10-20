'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return <button className="btn-primary" onClick={() => window.print()}><Printer className="size-5" aria-hidden /> Drucken / Als PDF speichern</button>;
}
