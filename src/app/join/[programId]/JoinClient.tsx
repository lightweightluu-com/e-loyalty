'use client';

import { Loader2, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Ziel des Aufsteller-QR: holt (oder findet) die Karte und leitet auf /card/[id] weiter. */
export function JoinClient({ programId }: { programId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const join = useCallback(async () => {
    setError(null);
    let existingCardId: string | undefined;
    try { existingCardId = localStorage.getItem(`lc_card_${programId}`) ?? undefined; } catch {}
    try {
      const res = await fetch(`/api/programs/${programId}/cards`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ existingCardId }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error?.message ?? 'Das hat nicht geklappt.');
      try { localStorage.setItem(`lc_card_${programId}`, data.cardId); localStorage.setItem('lc_last_card', data.cardId); } catch {}
      router.replace(`/card/${data.cardId}`);
    } catch {
      setError('Keine Verbindung. Bitte versuche es erneut.');
    }
  }, [programId, router]);

  useEffect(() => {
    if (started.current) return; // Strict Mode: nur einmal
    started.current = true;
    void join();
  }, [join]);

  return (
    <main className="page grid min-h-dvh place-items-center text-center">
      {error ? (
        <div role="alert" className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-10 text-amber-600" aria-hidden />
          <p>{error}</p>
          <button className="btn-primary" onClick={join}>Erneut versuchen</button>
        </div>
      ) : (
        <div role="status" className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p>Deine Stempelkarte wird erstellt …</p>
        </div>
      )}
    </main>
  );
}
