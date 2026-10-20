import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { env } from './env';

/**
 * Kunden-QR-Payload:  LC1.<cardId>.<zeitfenster>.<signatur>
 *
 * - Enthält bewusst KEINE URL: eine normale Kamera kann damit nichts auslösen.
 *   Eingelöst wird er nur über POST /api/merchant/scan (Händler-Session nötig).
 * - Signatur = HMAC-SHA256 mit einem Schlüssel, der aus Server-Secret UND
 *   dem Geheimnis der Karte abgeleitet wird (DB-Leak allein reicht nicht zum Fälschen).
 * - Das Zeitfenster (30 s) macht Screenshots wertlos: weitergeleitete QR-Codes
 *   verfallen nach spätestens ~60 s (aktuelles + vorheriges Fenster gelten).
 */
export const QR_PREFIX = 'LC1';
export const QR_WINDOW_SECONDS = 30;

const b64url = (buf: Buffer) => buf.toString('base64url');

export function newCardSecret(): string {
  return randomBytes(32).toString('base64url');
}

function cardKey(secretToken: string): Buffer {
  return createHmac('sha256', env.qrSecret).update(secretToken).digest();
}

function sign(key: Buffer, cardId: string, windowIdx: number): string {
  return b64url(createHmac('sha256', key).update(`${cardId}.${windowIdx}`).digest().subarray(0, 18));
}

const windowOf = (nowMs: number) => Math.floor(nowMs / 1000 / QR_WINDOW_SECONDS);

export function createQrPayload(card: { id: string; secretToken: string }, nowMs = Date.now()) {
  const w = windowOf(nowMs);
  return {
    payload: `${QR_PREFIX}.${card.id}.${w}.${sign(cardKey(card.secretToken), card.id, w)}`,
    // Ab hier sollte der Client einen frischen Payload holen (Stream tut das automatisch).
    refreshAt: (w + 1) * QR_WINDOW_SECONDS * 1000,
  };
}

const PAYLOAD_RE = /^LC1\.([0-9a-f-]{36})\.(\d{1,10})\.([A-Za-z0-9_-]{24})$/;

/** Schritt 1: Format prüfen und cardId extrahieren (noch nichts vertrauenswürdig). */
export function parseQrPayload(raw: string) {
  const m = PAYLOAD_RE.exec(raw.trim());
  return m ? { cardId: m[1], windowIdx: Number(m[2]), signature: m[3] } : null;
}

export type QrVerifyResult = 'ok' | 'bad_signature' | 'expired';

/** Schritt 2: mit dem Kartengeheimnis aus der DB prüfen. Konstante Laufzeit beim Vergleich. */
export function verifyQrPayload(
  parsed: { cardId: string; windowIdx: number; signature: string },
  secretToken: string,
  nowMs = Date.now(),
): QrVerifyResult {
  const expected = Buffer.from(sign(cardKey(secretToken), parsed.cardId, parsed.windowIdx));
  const given = Buffer.from(parsed.signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'bad_signature';
  const age = windowOf(nowMs) - parsed.windowIdx;
  return age >= 0 && age <= 1 ? 'ok' : 'expired';
}

/**
 * Kurzlebiges Einlöse-Ticket: Nach einem Scan einer vollen Karte darf der Händler
 * in Ruhe auf „Prämie einlösen“ tippen, ohne dass der QR-Code (60 s) abläuft.
 */
const TICKET_TTL_MS = 5 * 60_000;

export function createRedeemTicket(cardId: string, merchantId: string, nowMs = Date.now()) {
  const exp = nowMs + TICKET_TTL_MS;
  const mac = createHmac('sha256', env.qrSecret).update(`redeem.${cardId}.${merchantId}.${exp}`).digest('base64url');
  return `${exp}.${mac}`;
}

export function verifyRedeemTicket(ticket: string, cardId: string, merchantId: string, nowMs = Date.now()) {
  const [expStr, mac] = ticket.split('.');
  const exp = Number(expStr);
  if (!mac || !Number.isFinite(exp) || exp < nowMs) return false;
  const expected = createHmac('sha256', env.qrSecret).update(`redeem.${cardId}.${merchantId}.${exp}`).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
