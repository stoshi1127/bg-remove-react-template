import { createHmac, createHash } from 'crypto';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW_GUEST = 60;
const MAX_REQUESTS_PER_WINDOW_AUTHENTICATED = 120;
const COOKIE_NAME = 'qt_upload_rl';

type IdentifierType = 'user' | 'guest';

type UploadRateLimitCookie = {
  count: number;
  identifierHash: string;
  windowStart: number;
};

export type UploadRateLimitResult = {
  allowed: boolean;
  identifierType: IdentifierType;
  isAuthenticated: boolean;
  retryAfterSeconds: number;
  setCookieValue: string;
};

function getRateLimitSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-upload-rate-limit-secret';
}

function sign(payload: string): string {
  return createHmac('sha256', getRateLimitSecret()).update(payload).digest('hex');
}

function encodeCookie(cookie: UploadRateLimitCookie): string {
  const payload = JSON.stringify(cookie);
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

function decodeCookie(value: string | undefined): UploadRateLimitCookie | null {
  if (!value) return null;
  const [encodedPayload, providedSignature] = value.split('.');
  if (!encodedPayload || !providedSignature) return null;

  try {
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    if (sign(payload) !== providedSignature) {
      return null;
    }

    const parsed = JSON.parse(payload) as UploadRateLimitCookie;
    if (
      typeof parsed.count !== 'number' ||
      typeof parsed.identifierHash !== 'string' ||
      typeof parsed.windowStart !== 'number'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildIdentifierHash(request: Request, userId?: string | null): {
  identifierHash: string;
  identifierType: IdentifierType;
} {
  if (userId) {
    return {
      identifierHash: createHash('sha256').update(`user:${userId}`).digest('hex'),
      identifierType: 'user',
    };
  }

  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const ip = forwardedFor.split(',')[0]?.trim() || 'unknown-ip';
  const userAgent = request.headers.get('user-agent') || 'unknown-ua';
  return {
    identifierHash: createHash('sha256').update(`guest:${ip}:${userAgent}`).digest('hex'),
    identifierType: 'guest',
  };
}

export function getUploadTokenRateLimitResult(args: {
  request: Request;
  userId?: string | null;
}): UploadRateLimitResult {
  const now = Date.now();
  const { identifierHash, identifierType } = buildIdentifierHash(args.request, args.userId);
  const cookieState = decodeCookie(
    args.request.headers.get('cookie')
      ?.split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1),
  );

  const sameWindow =
    cookieState &&
    cookieState.identifierHash === identifierHash &&
    now - cookieState.windowStart < WINDOW_MS;

  const maxRequests = args.userId ? MAX_REQUESTS_PER_WINDOW_AUTHENTICATED : MAX_REQUESTS_PER_WINDOW_GUEST;
  const count = sameWindow ? cookieState.count + 1 : 1;
  const windowStart = sameWindow ? cookieState.windowStart : now;
  const retryAfterSeconds =
    count > maxRequests
      ? Math.max(1, Math.ceil((windowStart + WINDOW_MS - now) / 1000))
      : 0;

  return {
    allowed: count <= maxRequests,
    identifierType,
    isAuthenticated: Boolean(args.userId),
    retryAfterSeconds,
    setCookieValue: encodeCookie({
      count: Math.min(count, maxRequests + 1),
      identifierHash,
      windowStart,
    }),
  };
}

export function buildUploadRateLimitCookie(value: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${Math.ceil(WINDOW_MS / 1000)}; HttpOnly; SameSite=Lax${secure}`;
}
