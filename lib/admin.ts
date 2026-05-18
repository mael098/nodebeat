import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function getAdminUser(request: NextRequest) {
  const currentUser = await getAuthenticatedUser(request);

  if (!currentUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    select: { isAdmin: true },
  });

  return user?.isAdmin ? currentUser : null;
}

export async function checkUserAccess(userId: number): Promise<boolean> {
  const access = await prisma.userAccess.findUnique({
    where: { userId },
  });

  if (!access) {
    return false;
  }

  const now = new Date();
  return access.downloadEnabled && access.expiresAt > now;
}
