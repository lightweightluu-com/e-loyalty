import { z } from 'zod';
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { clientIp, fail, json, parseBody } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({ email: z.email().transform(e => e.toLowerCase()), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const limit = rateLimit(`login:${clientIp(req)}`, 10, 15 * 60_000);
  if (!limit.ok) return fail(429, 'rate_limited', 'Zu viele Versuche. Bitte später erneut.', { retryAfterS: limit.retryAfterS });

  const parsed = await parseBody(req, schema);
  if ('response' in parsed) return parsed.response;

  const merchant = await db.merchant.findUnique({ where: { email: parsed.data.email } });
  const ok = await verifyPassword(parsed.data.password, merchant?.passwordHash ?? DUMMY_HASH);
  if (!merchant || !ok) return fail(401, 'invalid_credentials', 'E-Mail oder Passwort stimmt nicht.');

  await setSessionCookie(merchant.id);
  return json({ merchant: { id: merchant.id, email: merchant.email, name: merchant.name } });
}
