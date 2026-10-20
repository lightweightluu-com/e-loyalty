// Demo-Daten für die lokale Entwicklung:  npm run db:seed
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';

const db = new PrismaClient();

async function main() {
  const merchant = await db.merchant.upsert({
    where: { email: 'demo@kebab.ch' },
    update: {},
    create: { email: 'demo@kebab.ch', name: 'Demo Kebab', passwordHash: await hashPassword('demo1234') },
  });
  const program = (await db.loyaltyProgram.findFirst({ where: { merchantId: merchant.id } }))
    ?? await db.loyaltyProgram.create({
      data: { merchantId: merchant.id, shopName: 'Kebab Haus', logoEmoji: '🥙', primaryColor: '#b91c1c', stampsRequired: 10, rewardTitle: '1x Gratis Kebab' },
    });
  console.log(`Login: demo@kebab.ch / demo1234\nBeitritts-URL: /join/${program.id}\nProgramm-ID: ${program.id}`);
}

main().finally(() => db.$disconnect());
