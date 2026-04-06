import NextAuth from 'next-auth';
import type { DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Resend from 'next-auth/providers/resend';
import Google from 'next-auth/providers/google';
import { cookies } from 'next/headers';
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

async function setMagicLinkDebugCookie(value: string) {
    try {
        const cookieStore = await cookies();
        const current = cookieStore.get('magic-link-debug')?.value;
        const next = current ? `${current} -> ${value}` : value;
        cookieStore.set('magic-link-debug', next.slice(-500), {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false,
            maxAge: 60 * 10,
        });
    } catch {
        // Never let debug instrumentation break auth flow.
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: (() => {
        const baseAdapter = PrismaAdapter(prisma);
        return {
            ...baseAdapter,
            async createUser(data: Parameters<NonNullable<typeof baseAdapter.createUser>>[0]) {
                try {
                    const createUser = baseAdapter.createUser;
                    if (!createUser) {
                        throw new Error('Adapter createUser is unavailable');
                    }
                    const result = await createUser(data);
                    await setMagicLinkDebugCookie('adapter_create_user_ok');
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_create_user_error');
                    throw error;
                }
            },
            async getUser(id: string) {
                try {
                    const getUser = baseAdapter.getUser;
                    if (!getUser) {
                        await setMagicLinkDebugCookie('adapter_get_user_unavailable');
                        return null;
                    }
                    const result = await getUser(id);
                    await setMagicLinkDebugCookie(result ? 'adapter_get_user_hit' : 'adapter_get_user_miss');
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_get_user_error');
                    throw error;
                }
            },
            async createVerificationToken(data: Parameters<NonNullable<typeof baseAdapter.createVerificationToken>>[0]) {
                try {
                    const createVerificationToken = baseAdapter.createVerificationToken;
                    if (!createVerificationToken) {
                        throw new Error('Adapter createVerificationToken is unavailable');
                    }
                    const result = await createVerificationToken(data);
                    await setMagicLinkDebugCookie('adapter_create_verification_token_ok');
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_create_verification_token_error');
                    throw error;
                }
            },
            async useVerificationToken(data: Parameters<NonNullable<typeof baseAdapter.useVerificationToken>>[0]) {
                try {
                    const adapterUseVerificationToken = baseAdapter.useVerificationToken;
                    if (!adapterUseVerificationToken) {
                        throw new Error('Adapter useVerificationToken is unavailable');
                    }
                    const result = await adapterUseVerificationToken(data);
                    await setMagicLinkDebugCookie(
                        result ? 'adapter_use_verification_token_ok' : 'adapter_use_verification_token_null',
                    );
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_use_verification_token_error');
                    throw error;
                }
            },
            async getUserByEmail(email: string) {
                try {
                    const getUserByEmail = baseAdapter.getUserByEmail;
                    if (!getUserByEmail) {
                        await setMagicLinkDebugCookie('adapter_get_user_by_email_unavailable');
                        return null;
                    }
                    const result = await getUserByEmail(email);
                    await setMagicLinkDebugCookie(
                        result ? 'adapter_get_user_by_email_hit' : 'adapter_get_user_by_email_miss',
                    );
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_get_user_by_email_error');
                    throw error;
                }
            },
            async updateUser(data: Parameters<NonNullable<typeof baseAdapter.updateUser>>[0]) {
                try {
                    const updateUser = baseAdapter.updateUser;
                    if (!updateUser) {
                        throw new Error('Adapter updateUser is unavailable');
                    }
                    const result = await updateUser(data);
                    await setMagicLinkDebugCookie('adapter_update_user_ok');
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_update_user_error');
                    throw error;
                }
            },
            async getSessionAndUser(sessionToken: string) {
                try {
                    const getSessionAndUser = baseAdapter.getSessionAndUser;
                    if (!getSessionAndUser) {
                        await setMagicLinkDebugCookie('adapter_get_session_and_user_unavailable');
                        return null;
                    }
                    const result = await getSessionAndUser(sessionToken);
                    await setMagicLinkDebugCookie(
                        result ? 'adapter_get_session_and_user_hit' : 'adapter_get_session_and_user_miss',
                    );
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_get_session_and_user_error');
                    throw error;
                }
            },
            async createSession(data: Parameters<NonNullable<typeof baseAdapter.createSession>>[0]) {
                try {
                    const createSession = baseAdapter.createSession;
                    if (!createSession) {
                        throw new Error('Adapter createSession is unavailable');
                    }
                    const result = await createSession(data);
                    await setMagicLinkDebugCookie('adapter_create_session_ok');
                    return result;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_create_session_error');
                    throw error;
                }
            },
            async linkAccount(data: Parameters<NonNullable<typeof baseAdapter.linkAccount>>[0]) {
                try {
                    const linkAccount = baseAdapter.linkAccount;
                    if (!linkAccount) {
                        throw new Error('Adapter linkAccount is unavailable');
                    }
                    await linkAccount(data);
                    await setMagicLinkDebugCookie('adapter_link_account_ok');
                    return;
                } catch (error) {
                    await setMagicLinkDebugCookie('adapter_link_account_error');
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
                const runId = `resend-${Date.now()}`;
                const normalizedEmail = normalizeEmail(email);
                const emailHashPrefix = hashNormalizedEmail(normalizedEmail).slice(0, 12);
                await setMagicLinkDebugCookie('requested');
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
                    await setMagicLinkDebugCookie('user_missing');
                    // For privacy/security, we don't throw an error, we just silently fail to send the email.
                    // In signIn() we'll return a generic "Check your email" message anyway.
                    console.log(`Login attempt for non-existent email: ${email}`);
                    return;
                }

                // The URL is used as-is from NextAuth
                if (process.env.NODE_ENV !== 'production') {
                    await setMagicLinkDebugCookie('dev_link_generated');
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
                await setMagicLinkDebugCookie(res.ok ? 'resend_ok' : `resend_error_${res.status}`);

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
            if (account?.provider === 'resend') {
                await setMagicLinkDebugCookie('resend_signin_callback');
            }

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
    logger: {
        error: async (error) => {
            const errorLike = error as Error & { type?: string };
            const code = errorLike.type ?? errorLike.name ?? 'unknown';
            const message =
                typeof errorLike.message === 'string' ? errorLike.message.slice(0, 80) : null;
            await setMagicLinkDebugCookie(
                message ? `logger_${code}:${message}` : `logger_${code}`,
            );
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
