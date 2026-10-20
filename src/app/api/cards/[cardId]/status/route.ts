import { findCard, toSnapshot } from '@/lib/cards';
import { fail, json } from '@/lib/http';
import { cardIdSchema } from '@/lib/ids';

export const runtime = 'nodejs';

/** Polling-Fallback zum SSE-Stream (z. B. wenn ein Proxy Streams puffert). Enthält den aktuellen QR-Payload. */
export async function GET(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  if (!cardIdSchema.safeParse(cardId).success) return fail(404, 'card_not_found', 'Karte nicht gefunden.');
  const card = await findCard(cardId);
  return card ? json(toSnapshot(card)) : fail(404, 'card_not_found', 'Karte nicht gefunden.');
}
