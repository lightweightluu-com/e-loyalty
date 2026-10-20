import { PrismaClient } from '@prisma/client';

// Singleton, damit der Dev-Server beim Hot-Reload nicht Verbindungen anhäuft.
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.prisma = db;
