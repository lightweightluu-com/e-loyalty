import { describe, expect, it } from 'vitest';
import { createQrPayload, createRedeemTicket, parseQrPayload, verifyQrPayload, verifyRedeemTicket, QR_WINDOW_SECONDS } from './qr-token';

const card = { id: '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b', secretToken: 'secret-one' };
const T0 = 1_800_000_000_000;

describe('QR-Payload', () => {
  const parsed = () => parseQrPayload(createQrPayload(card, T0).payload)!;

  it('wird akzeptiert im selben und im nächsten Fenster', () => {
    expect(verifyQrPayload(parsed(), card.secretToken, T0)).toBe('ok');
    expect(verifyQrPayload(parsed(), card.secretToken, T0 + QR_WINDOW_SECONDS * 1000)).toBe('ok');
  });

  it('läuft nach zwei Fenstern ab', () => {
    expect(verifyQrPayload(parsed(), card.secretToken, T0 + 2 * QR_WINDOW_SECONDS * 1000)).toBe('expired');
  });

  it('lehnt falsches Kartengeheimnis und manipulierte Felder ab', () => {
    expect(verifyQrPayload(parsed(), 'secret-two', T0)).toBe('bad_signature');
    expect(verifyQrPayload({ ...parsed(), windowIdx: parsed().windowIdx + 1 }, card.secretToken, T0)).toBe('bad_signature');
    expect(verifyQrPayload({ ...parsed(), cardId: card.id.replace('3', '4') }, card.secretToken, T0)).toBe('bad_signature');
  });

  it('enthält keine URL und lehnt fremde Formate ab', () => {
    expect(createQrPayload(card, T0).payload).not.toMatch(/https?:/);
    expect(parseQrPayload('https://example.com/card/' + card.id)).toBeNull();
    expect(parseQrPayload('LC1.nope.1.x')).toBeNull();
  });
});

describe('Einlöse-Ticket', () => {
  it('gilt nur für Karte + Händler und verfällt', () => {
    const t = createRedeemTicket(card.id, 'm1', T0);
    expect(verifyRedeemTicket(t, card.id, 'm1', T0 + 1000)).toBe(true);
    expect(verifyRedeemTicket(t, card.id, 'm2', T0 + 1000)).toBe(false);
    expect(verifyRedeemTicket(t, 'other', 'm1', T0 + 1000)).toBe(false);
    expect(verifyRedeemTicket(t, card.id, 'm1', T0 + 6 * 60_000)).toBe(false);
  });
});
