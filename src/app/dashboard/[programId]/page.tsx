import { ArrowLeft, Printer, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QrCode } from '@/components/QrCode';
import { StampCard } from '@/components/StampCard';
import { requireMerchant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function ProgramPage({ params }: { params: Promise<{ programId: string }> }) {
  const merchant = await requireMerchant();
  const { programId } = await params;
  // Besitz prüfen: fremde IDs verhalten sich wie nicht vorhanden.
  const program = await db.loyaltyProgram.findFirst({ where: { id: programId, merchantId: merchant.id }, include: { _count: { select: { cards: true } } } });
  if (!program) notFound();
  const redeemed = await db.transaction.count({ where: { type: 'REWARD_REDEEMED', card: { programId } } });
  const joinUrl = `${env.appUrl}/join/${program.id}`;

  return (
    <main className="page flex flex-col gap-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm underline"><ArrowLeft className="size-4" aria-hidden /> Übersicht</Link>
      <StampCard {...program} currentStamps={program.stampsRequired} />
      <p className="text-center text-sm text-stone-600 dark:text-stone-400">{program._count.cards} Karten ausgegeben · {redeemed} Prämien eingelöst</p>

      <section className="panel flex flex-col items-center gap-3 text-center">
        <h2 className="font-medium">Aufsteller-QR-Code</h2>
        <QrCode value={joinUrl} label={`QR-Code zum Beitreten bei ${program.shopName}`} />
        <p className="break-all text-xs text-stone-600 dark:text-stone-400">{joinUrl}</p>
      </section>

      <div className="flex flex-col gap-3">
        <Link href={`/poster/${program.id}`} className="btn-primary"><Printer className="size-5" aria-hidden /> Plakat drucken / als PDF</Link>
        <Link href="/scan" className="btn-ghost"><ScanLine className="size-5" aria-hidden /> Scanner öffnen</Link>
      </div>
    </main>
  );
}
