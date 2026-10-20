import { z } from 'zod';
import { hashPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { clientIp, fail, json, parseBody } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.email().max(254).transform(e => e.toLowerCase()),
  password: z.string().min(8, 'Mindestens 8 Zeichen.').max(200),
  name: z.string().trim().min(1).max(80),
});

export async function POST(req: Request) {
  const limit = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000);
  if (!limit.ok) return fail(429, 'rate_limited', 'Zu viele Versuche. Bitte später erneut.', { retryAfterS: limit.retryAfterS });

  const parsed = await parseBody(req, schema);
  if ('response' in parsed) return parsed.response;
  const { email, password, name } = parsed.data;

  if (await db.merchant.findUnique({ where: { email }, select: { id: true } })) {
    return fail(409, 'email_taken', 'Diese E-Mail ist bereits registriert.');
  }
  const merchant = await db.merchant.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  await setSessionCookie(merchant.id);
  return json({ merchant: { id: merchant.id, email, name } }, 201);
}
