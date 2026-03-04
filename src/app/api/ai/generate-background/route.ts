import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getPremiumUsage, consumePremiumUsage } from '@/lib/premiumUsage';

export const runtime = 'nodejs';
export const maxDuration = 90; // ポーリング最大90秒に合わせる

/**
 * POST /api/ai/generate-background
 * bria/generate-background を使って、被写体を保持しつつ背景を生成・合成する。
 * Pro会員のみ利用可能。プレミアムAI回数を1消費する。
 *
 * Body (JSON):
 *   imageUrl: string             — 前景画像のURL（Blob等、推奨・4.5MB制限回避）
 *   imageDataUrl?: string        — 前景画像 (data URI)、imageUrl がない場合のフォールバック
 *   mode: 'generate' | 'blend'   — 'generate'=テキストから背景生成, 'blend'=参照画像になじませる
 *   prompt?: string              — 背景の説明テキスト（generate時に使用）
 *   refImageUrl?: string         — 参照背景画像のURL（blend時、推奨）
 *   refImageDataUrl?: string     — 参照背景画像 (data URI, blend時、小さい場合のみ)
 */
export async function POST(req: NextRequest) {
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateApiKey) {
        return NextResponse.json({ error: 'サーバー設定エラー' }, { status: 500 });
    }

    // --- 認証チェック ---
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
    if (!user.isPro) {
        return NextResponse.json({ error: 'この機能はProプラン限定です' }, { status: 403 });
    }

    // --- 回数チェック ---
    const usage = await getPremiumUsage(user.id, user.isPro);
    if (!usage || usage.remaining <= 0) {
        return NextResponse.json(
            {
                error: '今月のAI機能（30回）を使い切りました。来月にリセットされます。',
                reason: 'no_remaining',
            },
            { status: 403 }
        );
    }

    // --- リクエストBody ---
    let imageInput: string; // URL または data URI
    let prompt: string;
    let mode: 'generate' | 'blend' = 'generate';
    let refImageInput: string | undefined;
    try {
        const body = await req.json();
        const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : null;
        const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : null;
        imageInput = imageUrl || imageDataUrl || '';
        prompt = body.prompt ?? '';
        mode = body.mode === 'blend' ? 'blend' : 'generate';
        const refImageUrl = typeof body.refImageUrl === 'string' ? body.refImageUrl : null;
        const refImageDataUrl = typeof body.refImageDataUrl === 'string' ? body.refImageDataUrl : null;
        refImageInput = refImageUrl || refImageDataUrl || undefined;
        if (!imageInput) {
            return NextResponse.json({ error: '画像が必要です' }, { status: 400 });
        }
        if (mode === 'blend' && !refImageInput) {
            return NextResponse.json({ error: '参照する背景画像が必要です' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 });
    }

    // --- Replicate API 呼び出し（bria/generate-background） ---
    const modelVersion =
        process.env.REPLICATE_GENERATE_BG_VERSION ||
        'bria/generate-background:2555256f9a283b27092a99741d35251c180d6712e572d19a1c3912b45c80c995';

    try {
        // mode に応じて input を組み立てる（URL は image_url/ref_image_url、data URI は image/ref_image_file）
        const isImageUrl = imageInput.startsWith('http://') || imageInput.startsWith('https://');
        const isRefUrl = refImageInput && (refImageInput.startsWith('http://') || refImageInput.startsWith('https://'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const replicateInput: Record<string, any> = isImageUrl
            ? { image_url: imageInput }
            : { image: imageInput };

        if (mode === 'blend' && refImageInput) {
            // blend: 参照画像の雰囲気で背景を再生成（bg_prompt と ref_image は排他）
            if (isRefUrl) {
                replicateInput.ref_image_url = refImageInput;
            } else {
                replicateInput.ref_image_file = refImageInput;
            }
        } else {
            // generate: テキストから背景生成
            replicateInput.bg_prompt = prompt || 'a natural, clean background';
        }

        const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                Authorization: `Token ${replicateApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: modelVersion,
                input: replicateInput,
            }),
        });

        if (!startResponse.ok) {
            const errorData = await startResponse.json().catch(() => ({ detail: 'unknown' }));
            console.error('[generate-background] Replicate start error:', errorData);
            return NextResponse.json(
                { error: 'AI処理の開始に失敗しました。もう一度お試しください。', details: errorData },
                { status: 502 }
            );
        }

        let prediction = await startResponse.json();

        // --- ポーリング ---
        let attempts = 0;
        const maxAttempts = 90; // 最大90秒
        while (
            prediction.status !== 'succeeded' &&
            prediction.status !== 'failed' &&
            prediction.status !== 'canceled' &&
            attempts < maxAttempts
        ) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 1000));

            if (!prediction.urls?.get) {
                console.error('[generate-background] No polling URL:', prediction);
                return NextResponse.json(
                    { error: 'AI処理の状態確認に失敗しました。' },
                    { status: 500 }
                );
            }

            const pollResponse = await fetch(prediction.urls.get as string, {
                headers: {
                    Authorization: `Token ${replicateApiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            if (pollResponse.ok) {
                prediction = await pollResponse.json();
            }
        }

        if (prediction.status !== 'succeeded' || !prediction.output) {
            console.error('[generate-background] prediction failed:', prediction);
            return NextResponse.json(
                { error: 'AI処理が混み合っているため、もう一度お試しください。回数は消費されません。' },
                { status: 502 }
            );
        }

        // --- 成功時にのみ回数消費 ---
        const consumeResult = await consumePremiumUsage(user.id, user.isPro);
        if (!consumeResult.ok) {
            // 画像は返すが、消費失敗のログは残す
            console.warn('[generate-background] consume failed after success:', consumeResult);
        }

        // --- 出力画像を取得して返却 ---
        const outputUrl = typeof prediction.output === 'string'
            ? prediction.output
            : Array.isArray(prediction.output)
                ? prediction.output[0]
                : null;

        if (!outputUrl) {
            return NextResponse.json(
                { error: '処理結果の取得に失敗しました。' },
                { status: 500 }
            );
        }

        const imageResponse = await fetch(outputUrl);
        if (!imageResponse.ok) {
            console.error('[generate-background] image fetch failed:', outputUrl);
            return NextResponse.json(
                { error: '生成された画像の取得に失敗しました。' },
                { status: 502 }
            );
        }

        const imageBlob = await imageResponse.blob();

        // 残回数も返す
        const updatedUsage = await getPremiumUsage(user.id, user.isPro);
        return new NextResponse(imageBlob, {
            status: 200,
            headers: {
                'Content-Type': imageBlob.type || 'image/png',
                'x-premium-remaining': String(updatedUsage?.remaining ?? 0),
            },
        });
    } catch (err: unknown) {
        console.error('[generate-background] unexpected error:', err);
        return NextResponse.json(
            { error: 'AI処理中にエラーが発生しました。もう一度お試しください。' },
            { status: 500 }
        );
    }
}
