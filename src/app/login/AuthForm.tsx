'use client';

import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>(useSearchParams().get('mode') === 'register' ? 'register' : 'login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: f.get('email'), password: f.get('password'), name: f.get('name') || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.issues?.[0]?.message ?? data.error?.message ?? 'Das hat nicht geklappt.'); return; }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Keine Verbindung. Bitte versuche es erneut.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page flex min-h-dvh flex-col justify-center gap-6">
      <h1 className="text-3xl font-semibold">{register ? 'Konto erstellen' : 'Willkommen zurück'}</h1>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate={false}>
        {register && (
          <div><label className="label" htmlFor="name">Name des Geschäfts oder deiner Person</label>
            <input className="input" id="name" name="name" required maxLength={80} autoComplete="organization" /></div>
        )}
        <div><label className="label" htmlFor="email">E-Mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" inputMode="email" /></div>
        <div><label className="label" htmlFor="password">Passwort{register && ' (mind. 8 Zeichen)'}</label>
          <input className="input" id="password" name="password" type="password" required minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} /></div>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {register ? 'Registrieren' : 'Anmelden'}
        </button>
      </form>
      <button className="text-sm underline" onClick={() => { setMode(register ? 'login' : 'register'); setError(null); }}>
        {register ? 'Schon ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
      </button>
    </main>
  );
}
