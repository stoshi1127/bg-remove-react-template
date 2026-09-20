'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { composeRefinementOutput } from '@/lib/refinement/imageComposition';
import { assetValueToUrl, readRefinementAsset } from '@/lib/refinement/workspaceStorage';
import type { RefinementAssetRef, RefinementWorkspaceItem } from '@/lib/refinement/workspace';

function assetKey(ref: RefinementAssetRef | null): string {
  return ref?.kind === 'asset' ? ref.assetId : ref?.url ?? '';
}

export function thumbnailKey(item: RefinementWorkspaceItem): string {
  return JSON.stringify([item.id, assetKey(item.refined ?? item.transparent), assetKey(item.background), item.backgroundValue, item.ratio, item.boundingBox]);
}

async function makeThumbnail(item: RefinementWorkspaceItem): Promise<string> {
  const [foreground, background] = await Promise.all([
    readRefinementAsset(item.refined ?? item.transparent),
    readRefinementAsset(item.background),
  ]);
  if (!foreground) throw new Error('サムネイルを作成できませんでした。');
  const image = assetValueToUrl(foreground);
  const backdrop = background ? assetValueToUrl(background) : null;
  try {
    const blob = await composeRefinementOutput({
      transparentUrl: image.url,
      background: backdrop?.url ?? item.backgroundValue,
      ratio: item.ratio,
      boundingBox: item.boundingBox,
      recalculateBoundingBox: item.refined === null,
      maxSide: 160,
    });
    return URL.createObjectURL(blob);
  } finally {
    if (image.revoke) URL.revokeObjectURL(image.url);
    if (backdrop?.revoke) URL.revokeObjectURL(backdrop.url);
  }
}

export function createThumbnailCache() {
  const urls = new Map<string, string>();
  const pending = new Map<string, Promise<string>>();
  const queue: Array<() => void> = [];
  let active = 0;
  let disposed = false;
  const drain = () => {
    while (active < 2 && queue.length > 0) {
      active += 1;
      queue.shift()?.();
    }
  };
  return {
    revive() { disposed = false; },
    get(item: RefinementWorkspaceItem): Promise<string> {
      const key = thumbnailKey(item);
      const cached = urls.get(key);
      if (cached) return Promise.resolve(cached);
      const existing = pending.get(key);
      if (existing) return existing;
      const task = new Promise<string>((resolve, reject) => {
        queue.push(() => {
          makeThumbnail(item).then(url => {
            if (disposed) URL.revokeObjectURL(url);
            else urls.set(key, url);
            resolve(url);
          }, reject).finally(() => {
            pending.delete(key);
            active -= 1;
            drain();
          });
        });
        drain();
      });
      pending.set(key, task);
      return task;
    },
    dispose() {
      disposed = true;
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    },
  };
}

type ThumbnailCache = ReturnType<typeof createThumbnailCache>;

function RefinementThumbnail({ item, cache }: { item: RefinementWorkspaceItem; cache: ThumbnailCache }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef(item);
  itemRef.current = item;
  const [url, setUrl] = useState<string | null>(null);
  const key = useMemo(() => thumbnailKey(item), [item]);

  useEffect(() => {
    let active = true;
    const element = containerRef.current;
    const load = () => {
      void cache.get(itemRef.current).then(nextUrl => {
        if (active) setUrl(nextUrl);
      }).catch(() => {
        if (active) setUrl(null);
      });
    };
    setUrl(null);
    if (typeof IntersectionObserver === 'undefined' || !element) {
      load();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: '120px' });
    observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, [cache, key]);

  return <div ref={containerRef} className="flex h-24 w-full items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px]">
    {url ? <img src={url} width={160} height={160} alt="" loading="lazy" className="block h-auto max-h-full w-auto max-w-full object-contain object-center" /> : <span className="text-xs text-slate-500" aria-hidden="true">プレビュー準備中</span>}
  </div>;
}

export default memo(RefinementThumbnail);
