import { after } from 'next/server';
import { z } from 'zod';
import { getCurrentMerchant } from '@/lib/auth/session';
import { publishCardChanged } from '@/lib/card-events';
import { addStamp, findCard, redeemReward, toSnapshot } from '@/lib/cards';
import { env } from '@/lib/env';
import { fail, json, parseBody } from '@/lib/http';
import { cardIdSchema } from '@/lib/ids';
import { parseQrPayload, verifyQrPayload, createRedeemTicket, verifyRedeemTicket } from '@/lib/qr-token';
import { rateLimit } from '@/lib/rate-limit';
import { notifyWallets } from '@/lib/wallet';

export const runtime = 'nodejs';

// Zwei Formen, ein Endpunkt:
//  { payload }                         → QR gescannt: stempeln (oder „Prämie bereit“ melden)
//  { action:'REDEEM', cardId, ticket } → Prämie einlösen (Ticket stammt aus der Scan-Antwort)
const bodySchema = z.union([
  z.object({ payload: z.string().min(1).max(200) }),
  z.object({ action: z.literal('REDEEM'), cardId: cardIdSchema, ticket: z.string().min(1).max(200) }),
]);

export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return fail(401, 'unauthorized', 'Bitte als Händler anmelden.');

  const limit = rateLimit(`scan:${merchant.id}`, 120, 60_000);
  if (!limit.ok) return fail(429, 'rate_limited', 'Zu viele Scans. Kurz warten.', { retryAfterS: limit.retryAfterS });

  const parsed = await parseBody(req, bodySchema);
  if ('response' in parsed) return parsed.response;
  const body = parsed.data;

  // --- Einlösen -------------------------------------------------------------
  if ('action' in body) {
    if (!verifyRedeemTicket(body.ticket, body.cardId, merchant.id)) {
      return fail(403, 'invalid_ticket', 'Einlöse-Ticket ungültig oder abgelaufen. Karte bitte erneut scannen.');
    }
    const card = await findCard(body.cardId);
    if (!card || card.program.merchantId !== merchant.id) return fail(404, 'card_not_found', 'Karte nicht gefunden.');
    if (!(await redeemReward(card))) return fail(409, 'reward_not_ready', 'Die Karte ist nicht voll oder wurde bereits eingelöst.');
    return respond('REWARD_REDEEMED', body.cardId, merchant.id);
  }

  // --- Scannen / Stempeln ---------------------------------------------------
  const qr = parseQrPayload(body.payload);
  if (!qr) return fail(400, 'invalid_qr', 'Das ist kein Stempelkarten-Code.');

  const card = await findCard(qr.cardId);
  // Unbekannte Karte und falsche Signatur sehen für den Aufrufer gleich aus.
  if (!card) return fail(400, 'invalid_qr', 'Das ist kein gültiger Stempelkarten-Code.');

  const verdict = verifyQrPayload(qr, card.secretToken);
  if (verdict === 'bad_signature') return fail(400, 'invalid_qr', 'Das ist kein gültiger Stempelkarten-Code.');
  if (verdict === 'expired') return fail(410, 'qr_expired', 'Code abgelaufen – der Kunde soll die Karte kurz neu öffnen.');

  if (card.program.merchantId !== merchant.id) {
    return fail(403, 'wrong_merchant', 'Diese Karte gehört zu einem anderen Geschäft.');
  }

  if (card.currentStamps >= card.program.stampsRequired) {
    return respond('REWARD_READY', card.id, merchant.id);
  }

  if (!(await addStamp(card, env.stampCooldownSeconds * 1000))) {
    // Verloren gegen einen parallelen Scan, Karte inzwischen voll, oder Abkühlzeit aktiv.
    const fresh = (await findCard(card.id))!;
    if (fresh.currentStamps >= fresh.program.stampsRequired) return respond('REWARD_READY', card.id, merchant.id);
    const retryAfterS = Math.max(1, Math.ceil(((fresh.lastStampAt?.getTime() ?? 0) + env.stampCooldownSeconds * 1000 - Date.now()) / 1000));
    return fail(429, 'cooldown', `Gerade erst gestempelt – bitte ${retryAfterS} s warten.`, { retryAfterS });
  }
  return respond('STAMP_ADDED', card.id, merchant.id);
}

/** Frischen Zustand laden, Kunde live benachrichtigen, Wallets anstossen, Händler-Antwort bauen. */
async function respond(result: 'STAMP_ADDED' | 'REWARD_READY' | 'REWARD_REDEEMED', cardId: string, merchantId: string) {
  const card = (await findCard(cardId))!;
  const snapshot = toSnapshot(card);

  if (result !== 'REWARD_READY') {
    publishCardChanged(card.id);                  // SSE → Kunden-Handy, sofort
    after(() => notifyWallets(snapshot));         // Google/Apple Wallet, nach der Antwort
  }

  // Der QR-Payload gehört dem Kunden, nicht in die Händler-Antwort.
  const { qr: _qr, ...card_ } = snapshot;
  return json({
    result,
    card: card_,
    // Nur wenn die Karte voll ist: Ticket, mit dem die UI „Prämie einlösen“ auslöst.
    redeemTicket: snapshot.rewardReady ? createRedeemTicket(card.id, merchantId) : null,
  });
}
