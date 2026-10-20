import type { WalletAdapter } from './types';

/**
 * Apple Wallet: vorbereitet, aber standardmässig inaktiv – braucht ein kostenpflichtiges
 * Apple-Developer-Zertifikat (Pass Type ID). Ohne Konfiguration nutzen iPhone-Kunden die PWA-Karte.
 *
 * Vorgesehene Umsetzung (Teil 2, wenn Zertifikate vorliegen):
 *  - `passkit-generator` erzeugt die .pkpass-Datei (createAddToWalletUrl → /api/cards/[id]/apple.pkpass)
 *  - Web-Service-Endpunkte für Geräte-Registrierung (/v1/devices/..., /v1/passes/...)
 *  - notifyCardUpdated sendet einen leeren APNs-Push an die registrierten Geräte
 */
export const appleWallet: WalletAdapter = {
  id: 'apple',

  isConfigured: () => !!(process.env.APPLE_PASS_TYPE_ID && process.env.APPLE_TEAM_ID),

  async createAddToWalletUrl() {
    throw new Error('Apple Wallet ist noch nicht implementiert (Teil 2).');
  },

  async notifyCardUpdated() {
    return { status: 'skipped', reason: this.isConfigured() ? 'not_implemented' : 'not_configured' };
  },
};
