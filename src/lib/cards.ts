import { randomUUID } from 'node:crypto';
import type { CustomerCard, LoyaltyProgram } from '@prisma/client';
import { db } from './db';
import { env } from './env';
import { createQrPayload, newCardSecret } from './qr-token';

type CardWithProgram = CustomerCard & { program: LoyaltyProgram };

/** Öffentlicher Kartenzustand – genau das sieht der Kunde (Status-Endpoint und SSE). */
export function toSnapshot(card: CardWithProgram, nowMs = Date.now()) {
  const { program: p } = card;
  const qr = createQrPayload(card, nowMs);
  return {
    cardId: card.id,
    programId: card.programId,
    shopName: p.shopName,
    logoEmoji: p.logoEmoji,
    primaryColor: p.primaryColor,
    backgroundColor: p.backgroundColor,
    rewardTitle: p.rewardTitle,
    stampsRequired: p.stampsRequired,
    currentStamps: card.currentStamps,
    totalStampsCollected: card.totalStampsCollected,
    rewardsRedeemed: card.rewardsRedeemed,
    rewardReady: card.currentStamps >= p.stampsRequired,
    updatedAt: card.updatedAt.toISOString(),
    qr: { payload: qr.payload, refreshAt: qr.refreshAt },
  };
}
export type CardSnapshot = ReturnType<typeof toSnapshot>;

export const findCard = (cardId: string) =>
  db.customerCard.findUnique({ where: { id: cardId }, include: { program: true } });

export async function createCard(programId: string): Promise<CustomerCard | null> {
  if (!(await db.loyaltyProgram.count({ where: { id: programId } }))) return null;
  return db.customerCard.create({ data: { id: randomUUID(), programId, secretToken: newCardSecret() } });
}

export const cardUrl = (cardId: string) => `${env.appUrl}/card/${cardId}`;

/**
 * Atomar stempeln. Alle Bedingungen stehen im WHERE des UPDATE, damit zwei gleichzeitige
 * Scans nicht beide durchkommen (kein Check-then-act):
 *  - Karte noch nicht voll
 *  - Abkühlzeit seit dem letzten Stempel abgelaufen
 */
export async function addStamp(card: CardWithProgram, cooldownMs: number, now = new Date()) {
  const threshold = new Date(now.getTime() - cooldownMs);
  return db.$transaction(async tx => {
    const { count } = await tx.customerCard.updateMany({
      where: {
        id: card.id,
        currentStamps: { lt: card.program.stampsRequired },
        OR: [{ lastStampAt: null }, { lastStampAt: { lte: threshold } }],
      },
      data: { currentStamps: { increment: 1 }, totalStampsCollected: { increment: 1 }, lastStampAt: now },
    });
    if (count === 0) return false;
    await tx.transaction.create({ data: { cardId: card.id, type: 'STAMP_ADDED' } });
    return true;
  });
}

/** Atomar einlösen: nur wenn die Karte wirklich voll ist (Doppelklick-sicher). */
export async function redeemReward(card: CardWithProgram) {
  return db.$transaction(async tx => {
    const { count } = await tx.customerCard.updateMany({
      where: { id: card.id, currentStamps: { gte: card.program.stampsRequired } },
      data: { currentStamps: 0, rewardsRedeemed: { increment: 1 } },
    });
    if (count === 0) return false;
    await tx.transaction.create({ data: { cardId: card.id, type: 'REWARD_REDEEMED' } });
    return true;
  });
}
