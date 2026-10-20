import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/PrintButton';
import { PosterQr } from '@/components/QrCode';
import { requireMerchant } from '@/lib/auth/session';
import { readableOn } from '@/lib/color';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plakat' };

const u = (mm: number) => `calc(var(--u) * ${mm})`;

/** A4-Aufsteller. „Drucken“ → Browser-Dialog → auch „Als PDF speichern“. */
export default async function Poster({ params }: { params: Promise<{ programId: string }> }) {
  const merchant = await requireMerchant();
  const { programId } = await params;
  const p = await db.loyaltyProgram.findFirst({ where: { id: programId, merchantId: merchant.id } });
  if (!p) notFound();

  return (
    <main className="min-h-dvh bg-stone-200 p-4 print:bg-white print:p-0 dark:bg-stone-800">
      <style>{`@page { size: A4; margin: 0 } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className="mb-4 flex justify-center print:hidden"><PrintButton /></div>
      {/* Masse in mm-Einheiten, relativ zur Breite: Vorschau skaliert auf dem Handy, Druck ist exakt A4. */}
      <div className="mx-auto w-full max-w-[210mm] [container-type:inline-size] print:max-w-none print:w-[210mm]">
        <article
          className="flex flex-col items-center justify-between text-center"
          style={{ ['--u' as string]: 'calc(100cqw / 210)', aspectRatio: '210 / 297', padding: u(12), background: p.primaryColor, color: readableOn(p.primaryColor) }}
        >
          <div style={{ marginTop: u(6) }}>
            <div style={{ fontSize: u(28), lineHeight: 1 }} aria-hidden>{p.logoEmoji}</div>
            <h1 className="font-bold leading-tight" style={{ fontSize: u(14), marginTop: u(4) }}>{p.shopName}</h1>
          </div>
          <div>
            <p className="font-semibold" style={{ fontSize: u(9) }}>Sammle {p.stampsRequired} Stempel</p>
            <p className="opacity-90" style={{ fontSize: u(7) }}>und erhalte: {p.rewardTitle}</p>
          </div>
          <div className="bg-white" style={{ borderRadius: u(6), padding: u(3) }}>
            <PosterQr value={`${env.appUrl}/join/${p.id}`} label="QR-Code: Stempelkarte holen" />
          </div>
          <p className="font-medium" style={{ fontSize: u(6), marginBottom: u(4) }}>Mit der Handy-Kamera scannen – keine App, keine Anmeldung.</p>
        </article>
      </div>
    </main>
  );
}
