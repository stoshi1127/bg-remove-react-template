import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import { getCurrentUser } from '@/lib/auth/session';
import { INPUT_BLOB_PREFIX } from '@/lib/blob/imageStorage';
import {
  ALLOWED_IMAGE_TYPES,
  EDGE_SAFE_UPLOAD_BYTES,
  FREE_MAX_MP,
  PRO_MAX_UPLOAD_BYTES,
  PRO_MAX_MP,
  PRO_MAX_SIDE,
  stripMimeParameters,
} from '@/lib/upload/limits';
import {
  buildUploadRateLimitCookie,
  getUploadTokenRateLimitResult,
} from '@/lib/upload/rateLimit';

export const runtime = 'nodejs';

type ClientPayload = {
  sizeBytes?: number;
  mimeType?: string;
  width?: number;
  height?: number;
};

function isPositiveNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function parsePayload(raw: string | null | undefined): ClientPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ClientPayload;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function validatePayload(payload: ClientPayload): string | null {
  if (!isPositiveNumber(payload.sizeBytes)) {
    return 'アップロードサイズの取得に失敗しました。';
  }

  const mime = payload.mimeType ? stripMimeParameters(payload.mimeType) : '';
  if (!mime || !ALLOWED_IMAGE_TYPES.has(mime)) {
    return '対応していない画像形式です。';
  }

  if (!isPositiveNumber(payload.width) || !isPositiveNumber(payload.height)) {
    return '画像サイズの取得に失敗しました。';
  }

  return null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  let rateLimitCookieValue: string | null = null;

  try {
    const body = (await req.json()) as HandleUploadBody;
    if (body.type === 'blob.generate-client-token') {
      const rateLimit = getUploadTokenRateLimitResult({
        request: req,
        userId: user?.id,
      });

      if (!rateLimit.allowed) {
        console.warn('[upload/blob] rate_limited', {
          identifierType: rateLimit.identifierType,
          isAuthenticated: rateLimit.isAuthenticated,
          limited: true,
          plan: user?.plan ?? 'guest',
        });

        const limitedResponse = NextResponse.json(
          { ok: false, error: 'アップロード準備の回数が多すぎます。しばらく待ってからお試しください。' },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimit.retryAfterSeconds),
            },
          },
        );
        limitedResponse.headers.append('Set-Cookie', buildUploadRateLimitCookie(rateLimit.setCookieValue));
        return limitedResponse;
      }

      rateLimitCookieValue = rateLimit.setCookieValue;
      console.info('[upload/blob] token_generate', {
        identifierType: rateLimit.identifierType,
        isAuthenticated: rateLimit.isAuthenticated,
        limited: false,
        plan: user?.plan ?? 'guest',
      });
    }

    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(`${INPUT_BLOB_PREFIX}/`)) {
          throw new Error('アップロード先が不正です。');
        }

        const payload = parsePayload(clientPayload);
        const validationError = validatePayload(payload);
        if (validationError) {
          throw new Error(validationError);
        }

        const isPro = Boolean(user?.isPro);
        const maximumSizeInBytes = isPro ? PRO_MAX_UPLOAD_BYTES : EDGE_SAFE_UPLOAD_BYTES;
        const maxMp = isPro ? PRO_MAX_MP : FREE_MAX_MP;
        const megapixels = (payload.width! * payload.height!) / 1_000_000;

        if (megapixels > maxMp) {
          throw new Error(
            isPro
              ? 'この写真は大きすぎるため、Proプランでも処理できません。'
              : '無料プランではこの画像サイズを処理できません。',
          );
        }

        if (isPro && (payload.width! > PRO_MAX_SIDE || payload.height! > PRO_MAX_SIDE)) {
          throw new Error('この写真は大きすぎるため、Proプランでも処理できません。');
        }

        return {
          allowedContentTypes: Array.from(ALLOWED_IMAGE_TYPES),
          maximumSizeInBytes,
          tokenPayload: JSON.stringify({
            userId: user?.id ?? null,
            plan: user?.plan ?? 'guest',
            createdAt: Date.now(),
          }),
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info('[upload.blob.completed]', { url: blob.url, pathname: blob.pathname });
      },
    });

    const response = NextResponse.json(json);
    if (rateLimitCookieValue) {
      response.headers.append('Set-Cookie', buildUploadRateLimitCookie(rateLimitCookieValue));
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'アップロード準備に失敗しました。';
    console.error('[upload/blob]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
