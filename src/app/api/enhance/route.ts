import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { buildProcessedUploadPath, uploadProcessedImage } from '@/lib/blob/imageStorage';
import { getRequestedImageResponseMode, type ImageSuccessResponse } from '@/lib/imageApi';

export const runtime = 'nodejs';

type EnhanceBody = {
  imageUrl?: string;
  imageDataUrl?: string;
  scale?: number;
};

function safeScale(scale: unknown): 2 | 4 {
  return scale === 4 ? 4 : 2;
}

function getFileNameFromUrl(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback;

  try {
    const pathname = new URL(url).pathname;
    const candidate = pathname.split('/').pop();
    return candidate && candidate.length > 0 ? candidate : fallback;
  } catch {
    return fallback;
  }
}

function buildImageSuccessResponse(body: ImageSuccessResponse) {
  const response = NextResponse.json(body);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(req: NextRequest) {
  const replicateApiKey = process.env.REPLICATE_API_TOKEN;
  const responseMode = getRequestedImageResponseMode(req);
  if (!replicateApiKey) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN is not set' }, { status: 500 });
  }

  const user = await getCurrentUser();
  if (!user?.isPro) {
    return NextResponse.json({ error: 'くっきり高画質はPro会員のみ利用できます。' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as EnhanceBody | null;
  const imageUrl = typeof body?.imageUrl === 'string' ? body.imageUrl : '';
  const imageDataUrl = typeof body?.imageDataUrl === 'string' ? body.imageDataUrl : '';
  const imageInput = imageUrl || imageDataUrl;
  if (!imageInput || (!imageInput.startsWith('data:image/') && !imageInput.startsWith('http://') && !imageInput.startsWith('https://'))) {
    return NextResponse.json({ error: '入力画像が不正です。' }, { status: 400 });
  }

  const scale = safeScale(body?.scale);
  const modelVersion =
    process.env.REPLICATE_REAL_ESRGAN_VERSION ||
    'nightmareai/real-esrgan';

  const predictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${replicateApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        ...(imageInput.startsWith('http://') || imageInput.startsWith('https://')
          ? { image: imageInput }
          : { image: imageInput }),
        scale,
      },
    }),
  });

  if (!predictionResponse.ok) {
    const errorData = await predictionResponse.json().catch(() => ({ detail: 'Unknown error starting prediction.' }));
    return NextResponse.json(
      { error: `くっきり処理を開始できませんでした: ${errorData.detail || predictionResponse.statusText}` },
      { status: predictionResponse.status },
    );
  }

  let prediction = await predictionResponse.json();
  let attempts = 0;
  const maxAttempts = 90;

  while (
    prediction.status !== 'succeeded' &&
    prediction.status !== 'failed' &&
    prediction.status !== 'canceled' &&
    attempts < maxAttempts
  ) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pollUrl = prediction?.urls?.get as string | undefined;
    if (!pollUrl) {
      return NextResponse.json({ error: 'くっきり処理の状態取得に失敗しました。' }, { status: 500 });
    }

    const pollResponse = await fetch(pollUrl, {
      headers: {
        Authorization: `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!pollResponse.ok) continue;
    prediction = await pollResponse.json();
  }

  if (prediction.status !== 'succeeded' || !prediction.output) {
    return NextResponse.json({ error: 'くっきり処理に失敗しました。' }, { status: 500 });
  }

  let outputUrl: string | undefined;
  if (Array.isArray(prediction.output) && typeof prediction.output[0] === 'string') {
    outputUrl = prediction.output[0];
  } else if (typeof prediction.output === 'string') {
    outputUrl = prediction.output;
  }

  if (!outputUrl) {
    return NextResponse.json({ error: 'くっきり画像の取得に失敗しました。' }, { status: 500 });
  }

  const imageResponse = await fetch(outputUrl);
  if (!imageResponse.ok) {
    return NextResponse.json({ error: 'くっきり画像の取得に失敗しました。' }, { status: imageResponse.status });
  }

  const imageBlob = await imageResponse.blob();
  const outputContentType = imageResponse.headers.get('content-type') || 'image/png';

  if (responseMode === 'blob') {
    return new NextResponse(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': outputContentType,
        'x-enhance-scale': String(scale),
      },
    });
  }

  const uploaded = await uploadProcessedImage({
    pathname: buildProcessedUploadPath('enhance', getFileNameFromUrl(imageUrl, 'enhance-output.png'), outputContentType),
    body: imageBlob,
    contentType: outputContentType,
  });

  return buildImageSuccessResponse({
    ok: true,
    outputUrl: uploaded.url,
    contentType: outputContentType,
  });
}
