import { NextResponse } from 'next/server';

const ASSET_SOURCES = {
  banner: 'https://www22.a8.net/svt/bgt?aid=250820591006&wid=002&eno=01&mid=s00000012624004064000&mc=1',
  pixel: 'https://www19.a8.net/0.gif?a8mat=45BYEN+3KN6I+2PEO+O720X',
} as const;

type AssetName = keyof typeof ASSET_SOURCES;

function isAssetName(value: string): value is AssetName {
  return value in ASSET_SOURCES;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> }
) {
  const { asset } = await params;
  if (!isAssetName(asset)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const upstreamResponse = await fetch(ASSET_SOURCES[asset], {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
    next: { revalidate: 3600 },
  });

  if (!upstreamResponse.ok) {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  const buffer = await upstreamResponse.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Content-Type': upstreamResponse.headers.get('content-type') ?? 'application/octet-stream',
    },
  });
}
