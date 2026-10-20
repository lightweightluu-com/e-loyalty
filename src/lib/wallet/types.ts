import type { CardSnapshot } from '../cards';

export type WalletId = 'google' | 'apple';

export type WalletPushResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: 'not_configured' | 'not_installed' | 'not_implemented' };

/**
 * Jede native Wallet ist ein Adapter. Der Rest der App kennt nur dieses Interface;
 * ohne Konfiguration bleiben die Adapter inaktiv und die Web-Karte funktioniert allein.
 */
export interface WalletAdapter {
  readonly id: WalletId;
  isConfigured(): boolean;
  /** Link bzw. Datei, mit der der Kunde die Karte zur Wallet hinzufügt. */
  createAddToWalletUrl(card: CardSnapshot, ctx: { programId: string }): Promise<string>;
  /** Wird nach jeder Stempel-/Einlöse-Änderung aufgerufen (Push-Update der Pass-Daten). */
  notifyCardUpdated(card: CardSnapshot): Promise<WalletPushResult>;
}
