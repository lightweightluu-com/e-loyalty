import { getCurrentMerchant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { fail, json, parseBody } from '@/lib/http';
import { programSchema } from '@/lib/program-schema';

export const runtime = 'nodejs';

export async function GET() {
  const merchant = await getCurrentMerchant();
  if (!merchant) return fail(401, 'unauthorized', 'Bitte anmelden.');
  const programs = await db.loyaltyProgram.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: 'desc' } });
  return json({ programs });
}

export async function POST(req: Request) {
  const merchant = await getCurrentMerchant();
  if (!merchant) return fail(401, 'unauthorized', 'Bitte anmelden.');
  const parsed = await parseBody(req, programSchema);
  if ('response' in parsed) return parsed.response;
  if ((await db.loyaltyProgram.count({ where: { merchantId: merchant.id } })) >= 20) {
    return fail(409, 'limit_reached', 'Maximal 20 Programme pro Konto.');
  }
  const program = await db.loyaltyProgram.create({ data: { ...parsed.data, merchantId: merchant.id } });
  return json({ program }, 201);
}
