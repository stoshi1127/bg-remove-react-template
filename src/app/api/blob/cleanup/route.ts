import { NextRequest, NextResponse } from 'next/server';

import {
  deleteExpiredInputBlobs,
  deleteExpiredProcessedBlobs,
  INPUT_BLOB_RETENTION_HOURS,
  PROCESSED_BLOB_RETENTION_HOURS,
} from '@/lib/blob/imageStorage';

export const runtime = 'nodejs';

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  try {
    const [inputResult, processedResult] = await Promise.all([
      deleteExpiredInputBlobs({ dryRun }),
      deleteExpiredProcessedBlobs({ dryRun }),
    ]);
    const response = NextResponse.json({
      ok: true,
      dryRun,
      inputs: {
        ...inputResult,
        retentionHours: INPUT_BLOB_RETENTION_HOURS,
      },
      processed: {
        ...processedResult,
        retentionHours: PROCESSED_BLOB_RETENTION_HOURS,
      },
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[blob/cleanup] failed', error);
    return NextResponse.json(
      { ok: false, error: 'Blob cleanup failed' },
      { status: 500 },
    );
  }
}
