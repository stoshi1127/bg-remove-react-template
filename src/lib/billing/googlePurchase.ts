import type { Prisma, PrismaClient } from '@prisma/client';

export const GOOGLE_PURCHASE_TTL_MINUTES = 60;

type GooglePurchaseUserArgs = {
  email: string;
  googleSub: string;
  name?: string | null;
  image?: string | null;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function upsertGooglePurchaseUser(
  db: DbClient,
  args: GooglePurchaseUserArgs,
): Promise<{ userId: string }> {
  const now = new Date();
  const existingAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: args.googleSub,
      },
    },
    select: { userId: true },
  });

  if (existingAccount?.userId) {
    await db.user.update({
      where: { id: existingAccount.userId },
      data: {
        name: args.name ?? undefined,
        image: args.image ?? undefined,
        emailVerified: now,
        lastLoginAt: now,
        plan: 'pro',
        isPro: true,
        proValidUntil: null,
      },
    });

    return { userId: existingAccount.userId };
  }

  const user = await db.user.upsert({
    where: { email: args.email },
    create: {
      email: args.email,
      name: args.name ?? undefined,
      image: args.image ?? undefined,
      emailVerified: now,
      lastLoginAt: now,
      plan: 'pro',
      isPro: true,
      proValidUntil: null,
    },
    update: {
      name: args.name ?? undefined,
      image: args.image ?? undefined,
      emailVerified: now,
      lastLoginAt: now,
      plan: 'pro',
      isPro: true,
      proValidUntil: null,
    },
    select: { id: true },
  });

  await db.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: args.googleSub,
      },
    },
    create: {
      userId: user.id,
      type: 'oauth',
      provider: 'google',
      providerAccountId: args.googleSub,
    },
    update: {
      userId: user.id,
      type: 'oauth',
    },
  });

  return { userId: user.id };
}
