import { cookies } from 'next/headers';
import type { User } from '@prisma/client';

import { prisma } from '@/lib/db';
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from '@/lib/auth/constants';
import { generateRandomToken, sha256Hex } from '@/lib/auth/crypto';

type CurrentUser = Pick<User, 'id' | 'email' | 'createdAt' | 'lastLoginAt'>;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionTokenHash = sha256Hex(token);
  const now = new Date();

  const session = await prisma.session.findFirst({
    where: {
      sessionTokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: { user: true },
  });

  if (!session) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    createdAt: session.user.createdAt,
    lastLoginAt: session.user.lastLoginAt,
  };
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRandomToken(32);
  const sessionTokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      sessionTokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const sessionTokenHash = sha256Hex(token);

  await prisma.session.updateMany({
    where: { sessionTokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

