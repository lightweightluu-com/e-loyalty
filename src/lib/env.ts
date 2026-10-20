const isProd = process.env.NODE_ENV === 'production';

function secret(name: string): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (isProd) throw new Error(`${name} fehlt oder ist zu kurz (min. 32 Zeichen).`);
  console.warn(`[env] ${name} nicht gesetzt – unsicherer Dev-Fallback aktiv.`);
  return `dev-only-insecure-${name}-`.padEnd(32, 'x');
}

export const env = {
  isProd,
  get authSecret() { return secret('AUTH_SECRET'); },
  get qrSecret() { return secret('QR_SIGNING_SECRET'); },
  appUrl: (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  stampCooldownSeconds: Number(process.env.STAMP_COOLDOWN_SECONDS ?? 30),
};
