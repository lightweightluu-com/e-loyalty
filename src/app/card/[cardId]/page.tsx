import { notFound } from 'next/navigation';
import { findCard, toSnapshot } from '@/lib/cards';
import { cardIdSchema } from '@/lib/ids';
import { availableWallets } from '@/lib/wallet';
import { CardLive } from './CardLive';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Deine Stempelkarte', robots: { index: false } };

export default async function CardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  if (!cardIdSchema.safeParse(cardId).success) notFound();
  const card = await findCard(cardId);
  if (!card) notFound();
  return <CardLive initial={toSnapshot(card)} wallets={availableWallets()} />;
}
