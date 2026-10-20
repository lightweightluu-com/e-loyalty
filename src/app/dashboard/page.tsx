import { Plus, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import { requireMerchant } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard – E-Loyalty' };

export default async function Dashboard() {
  const merchant = await requireMerchant();
  const programs = await db.loyaltyProgram.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { cards: true } } },
  });
  const counts = await db.transaction.groupBy({
    by: ['type'],
    where: { card: { program: { merchantId: merchant.id } } },
    _count: true,
  });
  const stamps = counts.find(c => c.type === 'STAMP_ADDED')?._count ?? 0;
  const rewards = counts.find(c => c.type === 'REWARD_REDEEMED')?._count ?? 0;

  return (
    <main className="page flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hallo, {merchant.name}</h1>
        <LogoutButton />
      </header>

      <Link href="/scan" className="btn-primary h-16 text-lg"><ScanLine className="size-6" aria-hidden /> Scanner öffnen</Link>

      <dl className="grid grid-cols-3 gap-3 text-center">
        {[['Karten', programs.reduce((n, p) => n + p._count.cards, 0)], ['Stempel', stamps], ['Prämien', rewards]].map(([label, value]) => (
          <div key={label} className="panel p-3"><dt className="text-sm text-stone-600 dark:text-stone-400">{label}</dt><dd className="text-2xl font-semibold tabular-nums">{value}</dd></div>
        ))}
      </dl>

      <section aria-labelledby="progs" className="flex flex-col gap-3">
        <h2 id="progs" className="font-medium">Deine Stempelkarten</h2>
        {programs.length === 0 && (
          <p className="panel text-stone-600 dark:text-stone-400">Noch keine Karte. Erstelle deine erste in unter einer Minute.</p>
        )}
        {programs.map(p => (
          <Link key={p.id} href={`/dashboard/${p.id}`} className="panel flex items-center gap-3 transition hover:shadow-md">
            <span className="grid size-12 place-items-center rounded-2xl text-2xl" style={{ background: p.primaryColor }} aria-hidden>{p.logoEmoji}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.shopName}</span>
              <span className="block truncate text-sm text-stone-600 dark:text-stone-400">{p.stampsRequired} Stempel · {p.rewardTitle}</span></span>
            <span className="text-sm tabular-nums text-stone-600 dark:text-stone-400">{p._count.cards} Karten</span>
          </Link>
        ))}
        <Link href="/dashboard/new" className="btn-ghost"><Plus className="size-5" aria-hidden /> Neue Stempelkarte</Link>
      </section>
    </main>
  );
}
