'use client';

import { Gift, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InstallHint } from '@/components/InstallHint';
import { QrCode } from '@/components/QrCode';
import { StampCard } from '@/components/StampCard';
import type { CardSnapshot } from '@/lib/cards';

export function CardLive({ initial, wallets }: { initial: CardSnapshot; wallets: string[] }) {
  const [card, setCard] = useState(initial);
  const [online, setOnline] = useState(true);
  const prev = useRef(initial);
  const [announce, setAnnounce] = useState('');

  // Karte für die PWA merken (localStorage; das Cookie setzt der Server beim Erstellen).
  useEffect(() => {
    try {
      localStorage.setItem(`lc_card_${initial.programId}`, initial.cardId);
      localStorage.setItem('lc_last_card', initial.cardId);
    } catch {}
  }, [initial.cardId, initial.programId]);

  // Live-Updates per SSE; bei Verbindungsproblemen zusätzlich Polling.
  useEffect(() => {
    const es = new EventSource(`/api/cards/${initial.cardId}/stream`);
    es.addEventListener('card', e => { setOnline(true); setCard(JSON.parse((e as MessageEvent).data)); });
    es.onopen = () => setOnline(true);
    es.onerror = () => setOnline(false);
    const poll = setInterval(async () => {
      if (es.readyState === EventSource.OPEN) return;
      try {
        const r = await fetch(`/api/cards/${initial.cardId}/status`, { cache: 'no-store' });
        if (r.ok) { setCard(await r.json()); setOnline(true); }
      } catch {}
    }, 8000);
    return () => { es.close(); clearInterval(poll); };
  }, [initial.cardId]);

  // Haptik + Screenreader-Ansage bei neuem Stempel / Einlösung.
  useEffect(() => {
    const p = prev.current;
    prev.current = card;
    if (card.currentStamps > p.currentStamps) {
      navigator.vibrate?.(card.rewardReady ? [80, 60, 160] : 60);
      setAnnounce(card.rewardReady ? `Karte voll! ${card.rewardTitle} wartet auf dich.` : `Neuer Stempel: ${card.currentStamps} von ${card.stampsRequired}.`);
    } else if (card.rewardsRedeemed > p.rewardsRedeemed) {
      setAnnounce('Prämie eingelöst. Eine neue Karte beginnt.');
    }
  }, [card]);

  return (
    <main className="page flex flex-col gap-5">
      <StampCard {...card} />

      {card.rewardReady && (
        <p role="status" className="panel flex items-center gap-3 border-emerald-600 font-medium">
          <Gift className="size-6 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
          Karte voll – zeige sie am Tresen und hol dir: {card.rewardTitle}
        </p>
      )}

      <section className="panel flex flex-col items-center gap-3 text-center" aria-labelledby="qr-h">
        <h3 id="qr-h" className="font-medium">{card.rewardReady ? 'Zum Einlösen scannen lassen' : 'Zum Stempeln scannen lassen'}</h3>
        <QrCode value={card.qr.payload} label="QR-Code deiner Stempelkarte" />
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {online ? 'Der Code erneuert sich automatisch.' : (
            <span className="inline-flex items-center gap-1.5"><WifiOff className="size-4" aria-hidden /> Keine Verbindung – Code evtl. abgelaufen.</span>
          )}
        </p>
      </section>

      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="panel"><dt className="text-sm text-stone-600 dark:text-stone-400">Gesammelt</dt><dd className="text-2xl font-semibold tabular-nums">{card.totalStampsCollected}</dd></div>
        <div className="panel"><dt className="text-sm text-stone-600 dark:text-stone-400">Eingelöst</dt><dd className="text-2xl font-semibold tabular-nums">{card.rewardsRedeemed}</dd></div>
      </dl>

      {wallets.length > 0 && (
        <div className="flex flex-col gap-2">
          {wallets.includes('google') && <a className="btn-ghost" href={`/api/cards/${card.cardId}/wallet/google`}>Zu Google Wallet hinzufügen</a>}
          {wallets.includes('apple') && <a className="btn-ghost" href={`/api/cards/${card.cardId}/wallet/apple`}>Zu Apple Wallet hinzufügen</a>}
        </div>
      )}
      <InstallHint />
      <p className="sr-only" aria-live="polite">{announce}</p>
    </main>
  );
}
