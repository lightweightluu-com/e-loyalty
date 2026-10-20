import { NextResponse } from 'next/server';
import { findCard, toSnapshot } from '@/lib/cards';
import { fail } from '@/lib/http';
import { cardIdSchema } from '@/lib/ids';
import { getWalletAdapter } from '@/lib/wallet';

export const runtime = 'nodejs';

/** Leitet zum „Zu Wallet hinzufügen“-Link weiter. 404, solange die Wallet nicht konfiguriert ist. */
export async function GET(_req: Request, { params }: { params: Promise<{ cardId: string; wallet: string }> }) {
  const { cardId, wallet } = await params;
  if (!cardIdSchema.safeParse(cardId).success || (wallet !== 'google' && wallet !== 'apple')) {
    return fail(404, 'not_found', 'Nicht gefunden.');
  }
  const adapter = getWalletAdapter(wallet);
  const card = await findCard(cardId);
  if (!card || !adapter.isConfigured()) return fail(404, 'wallet_unavailable', 'Diese Wallet ist nicht verfügbar.');
  try {
    return NextResponse.redirect(await adapter.createAddToWalletUrl(toSnapshot(card), { programId: card.programId }));
  } catch {
    return fail(501, 'wallet_unavailable', 'Diese Wallet ist noch nicht verfügbar.');
  }
}
