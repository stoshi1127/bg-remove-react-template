import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import { getCurrentUser } from '@/lib/auth/session';
import { ALLOWED_IMAGE_TYPES, PRO_MAX_MP, PRO_MAX_SIDE, PRO_MAX_UPLOAD_BYTES } from '@/lib/upload/limits';

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
  if (!isPositiveNumber(payload.sizeBytes) || payload.sizeBytes > PRO_MAX_UPLOAD_BYTES) {
    return `Proアップロード上限を超えています（最大 ${Math.round(PRO_MAX_UPLOAD_BYTES / 1024 / 1024)}MB）。`;
  }

  if (!payload.mimeType || !ALLOWED_IMAGE_TYPES.has(payload.mimeType)) {
    return '対応していない画像形式です。';
  }

  if (!isPositiveNumber(payload.width) || !isPositiveNumber(payload.height)) {
    return '画像サイズの取得に失敗しました。';
  }

  const mp = (payload.width * payload.height) / 1_000_000;
  if (mp > PRO_MAX_MP) {
    return `画像が大きすぎます（最大 ${PRO_MAX_MP}MP）。`;
  }

  if (payload.width > PRO_MAX_SIDE || payload.height > PRO_MAX_SIDE) {
    return `画像の辺が長すぎます（最大 ${PRO_MAX_SIDE}px）。`;
  }

  return null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.isPro) {
    return NextResponse.json({ ok: false, error: 'Pro会員のみ利用できます。' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = parsePayload(clientPayload);
        const validationError = validatePayload(payload);
        if (validationError) {
          throw new Error(validationError);
        }

        return {
          allowedContentTypes: Array.from(ALLOWED_IMAGE_TYPES),
          maximumSizeInBytes: PRO_MAX_UPLOAD_BYTES,
          tokenPayload: JSON.stringify({
            userId: user.id,
            createdAt: Date.now(),
          }),
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info('[upload.blob.completed]', { url: blob.url, pathname: blob.pathname });
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'アップロード準備に失敗しました。';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
