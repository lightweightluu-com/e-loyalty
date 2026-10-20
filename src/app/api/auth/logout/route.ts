import { clearSessionCookie } from '@/lib/auth/session';
import { json } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
