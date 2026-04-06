import NextAuth from 'next-auth';
import type { DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Resend from 'next-auth/providers/resend';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/auth/email';
import { hashNormalizedEmail } from '@/lib/billing/crypto';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            isPro: boolean;
            plan: string;
        } & DefaultSession['user'];
    }
}

function debugLog(
    runId: string,
    hypothesisId: string,
    location: string,
    message: string,
    data: Record<string, unknown>,
) {
    return fetch('http://127.0.0.1:7243/ingest/d5b9b24e-cf56-4f8e-b90c-eeb7b2ed6fe0', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '54f1f6',
        },
        body: JSON.stringify({
            sessionId: '54f1f6',
            runId,
            hypothesisId,
            location,
            message,
            data,
            timestamp: Date.now(),
        }),
    }).catch(() => {});
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Resend({
            apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM,
            // override sendVerificationRequest to only allow existing users
            sendVerificationRequest: async ({ identifier: email, url, provider }) => {
                const runId = `resend-${Date.now()}`;
                const normalizedEmail = normalizeEmail(email);
                const emailHashPrefix = hashNormalizedEmail(normalizedEmail).slice(0, 12);
                // #region agent log
                await debugLog(runId, 'H1-H2-H4', 'src/auth.ts:40', 'magic link send requested', {
                    emailHashPrefix,
                    hasResendApiKey: !!provider.apiKey,
                    hasEmailFrom: !!provider.from,
                    urlHost: (() => {
                        try {
                            return new URL(url).host;
                        } catch {
                            return 'invalid';
                        }
                    })(),
                });
                // #endregion

                // Only send link if user exists
                const user = await prisma.user.findUnique({
                    where: { email: normalizedEmail },
                });

                // #region agent log
                await debugLog(runId, 'H1', 'src/auth.ts:56', 'magic link user lookup completed', {
                    emailHashPrefix,
                    hasUser: !!user,
                });
                // #endregion

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

                // #region agent log
                await debugLog(runId, 'H2', 'src/auth.ts:85', 'magic link resend response received', {
                    emailHashPrefix,
                    ok: res.ok,
                    status: res.status,
                });
                // #endregion

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
            const runId = `signin-${Date.now()}`;
            const email =
                typeof user.email === 'string' ? normalizeEmail(user.email) : null;
            const emailHashPrefix = email ? hashNormalizedEmail(email).slice(0, 12) : null;
            // #region agent log
            await debugLog(runId, 'H3-H4', 'src/auth.ts:102', 'nextauth signIn callback entered', {
                provider: account?.provider ?? null,
                hasUserId: !!user.id,
                emailHashPrefix,
                hasProfile: !!profile,
            });
            // #endregion

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
        error: '/login?error=1',
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
