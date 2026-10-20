import { cookies } from 'next/headers';
import { z } from 'zod';
import { createCard, cardUrl, findCard, toSnapshot } from '@/lib/cards';
import { clientIp, fail, json, parseBody } from '@/lib/http';
import { cardIdSchema } from '@/lib/ids';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const bodySchema = z.object({ existingCardId: cardIdSchema.optional() }).default({});

/**
 * Wird von der Seite /join/[programId] (Ziel des Aufsteller-QR-Codes) aufgerufen.
 * Bewusst POST statt GET: Link-Vorschauen und Prefetcher sollen keine Karten erzeugen.
 * Idempotent: Wer schon eine Karte hat (Body, sonst Cookie), bekommt dieselbe zurück.
 */
export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const jar = await cookies();
  const cookieName = `lc_card_${programId}`;

  let body: z.infer<typeof bodySchema> = {};
  if (req.headers.get('content-length') !== '0') {
    const parsed = await parseBody(req, bodySchema);
    if ('response' in parsed) return parsed.response;
    body = parsed.data;
  }

  for (const candidate of [body.existingCardId, jar.get(cookieName)?.value]) {
    if (!candidate || !cardIdSchema.safeParse(candidate).success) continue;
    const existing = await findCard(candidate);
    if (existing?.programId === programId) {
      return json({ created: false, cardId: existing.id, cardUrl: cardUrl(existing.id), card: toSnapshot(existing) });
    }
  }

  const limit = rateLimit(`card-create:${clientIp(req)}`, 10, 60 * 60_000);
  if (!limit.ok) return fail(429, 'rate_limited', 'Zu viele neue Karten. Bitte später erneut versuchen.', { retryAfterS: limit.retryAfterS });

  const created = await createCard(programId);
  if (!created) return fail(404, 'program_not_found', 'Dieses Treueprogramm existiert nicht.');
  const card = (await findCard(created.id))!;

  jar.set(cookieName, card.id, { path: '/', maxAge: 60 * 60 * 24 * 365 * 2, sameSite: 'lax', httpOnly: true });
  return json({ created: true, cardId: card.id, cardUrl: cardUrl(card.id), card: toSnapshot(card) }, 201);
}
