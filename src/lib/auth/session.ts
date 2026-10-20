import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '../db';
import { env } from '../env';

export const SESSION_COOKIE = 'lc_session';
const SESSION_TTL_S = 60 * 60 * 24 * 14;

// Zustandsloses, signiertes Cookie: base64url({sub,exp}).hmac
const mac = (body: string) => createHmac('sha256', env.authSecret).update(body).digest('base64url');

export function createSessionToken(merchantId: string, nowMs = Date.now()) {
  const body = Buffer.from(JSON.stringify({ sub: merchantId, exp: nowMs + SESSION_TTL_S * 1000 })).toString('base64url');
  return `${body}.${mac(body)}`;
}

export function readSessionToken(token: string | undefined, nowMs = Date.now()): string | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(mac(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    return typeof sub === 'string' && exp > nowMs ? sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(merchantId: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(merchantId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: '/',
    maxAge: SESSION_TTL_S,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Aktueller Händler oder null. Prüft gegen die DB, damit gelöschte Konten sofort draussen sind. */
export async function getCurrentMerchant() {
  const id = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  return id ? db.merchant.findUnique({ where: { id }, select: { id: true, email: true, name: true } }) : null;
}

/** Für Server-Komponenten: Händler oder Weiterleitung auf /login. */
export async function requireMerchant() {
  const merchant = await getCurrentMerchant();
  if (!merchant) (await import('next/navigation')).redirect('/login');
  return merchant!;
}
