import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getCurrentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
/** Replicate ポーリング最大60秒＋余裕。未設定だとデフォルト上限で 504 になりやすい */
export const maxDuration = 90;

type JsonBody = {
  imageUrl?: string;
  sourceBlobUrl?: string;
  processingMode?: string;
};

type ProcessingMode = 'standard' | 'pro_high_precision' | 'ai_generate';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return Buffer.from(buffer).toString('base64');
}

async function startPrediction(args: {
  replicateApiKey: string;
  modelVersion: string;
  imageInput: string;
  processingMode: ProcessingMode;
}) {
  const input =
    args.processingMode === 'pro_high_precision'
      ? { image_url: args.imageInput }
      : { image: args.imageInput };

  return fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${args.replicateApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: args.modelVersion,
      input,
    }),
  });
}

export async function POST(req: NextRequest) {
  const replicateApiKey = process.env.REPLICATE_API_TOKEN;
  let sourceBlobUrl: string | null = null;

  if (!replicateApiKey) {
    throw new Error('REPLICATE_API_TOKEN is not set');
  }

  try {
    const standardModelVersion = '851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';
    const proHighPrecisionModelVersion =
      process.env.REPLICATE_REMOVE_BG_2_VERSION || 'fottoai/remove-bg-2:d748bcc6882e5567ffe1468356323e6345736494dd9b827ff2871a68fca79be5';
    const contentType = req.headers.get('content-type') ?? '';
    let imageInput: string | null = null;
    let requestedProcessingMode: ProcessingMode = 'standard';

    if (contentType.includes('application/json')) {
      const body = (await req.json().catch(() => null)) as JsonBody | null;
      imageInput = asString(body?.imageUrl);
      sourceBlobUrl = asString(body?.sourceBlobUrl);
      requestedProcessingMode = body?.processingMode === 'pro_high_precision' ? 'pro_high_precision' : 'standard';
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const processingMode = formData.get('processingMode');
      requestedProcessingMode = processingMode === 'pro_high_precision' ? 'pro_high_precision' : 'standard';
      if (!file) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }
      const fileBuffer = await file.arrayBuffer();
      const mimeType = file.type || 'application/octet-stream';
      const base64String = await arrayBufferToBase64(fileBuffer);
      imageInput = `data:${mimeType};base64,${base64String}`;
    }

    if (!imageInput) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (requestedProcessingMode === 'pro_high_precision') {
      const user = await getCurrentUser();
      if (!user?.isPro) {
        return NextResponse.json({ error: '高精度モードはPro会員のみ利用できます。' }, { status: 403 });
      }
    }

    const modelVersion =
      requestedProcessingMode === 'pro_high_precision'
        ? proHighPrecisionModelVersion
        : standardModelVersion;

    let startPredictionResponse = await startPrediction({
      replicateApiKey,
      modelVersion,
      imageInput,
      processingMode: requestedProcessingMode,
    });

    // URL入力が失敗した場合だけData URIへフォールバック（既存互換）
    if (!startPredictionResponse.ok && contentType.includes('application/json')) {
      const fallbackSource = imageInput;
      if (fallbackSource.startsWith('http://') || fallbackSource.startsWith('https://')) {
        const fallbackImageRes = await fetch(fallbackSource);
        if (fallbackImageRes.ok) {
          const mimeType = fallbackImageRes.headers.get('content-type') || 'application/octet-stream';
          const fileBuffer = await fallbackImageRes.arrayBuffer();
          const base64String = await arrayBufferToBase64(fileBuffer);
          const fallbackDataURI = `data:${mimeType};base64,${base64String}`;
          startPredictionResponse = await startPrediction({
            replicateApiKey,
            modelVersion,
            imageInput: fallbackDataURI,
            processingMode: requestedProcessingMode,
          });
        }
      }
    }

    if (!startPredictionResponse.ok) {
      const errorData = await startPredictionResponse
        .json()
        .catch(() => ({ detail: 'Unknown error starting prediction.' }));
      console.error('Replicate API error (starting prediction):', errorData);
      return NextResponse.json(
        { error: `Failed to start prediction: ${errorData.detail || startPredictionResponse.statusText}` },
        { status: startPredictionResponse.status },
      );
    }

    let prediction = await startPredictionResponse.json();

    let attempts = 0;
    const maxAttempts = 60;

    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled' &&
      attempts < maxAttempts
    ) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!prediction.urls || !prediction.urls.get) {
        console.error('Replicate API error: Polling URL not found in prediction response.', prediction);
        return NextResponse.json({ error: 'Failed to get polling URL for prediction.' }, { status: 500 });
      }

      const pollResponse = await fetch(prediction.urls.get as string, {
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!pollResponse.ok) {
        const errorData = await pollResponse.json().catch(() => ({ detail: 'Unknown error polling prediction.' }));
        console.error('Replicate API error (polling):', errorData);
      } else {
        prediction = await pollResponse.json();
      }
    }

    if (attempts >= maxAttempts && (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled')) {
      console.error('Replicate prediction timed out after polling.');
      return NextResponse.json({ error: 'Prediction timed out.' }, { status: 504 }); // Gateway Timeout
    }

    if (prediction.status !== 'succeeded' || !prediction.output) {
      console.error('Replicate prediction failed or no output:', prediction);
      const userError = prediction.error ? `Prediction failed: ${prediction.error}` : 'Prediction failed or did not produce an output.';
      return NextResponse.json({ error: userError }, { status: 500 });
    }

    let outputUrl: string | undefined;
    if (Array.isArray(prediction.output) && typeof prediction.output[0] === 'string') {
      outputUrl = prediction.output[0];
    } else if (typeof prediction.output === 'string') {
      outputUrl = prediction.output;
    }

    if (!outputUrl) {
      console.error('Replicate API did not return a valid image URL:', prediction.output);
      return NextResponse.json({ error: 'Failed to get processed image URL from Replicate' }, { status: 500 });
    }

    const imageResponse = await fetch(outputUrl);

    if (!imageResponse.ok) {
      console.error('Failed to fetch processed image from Replicate CDN:', imageResponse.status, await imageResponse.text());
      return NextResponse.json({ error: 'Failed to fetch processed image' }, { status: imageResponse.status });
    }

    const imageBlob = await imageResponse.blob();

    return new NextResponse(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'x-processing-mode': requestedProcessingMode,
      },
    });

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('Error in remove-bg API route:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  } finally {
    if (sourceBlobUrl) {
      try {
        await del(sourceBlobUrl);
      } catch (cleanupError) {
        console.warn('[remove-bg] source blob cleanup failed:', cleanupError);
      }
    }
  }
}