import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function isAllowedImageHost(hostname: string): boolean {
  return (
    hostname === 'blob.vercel-storage.com'
    || hostname.endsWith('.blob.vercel-storage.com')
    || hostname.endsWith('.public.blob.vercel-storage.com')
  );
}

function isAllowedTargetUrl(target: URL, request: NextRequest): boolean {
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return false;
  }

  if (target.origin === request.nextUrl.origin) {
    return true;
  }

  return isAllowedImageHost(target.hostname);
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: 'Missing url' }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid url' }, { status: 400 });
  }

  if (!isAllowedTargetUrl(targetUrl, request)) {
    return NextResponse.json({ ok: false, error: 'Host not allowed' }, { status: 400 });
  }

  const upstream = await fetch(targetUrl, {
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch image' },
      { status: upstream.status },
    );
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=300';
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}
