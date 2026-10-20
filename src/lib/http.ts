import { NextResponse } from 'next/server';
import { ZodType } from 'zod';

const NO_STORE = { 'Cache-Control': 'no-store' };

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(data, { status, headers: { ...NO_STORE, ...headers } });

/** Einheitliches Fehlerformat: { error: { code, message } } – `code` ist maschinenlesbar für die UI. */
export const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  json({ error: { code, message, ...extra } }, status);

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown;
  try { raw = await req.json(); } catch { return { response: fail(400, 'invalid_json', 'Ungültiger Request-Body.') }; }
  const res = schema.safeParse(raw);
  return res.success ? { data: res.data } : { response: fail(422, 'validation_failed', 'Eingabe ungültig.', { issues: res.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }) };
}

export function clientIp(req: Request) {
  // Hinter einem Reverse-Proxy (Caddy/nginx/Cloudflare) gesetzt; sonst "unknown".
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}
