import { prisma } from '@/lib/db';
import { MAGIC_LINK_TOKEN_TTL_MINUTES } from '@/lib/auth/constants';
import { generateRandomToken, sha256Hex } from '@/lib/auth/crypto';

export async function createMagicLinkToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRandomToken(32);
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.authToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function consumeMagicLinkToken(token: string): Promise<{ userId: string } | null> {
  const tokenHash = sha256Hex(token);
  const now = new Date();

  // Mark as used atomically-ish (best-effort). If two requests race, one should win.
  const authToken = await prisma.authToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!authToken) return null;

  await prisma.authToken.update({
    where: { id: authToken.id },
    data: { usedAt: now },
  });

  return { userId: authToken.userId };
}

