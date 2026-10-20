import { EventEmitter } from 'node:events';

// In-Process-Bus: der Scan-Endpunkt veröffentlicht, offene SSE-Streams der Kunden hören zu.
// Der Stream fragt zusätzlich periodisch die DB ab, damit es auch mit mehreren Prozessen funktioniert.
const g = globalThis as unknown as { cardBus?: EventEmitter };
const bus = g.cardBus ?? new EventEmitter().setMaxListeners(0);
g.cardBus = bus;

export const publishCardChanged = (cardId: string) => bus.emit(cardId);

export function subscribeCard(cardId: string, listener: () => void) {
  bus.on(cardId, listener);
  return () => void bus.off(cardId, listener);
}
