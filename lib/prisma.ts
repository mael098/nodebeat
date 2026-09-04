import path from 'path';
import { PrismaClient } from '@/app/generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith('file:')) {
    return envUrl;
  }
  const dbPath = path.resolve(process.cwd(), 'prisma/dev.db');
  return `file:${dbPath}`;
}

const adapter = new PrismaBetterSqlite3({ url: getDatabaseUrl() });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
