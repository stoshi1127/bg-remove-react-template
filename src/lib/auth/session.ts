import type { User } from '@prisma/client';
import { auth } from '@/auth';
import { SHA256 } from 'crypto-js';

// Removed constant imports as they are managed by NextAuth now
// Removed generation since NextAuth manages session tokens
export function sha256Hex(data: string): string {
  return SHA256(data).toString();
}

type CurrentUser = Pick<User, 'id' | 'email' | 'createdAt' | 'lastLoginAt' | 'plan' | 'isPro' | 'proValidUntil'>;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // NextAuth tokenizes the session, but we also want to return the same shape as before.
  // We can fetch the user from the DB to ensure freshness, or just return from session.
  // To keep it perfectly consistent with previous behavior, let's fetch from DB using the ID.
  // Note: if performance is critical, we could just return the session data, but the previous implementation also hit the DB.

  const { prisma } = await import('@/lib/db');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    plan: user.plan,
    isPro: user.isPro,
    proValidUntil: user.proValidUntil,
  };
}

export async function createSession(): Promise<{ token: string; expiresAt: Date }> {
  throw new Error("createSession is deprecated. NextAuth handles sessions automatically.");
}

export async function revokeSessionByToken(): Promise<void> {
  throw new Error("revokeSessionByToken is deprecated. NextAuth handles sessions automatically.");
}
