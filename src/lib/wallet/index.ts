import type { CardSnapshot } from '../cards';
import { appleWallet } from './apple';
import { googleWallet } from './google';
import type { WalletAdapter, WalletId } from './types';

const adapters: Record<WalletId, WalletAdapter> = { google: googleWallet, apple: appleWallet };

export const getWalletAdapter = (id: WalletId) => adapters[id];

/** Welche Wallet-Buttons soll die UI anbieten? (Nur konfigurierte; sonst bleibt die PWA-Karte.) */
export const availableWallets = (): WalletId[] =>
  (Object.values(adapters) as WalletAdapter[]).filter(a => a.isConfigured()).map(a => a.id);

/** Push-Trigger nach Kartenänderung. Fehler eines Adapters dürfen den Scan nie scheitern lassen. */
export async function notifyWallets(card: CardSnapshot) {
  await Promise.all(
    Object.values(adapters).map(a =>
      a.notifyCardUpdated(card).catch(err => console.error(`[wallet:${a.id}] Push fehlgeschlagen`, err)),
    ),
  );
}
