import Link from 'next/link';
import { StandaloneRedirect } from '@/components/StandaloneRedirect';

export default function Home() {
  return (
    <main className="page flex min-h-dvh flex-col justify-center gap-6">
      <StandaloneRedirect />
      <h1 className="text-4xl font-semibold leading-tight">Stempelkarten, die man nicht verliert.</h1>
      <p className="text-lg text-stone-600 dark:text-stone-400">
        Kunden scannen den Aufsteller und haben ihre Karte sofort auf dem Handy – ohne App, ohne Konto.
        Du stempelst mit einem Scan.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link className="btn-primary" href="/login?mode=register">Kostenlos starten</Link>
        <Link className="btn-ghost" href="/login">Anmelden</Link>
      </div>
    </main>
  );
}
