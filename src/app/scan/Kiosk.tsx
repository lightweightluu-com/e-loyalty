'use client';

import { Scanner } from '@yudiel/react-qr-scanner';
import { ArrowLeft, CheckCircle2, Gift, TriangleAlert, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type CardInfo = { shopName: string; logoEmoji: string; currentStamps: number; stampsRequired: number; rewardTitle: string; cardId: string };
type Outcome =
  | { kind: 'stamp'; card: CardInfo }
  | { kind: 'ready'; card: CardInfo; ticket: string }
  | { kind: 'redeemed'; card: CardInfo }
  | { kind: 'error'; message: string };

function beep(freqs: number[]) {
  try {
    const ctx = new AudioContext();
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.start(t); o.stop(t + 0.11);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

const AUTO_DISMISS_MS = { stamp: 1600, redeemed: 2200, error: 2800 } as const;

export function Kiosk() {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const busy = useRef(false);
  const lastRaw = useRef({ value: '', at: 0 });

  const dismiss = useCallback(() => { setOutcome(null); busy.current = false; }, []);

  // Automatisch weiter zum nächsten Kunden – ausser die Karte ist voll (dann entscheidet der Händler).
  useEffect(() => {
    if (!outcome || outcome.kind === 'ready') return;
    const t = setTimeout(dismiss, AUTO_DISMISS_MS[outcome.kind]);
    return () => clearTimeout(t);
  }, [outcome, dismiss]);

  const call = async (body: object): Promise<Outcome> => {
    try {
      const res = await fetch('/api/merchant/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) return { kind: 'error', message: data.error?.message ?? 'Das hat nicht geklappt.' };
      if (data.result === 'STAMP_ADDED') return data.redeemTicket ? { kind: 'ready', card: data.card, ticket: data.redeemTicket } : { kind: 'stamp', card: data.card };
      if (data.result === 'REWARD_READY') return { kind: 'ready', card: data.card, ticket: data.redeemTicket };
      return { kind: 'redeemed', card: data.card };
    } catch {
      return { kind: 'error', message: 'Keine Verbindung.' };
    }
  };

  const show = (o: Outcome) => {
    setOutcome(o);
    if (o.kind === 'error') { beep([220, 180]); navigator.vibrate?.([120, 60, 120]); }
    else { beep(o.kind === 'stamp' ? [660, 880] : [660, 880, 1100]); navigator.vibrate?.(60); }
  };

  const onScan = async (codes: { rawValue: string }[]) => {
    const raw = codes[0]?.rawValue;
    if (!raw || busy.current) return;
    // Derselbe Code bleibt oft im Bild: 3 s ignorieren.
    if (raw === lastRaw.current.value && Date.now() - lastRaw.current.at < 3000) return;
    lastRaw.current = { value: raw, at: Date.now() };
    busy.current = true;
    show(await call({ payload: raw }));
  };

  const redeem = async (card: CardInfo, ticket: string) => show(await call({ action: 'REDEEM', cardId: card.cardId, ticket }));

  return (
    <main className="fixed inset-0 bg-black text-white">
      <Scanner
        onScan={onScan}
        onError={e => setCameraError(String((e as { message?: string })?.message ?? 'Kamera nicht verfügbar.'))}
        paused={outcome !== null}
        formats={['qr_code']}
        sound={false}
        constraints={{ facingMode: 'environment' }}
        styles={{ container: { width: '100%', height: '100%' } }}
      />

      <Link href="/dashboard" className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] inline-flex min-h-12 items-center gap-2 rounded-full bg-black/60 px-4 backdrop-blur">
        <ArrowLeft className="size-5" aria-hidden /> Zurück
      </Link>
      {!outcome && !cameraError && (
        <p className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] text-center text-lg font-medium drop-shadow">QR-Code des Kunden ins Bild halten</p>
      )}
      {cameraError && (
        <p role="alert" className="absolute inset-x-4 bottom-12 rounded-2xl bg-red-900 p-4 text-center">
          Kamera nicht verfügbar ({cameraError.replace(/\.$/, '')}). Bitte Kamerazugriff erlauben und HTTPS verwenden.
        </p>
      )}

      {outcome && <Overlay outcome={outcome} onDismiss={dismiss} onRedeem={redeem} />}
    </main>
  );
}

function Overlay({ outcome, onDismiss, onRedeem }: { outcome: Outcome; onDismiss: () => void; onRedeem: (c: CardInfo, t: string) => void }) {
  const base = 'absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 p-8 text-center';
  if (outcome.kind === 'error') {
    return (
      <div role="alert" className={`${base} bg-red-800`} onClick={onDismiss}>
        <TriangleAlert className="size-20" aria-hidden />
        <p className="text-2xl font-semibold">{outcome.message}</p>
        <p className="text-sm opacity-80">Tippen zum Weiterscannen</p>
      </div>
    );
  }
  const { card } = outcome;
  if (outcome.kind === 'stamp') {
    return (
      <div role="status" className={`${base} bg-emerald-700`} onClick={onDismiss}>
        <CheckCircle2 className="size-20" aria-hidden />
        <p className="text-4xl font-bold">+1 Stempel!</p>
        <p className="text-2xl tabular-nums">{card.logoEmoji} {card.currentStamps} / {card.stampsRequired}</p>
      </div>
    );
  }
  if (outcome.kind === 'redeemed') {
    return (
      <div role="status" className={`${base} bg-indigo-700`} onClick={onDismiss}>
        <PartyPopper className="size-20" aria-hidden />
        <p className="text-3xl font-bold">Prämie eingelöst</p>
        <p className="text-xl">{card.rewardTitle}</p>
      </div>
    );
  }
  return (
    <div role="alertdialog" aria-label="Karte voll" className={`${base} bg-amber-500 text-stone-950`}>
      <Gift className="size-20" aria-hidden />
      <p className="text-3xl font-bold">Karte voll!</p>
      <p className="text-xl">{card.rewardTitle}</p>
      <button className="btn min-h-16 w-full max-w-sm bg-stone-950 text-xl text-white" onClick={() => onRedeem(card, outcome.ticket)}>Prämie einlösen</button>
      <button className="btn w-full max-w-sm border-2 border-stone-950" onClick={onDismiss}>Später</button>
    </div>
  );
}
