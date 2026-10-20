'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StampCard } from '@/components/StampCard';

const EMOJIS = ['🥙', '☕', '✂️', '🍕', '🥐', '🍦', '💈', '🌮'];
const COLORS = ['#b91c1c', '#c2410c', '#15803d', '#0f766e', '#1d4ed8', '#7e22ce', '#be185d', '#292524'];

export function ProgramForm() {
  const router = useRouter();
  const [v, setV] = useState({
    shopName: '', logoEmoji: '🥙', primaryColor: '#b91c1c', backgroundColor: '#fbf7f0', stampsRequired: 10, rewardTitle: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV(s => ({ ...s, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/merchant/programs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) });
      const data = await res.json();
      if (!res.ok) return setError(data.error?.issues?.[0]?.message ?? data.error?.message ?? 'Das hat nicht geklappt.');
      router.push(`/dashboard/${data.program.id}`);
    } catch {
      setError('Keine Verbindung. Bitte versuche es erneut.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Neue Stempelkarte</h1>
      <div aria-label="Vorschau"><StampCard {...v} shopName={v.shopName || 'Dein Geschäft'} rewardTitle={v.rewardTitle || 'Deine Belohnung'} currentStamps={Math.ceil(v.stampsRequired / 2)} /></div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <div><label className="label" htmlFor="shopName">Name des Ladens</label>
          <input className="input" id="shopName" required maxLength={60} value={v.shopName} onChange={e => set('shopName', e.target.value)} autoComplete="organization" /></div>

        <fieldset><legend className="label">Logo-Emoji</legend>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(em => (
              <button type="button" key={em} aria-pressed={v.logoEmoji === em} onClick={() => set('logoEmoji', em)}
                className="grid size-12 place-items-center rounded-xl border text-2xl aria-pressed:border-2 aria-pressed:border-emerald-700 dark:border-stone-700 border-stone-300">{em}</button>
            ))}
            <label className="sr-only" htmlFor="emoji">Eigenes Emoji</label>
            <input id="emoji" className="input !w-20 text-center text-2xl" value={v.logoEmoji} onChange={e => set('logoEmoji', e.target.value.trim().slice(-8))} />
          </div></fieldset>

        <fieldset><legend className="label">Markenfarbe</legend>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map(c => (
              <button type="button" key={c} aria-label={`Farbe ${c}`} aria-pressed={v.primaryColor === c} onClick={() => set('primaryColor', c)}
                className="size-10 rounded-full ring-offset-2 ring-offset-stone-50 aria-pressed:ring-2 aria-pressed:ring-stone-900 dark:ring-offset-stone-950 dark:aria-pressed:ring-white" style={{ background: c }} />
            ))}
            <label className="sr-only" htmlFor="color">Eigene Farbe</label>
            <input id="color" type="color" className="size-10 rounded-full" value={v.primaryColor} onChange={e => set('primaryColor', e.target.value)} />
          </div></fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="label" htmlFor="stamps">Stempel nötig</label>
            <input className="input" id="stamps" type="number" inputMode="numeric" min={2} max={30} required value={v.stampsRequired}
              onChange={e => set('stampsRequired', Number(e.target.value))} /></div>
          <div><label className="label" htmlFor="bg">Kartenhintergrund</label>
            <input className="input p-1" id="bg" type="color" value={v.backgroundColor} onChange={e => set('backgroundColor', e.target.value)} /></div>
        </div>

        <div><label className="label" htmlFor="reward">Belohnung</label>
          <input className="input" id="reward" required maxLength={80} placeholder="z. B. 1x Gratis Kebab" value={v.rewardTitle} onChange={e => set('rewardTitle', e.target.value)} /></div>

        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="size-5 animate-spin" aria-hidden />} Karte erstellen</button>
      </form>
    </main>
  );
}
