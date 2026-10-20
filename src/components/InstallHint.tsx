'use client';

import { Share, SquarePlus, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void> };

/** „Zum Home-Bildschirm“: Android per Install-Prompt, iOS als Anleitung. Nach der Installation unsichtbar. */
export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [mode, setMode] = useState<'hidden' | 'ios' | 'other'>('hidden');

  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone) return;
    setMode(/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'other');
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallEvent); };
    addEventListener('beforeinstallprompt', onPrompt);
    return () => removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (mode === 'hidden') return null;
  if (prompt) {
    return (
      <button className="btn-ghost w-full" onClick={() => prompt.prompt()}>
        <Download className="size-5" aria-hidden /> Karte auf den Home-Bildschirm
      </button>
    );
  }
  if (mode !== 'ios') return null;
  return (
    <p className="panel flex items-start gap-3 text-sm text-stone-700 dark:text-stone-300">
      <SquarePlus className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>
        Karte immer griffbereit: tippe auf <Share className="inline size-4 align-text-bottom" aria-label="Teilen" /> und
        wähle «Zum Home-Bildschirm».
      </span>
    </p>
  );
}
