import { createSign } from 'node:crypto';
import { env } from '../env';
import type { WalletAdapter } from './types';

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

/**
 * Google Wallet via „Save to Google Wallet“-JWT (RS256). Das JWT enthält Klasse + Objekt,
 * Google legt sie beim Speichern an – kein vorheriger API-Call nötig.
 * Doku: https://developers.google.com/wallet/retail/loyalty-cards
 */
export function signGoogleWalletJwt(claims: object, privateKeyPem: string) {
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claims))}`;
  return `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(privateKeyPem, 'base64url')}`;
}

export const googleWallet: WalletAdapter = {
  id: 'google',

  isConfigured: () =>
    !!(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_WALLET_PRIVATE_KEY),

  async createAddToWalletUrl(card, { programId }) {
    const issuer = process.env.GOOGLE_WALLET_ISSUER_ID!;
    const classId = `${issuer}.program_${programId}`;
    const objectId = `${issuer}.card_${card.cardId.replaceAll('-', '_')}`;
    const jwt = signGoogleWalletJwt(
      {
        iss: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
        aud: 'google',
        typ: 'savetowallet',
        origins: [env.appUrl],
        payload: {
          loyaltyClasses: [{
            id: classId,
            issuerName: card.shopName,
            programName: card.shopName,
            reviewStatus: 'UNDER_REVIEW',
            hexBackgroundColor: card.primaryColor,
          }],
          loyaltyObjects: [{
            id: objectId,
            classId,
            state: 'ACTIVE',
            accountId: card.cardId,
            accountName: `${card.currentStamps}/${card.stampsRequired} Stempel`,
            loyaltyPoints: { label: 'Stempel', balance: { int: card.currentStamps } },
            barcode: { type: 'QR_CODE', value: `${env.appUrl}/card/${card.cardId}`, alternateText: card.rewardTitle },
          }],
        },
      },
      process.env.GOOGLE_WALLET_PRIVATE_KEY!.replaceAll('\\n', '\n'),
    );
    return `https://pay.google.com/gp/v/save/${jwt}`;
  },

  async notifyCardUpdated() {
    if (!this.isConfigured()) return { status: 'skipped', reason: 'not_configured' };
    // TODO(Teil 2): OAuth2-Token (Service-Account-JWT-Bearer) holen und
    // PATCH https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{id}
    // mit dem neuen Punktestand senden.
    return { status: 'skipped', reason: 'not_implemented' };
  },
};
