import NextAuth from 'next-auth';
import type { DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Resend from 'next-auth/providers/resend';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/auth/email';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            isPro: boolean;
            plan: string;
        } & DefaultSession['user'];
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: (() => {
        const baseAdapter = PrismaAdapter(prisma);
        return {
            ...baseAdapter,
            async deleteSession(sessionToken: string) {
                try {
                    const deleteSession = baseAdapter.deleteSession;
                    if (!deleteSession) {
                        return undefined;
                    }
                    await deleteSession(sessionToken);
                    return undefined;
                } catch (error) {
                    if (
                        error &&
                        typeof error === 'object' &&
                        'code' in error &&
                        (error as { code?: unknown }).code === 'P2025'
                    ) {
                        return undefined;
                    }
                    throw error;
                }
            },
        };
    })(),
    providers: [
        Resend({
            apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM,
            // override sendVerificationRequest to only allow existing users
            sendVerificationRequest: async ({ identifier: email, url, provider }) => {
                const normalizedEmail = normalizeEmail(email);

                // Only send link if user exists
                const user = await prisma.user.findUnique({
                    where: { email: normalizedEmail },
                });

                if (!user) {
                    // For privacy/security, we don't throw an error, we just silently fail to send the email.
                    // In signIn() we'll return a generic "Check your email" message anyway.
                    console.log(`Login attempt for non-existent email: ${email}`);
                    return;
                }

                // The URL is used as-is from NextAuth
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`\n\n========== DEV LOGIN LINK ==========\nTo: ${email}\nLink: ${url}\n====================================\n\n`);
                    return;
                }

                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${provider.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: provider.from,
                        to: email,
                        subject: 'QuickTools ログインリンク',
                        html: `
              <p>QuickTools（イージーカット）へのログインリンクです。</p>
              <p><a href="${url}">ログインする</a></p>
              <p>このリンクは一定時間で無効になります。心当たりがない場合は、このメールを破棄してください。</p>
            `.trim(),
                        text: `QuickTools（イージーカット）へのログインリンクです。\n\nログインするには以下のURLにアクセスしてください:\n${url}\n\nこのリンクは一定時間で無効になります。心当たりがない場合は、このメールを破棄してください。`,
                    }),
                });

                if (!res.ok) {
                    throw new Error('Resend error: ' + await res.text());
                }
            },
        }),
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            const email =
                typeof user.email === 'string' ? normalizeEmail(user.email) : null;

            if (account?.provider === 'google') {
                const providerAccountId =
                    typeof account.providerAccountId === 'string' ? account.providerAccountId : null;

                if (!email || !providerAccountId) {
                    return '/login?error=google_requires_purchase';
                }

                const [existingGoogleAccount, existingUserByEmail] = await Promise.all([
                    prisma.account.findUnique({
                        where: {
                            provider_providerAccountId: {
                                provider: 'google',
                                providerAccountId,
                            },
                        },
                        select: { userId: true },
                    }),
                    prisma.user.findUnique({
                        where: { email },
                        select: { id: true },
                    }),
                ]);

                if (!existingGoogleAccount && !existingUserByEmail) {
                    console.log('Blocked Google login for non-member account', {
                        email,
                        sub:
                            typeof profile === 'object' && profile && 'sub' in profile
                                ? profile.sub
                                : undefined,
                    });
                    return '/login?error=google_requires_purchase';
                }
            }
            // Allow all other sign in attempts (Resend handles restrictions in sendVerificationRequest)
            return true;
        },
        async session({ session, user }) {
            if (session.user && user) {
                // user object bound to db via adapter
                session.user.id = user.id;
                // @ts-expect-error - PrismaUser type has these fields
                session.user.isPro = user.isPro ?? false;
                // @ts-expect-error - PrismaUser type has these fields
                session.user.plan = user.plan ?? 'free';
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        verifyRequest: '/login?sent=1',
        error: '/login',
    },
    session: {
        strategy: 'database',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    // Prefer AUTH_SECRET across the app (also used by billing email encryption),
    // keep NEXTAUTH_SECRET as backward-compatible fallback.
    secret:
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        (process.env.NODE_ENV !== 'production' ? 'fallback_secret_for_dev_mode_only' : undefined),
});
