import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

import { getCurrentUser } from '@/lib/auth/session';
import {
  ALLOWED_IMAGE_TYPES,
  PRO_MAX_UPLOAD_BYTES,
  stripMimeParameters,
} from '@/lib/upload/limits';

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
  // sizeBytes の上限はここでは比較しない（ビルド時と実行時の NEXT_PUBLIC ずれで誤 400 になる）。実際の上限は下の maximumSizeInBytes で付与する。
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

  // MP・長辺は検証しない: NEXT_PUBLIC_* のビルド時とサーバー実行時のずれで誤 400 になりやすい（並列・枚数増で別ファイルだけ落ちる）。上限はクライアント（BgRemover）で担保する。

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
    console.error('[upload/blob]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
