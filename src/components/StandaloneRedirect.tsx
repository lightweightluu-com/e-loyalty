'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Die installierte PWA startet immer auf „/“: Kunden landen direkt wieder auf ihrer Karte. */
export function StandaloneRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      const last = localStorage.getItem('lc_last_card');
      if (last && matchMedia('(display-mode: standalone)').matches) router.replace(`/card/${last}`);
    } catch {}
  }, [router]);
  return null;
}
