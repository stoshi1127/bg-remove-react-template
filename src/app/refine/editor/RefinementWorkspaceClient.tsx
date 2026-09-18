'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import CutoutRefinementEditor, { type RefinementStroke, type RefinementTool } from '@/components/CutoutRefinementEditor';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import { calculateAlphaBoundingBox, composeRefinementOutput } from '@/lib/refinement/imageComposition';
import { writeRefinementTrialUsed } from '@/lib/refinement/entitlement';
import {
  assetValueToUrl,
  readRefinementAsset,
  readRefinementWorkspace,
  updateRefinementItem,
  updateRefinementWorkspace,
} from '@/lib/refinement/workspaceStorage';
import type {
  RefinementWorkspace,
  RefinementWorkspaceItem,
  RefinementWorkspaceMode,
} from '@/lib/refinement/workspace';

type LoadedAssets = { sourceUrl: string; transparentUrl: string };

function safeFileName(name: string): string {
  return `refined_${name.replace(/\.[^.]+$/, '')}.png`;
}

export default function RefinementWorkspaceClient({
  workspaceId,
  routeMode,
  isPro,
}: {
  workspaceId: string;
  routeMode: RefinementWorkspaceMode;
  isPro: boolean;
}) {
  const [workspace, setWorkspace] = useState<RefinementWorkspace | null>(null);
  const [items, setItems] = useState<RefinementWorkspaceItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [assets, setAssets] = useState<LoadedAssets | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState('編集workspaceを読み込んでいます…');
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDraftRef = useRef<RefinementStroke[]>([]);
  const currentItemRef = useRef<RefinementWorkspaceItem | null>(null);

  const currentItem = useMemo(
    () => items.find(item => item.id === currentId) ?? null,
    [currentId, items],
  );
  currentItemRef.current = currentItem;
  const sourceAsset = currentItem?.source ?? null;
  const transparentAsset = currentItem?.refined ?? currentItem?.transparent ?? null;

  const isLocked = useCallback((item: RefinementWorkspaceItem) => {
    if (!item.eligible) return true;
    if (routeMode !== 'trial' || workspace?.batchUnlocked) return false;
    return !!workspace?.trialItemId && item.id !== workspace.trialItemId && item.status !== 'refined';
  }, [routeMode, workspace]);

  useEffect(() => {
    let active = true;
    if (!workspaceId) {
      setFatalError('編集workspaceが指定されていません。');
      return;
    }
    if (routeMode === 'pro' && !isPro) {
      setFatalError('Pro用の編集ページです。ログイン中のプランを確認してください。');
      return;
    }
    readRefinementWorkspace(workspaceId)
      .then(async bundle => {
        if (!active) return;
        if (!bundle) {
          setFatalError('編集workspaceが見つからないか、有効期限が切れています。');
          return;
        }
        if (bundle.workspace.mode === 'pro' && !isPro) {
          setFatalError('このworkspaceはPro専用です。ログイン中のプランを確認してください。');
          return;
        }
        let nextWorkspace = bundle.workspace;
        if (routeMode === 'rewarded' && !nextWorkspace.batchUnlocked) {
          await updateRefinementWorkspace(workspaceId, { mode: 'rewarded', batchUnlocked: true, status: 'editing' });
          nextWorkspace = { ...nextWorkspace, mode: 'rewarded', batchUnlocked: true, status: 'editing', updatedAt: Date.now() };
          trackAnalyticsEvent('refinement_batch_unlocked', { access_method: 'adsense_offerwall' });
        }
        if (!active) return;
        setWorkspace(nextWorkspace);
        setItems(bundle.items);
        const first = bundle.items.find(item => item.eligible);
        setCurrentId(first?.id ?? bundle.items[0]?.id ?? null);
        setSelectedIds(new Set(bundle.items.filter(item => item.eligible).map(item => item.id)));
        setMessage('');
        trackAnalyticsEvent('refinement_batch_editor_view', {
          access_type: routeMode,
          image_count: bundle.items.length,
        });
      })
      .catch(error => {
        if (active) setFatalError(error instanceof Error ? error.message : '編集workspaceを読み込めませんでした。');
      });
    return () => { active = false; };
  }, [isPro, routeMode, workspaceId]);

  useEffect(() => {
    let active = true;
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setAssets(null);
    if (!sourceAsset || !transparentAsset) return;
    Promise.all([
      readRefinementAsset(sourceAsset),
      readRefinementAsset(transparentAsset),
    ]).then(([source, transparent]) => {
      if (!active || !source || !transparent) return;
      const sourceValue = assetValueToUrl(source);
      const transparentValue = assetValueToUrl(transparent);
      const created = [sourceValue, transparentValue]
        .filter((value): value is { url: string; revoke: boolean } => !!value && value.revoke)
        .map(value => value.url);
      objectUrlsRef.current.push(...created);
      setAssets({
        sourceUrl: sourceValue.url,
        transparentUrl: transparentValue.url,
      });
    }).catch(error => {
      if (active) setMessage(error instanceof Error ? error.message : '画像を読み込めませんでした。');
    });
    return () => {
      active = false;
    };
  }, [sourceAsset, transparentAsset]);

  useEffect(() => {
    currentDraftRef.current = currentItemRef.current?.draftStrokes ?? [];
  }, [currentId]);

  useEffect(() => () => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  const saveDraft = useCallback((strokes: RefinementStroke[]) => {
    if (!currentItemRef.current) return;
    currentDraftRef.current = strokes;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const latestItem = currentItemRef.current;
      if (!latestItem || latestItem.id !== currentId) return;
      const next = { ...latestItem, status: strokes.length > 0 ? 'editing' as const : latestItem.status, draftStrokes: strokes };
      setItems(existing => existing.map(item => item.id === next.id ? next : item));
      void updateRefinementItem(next).catch(() => setMessage('下書きを保存できませんでした。'));
    }, 250);
  }, [currentId]);

  const moveToItem = (itemId: string) => {
    if (itemId === currentId) return;
    if (currentDraftRef.current.length > 0) {
      setPendingMoveId(itemId);
      return;
    }
    setCurrentId(itemId);
  };

  const discardAndMove = async () => {
    if (!currentItem || !pendingMoveId) return;
    const next = { ...currentItem, draftStrokes: [], status: currentItem.refined ? 'refined' as const : 'unmodified' as const };
    await updateRefinementItem(next);
    setItems(existing => existing.map(item => item.id === next.id ? next : item));
    currentDraftRef.current = [];
    setCurrentId(pendingMoveId);
    setPendingMoveId(null);
  };

  const keepDraftAndMove = async () => {
    if (!pendingMoveId || !currentItem) return;
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    const next = { ...currentItem, status: 'editing' as const, draftStrokes: currentDraftRef.current };
    await updateRefinementItem(next);
    setItems(existing => existing.map(item => item.id === next.id ? next : item));
    setCurrentId(pendingMoveId);
    setPendingMoveId(null);
  };

  const handleApply = async (blob: Blob, toolUsed: 'erase' | 'restore' | 'both') => {
    if (!currentItem || !workspace) return;
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    const temporaryUrl = URL.createObjectURL(blob);
    try {
      const boundingBox = await calculateAlphaBoundingBox(temporaryUrl);
      const nextItem: RefinementWorkspaceItem = {
        ...currentItem,
        boundingBox,
        status: 'refined',
        draftStrokes: [],
      };
      const saved = await updateRefinementItem(nextItem, blob);
      let nextWorkspace = workspace;
      if (routeMode === 'trial' && !workspace.trialItemId) {
        await updateRefinementWorkspace(workspace.id, { trialItemId: currentItem.id, status: 'editing' });
        writeRefinementTrialUsed(window.localStorage);
        nextWorkspace = { ...workspace, trialItemId: currentItem.id, status: 'editing', updatedAt: Date.now() };
        setWorkspace(nextWorkspace);
      }
      currentDraftRef.current = [];
      setItems(existing => existing.map(item => item.id === saved.id ? saved : item));
      setMessage('修正を適用しました。');
      if (routeMode !== 'trial' || workspace.batchUnlocked) {
        const currentIndex = items.findIndex(item => item.id === currentItem.id);
        const nextItem = items.slice(currentIndex + 1).find(item => item.eligible)
          ?? items.slice(0, currentIndex).find(item => item.eligible && item.status !== 'refined');
        if (nextItem) setCurrentId(nextItem.id);
      }
      trackAnalyticsEvent('refinement_editor_result_applied', {
        access_type: routeMode,
        tool_used: toolUsed,
      });
    } finally {
      URL.revokeObjectURL(temporaryUrl);
    }
  };

  const composeItem = async (item: RefinementWorkspaceItem): Promise<Blob> => {
    const [transparent, background] = await Promise.all([
      readRefinementAsset(item.refined ?? item.transparent),
      readRefinementAsset(item.background),
    ]);
    if (!transparent) throw new Error(`${item.name}の画像を復元できませんでした。`);
    const transparentValue = assetValueToUrl(transparent);
    const backgroundValue = background ? assetValueToUrl(background) : null;
    try {
      return await composeRefinementOutput({
        transparentUrl: transparentValue.url,
        background: backgroundValue?.url ?? item.backgroundValue,
        ratio: item.ratio,
        boundingBox: item.boundingBox,
        maxSide: routeMode === 'pro' ? 7000 : 3200,
      });
    } finally {
      if (transparentValue.revoke) URL.revokeObjectURL(transparentValue.url);
      if (backgroundValue?.revoke) URL.revokeObjectURL(backgroundValue.url);
    }
  };

  const saveCurrent = async () => {
    if (!currentItem) return;
    setExporting(true);
    try {
      saveAs(await composeItem(currentItem), safeFileName(currentItem.name));
      setMessage('画像の保存を開始しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '画像を保存できませんでした。');
    } finally {
      setExporting(false);
    }
  };

  const saveZip = async (onlyRefined = false) => {
    const targets = items.filter(item => selectedIds.has(item.id) && item.eligible && (!onlyRefined || item.status === 'refined'));
    if (targets.length === 0) {
      setMessage('保存対象の画像を選択してください。');
      return;
    }
    setExporting(true);
    setMessage(`${targets.length}枚を準備しています…`);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const item of targets) {
        zip.file(safeFileName(item.name), await composeItem(item));
      }
      saveAs(await zip.generateAsync({ type: 'blob' }), 'refined_images.zip');
      await updateRefinementWorkspace(workspaceId, { status: 'completed' });
      setMessage('ZIPファイルの保存を開始しました。');
      trackAnalyticsEvent('refinement_batch_export_completed', {
        image_count: targets.length,
        refined_only: onlyRefined,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ZIPを生成できませんでした。');
    } finally {
      setExporting(false);
    }
  };

  if (fatalError) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-xl items-center px-4">
        <section className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-black text-amber-950">編集を開始できません</h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">{fatalError}</p>
          <Link href="/" className="mt-5 inline-flex font-bold text-blue-700 hover:underline">画像処理画面へ戻る</Link>
        </section>
      </main>
    );
  }

  if (!workspace || !currentItem) {
    return <main className="grid min-h-[70dvh] place-items-center text-slate-600" role="status">{message}</main>;
  }

  const refinedCount = items.filter(item => item.status === 'refined').length;

  return (
    <main className="mx-auto flex h-[calc(100dvh-5rem)] min-h-0 max-w-[1600px] flex-col overflow-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900">まとめて仕上げ修正</h1>
            <p className="text-xs text-slate-500">{items.findIndex(item => item.id === currentId) + 1} / {items.length}・修正済み {refinedCount}枚</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveCurrent()} disabled={exporting || !currentItem.eligible} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-bold text-blue-700 disabled:opacity-40">現在画像を保存</button>
            <button type="button" onClick={() => void saveZip(false)} disabled={exporting} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">選択画像をZIP保存</button>
            <button type="button" onClick={() => void saveZip(true)} disabled={exporting || refinedCount === 0} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-emerald-700 disabled:opacity-40">修正済みだけ保存</button>
            <Link href="/" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700">新しい画像を処理</Link>
          </div>
        </div>
        {message ? <p className="mt-2 text-sm text-blue-700" role="status">{message}</p> : null}
      </header>

      {routeMode === 'trial' && workspace.trialItemId && !workspace.batchUnlocked ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6">
          最初の1枚を無料で修正しました。残りも修正する場合は、短い広告を見るとこのバッチを解放できます。
          <Link href={`/refine/editor/rewarded?workspace=${encodeURIComponent(workspace.id)}`} className="ml-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 font-bold text-white">残りを仕上げ修正</Link>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="order-2 flex w-full gap-2 overflow-x-auto border-t border-slate-200 bg-white p-3 lg:order-1 lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-t-0">
          {items.map(item => {
            const locked = isLocked(item);
            return (
              <div key={item.id} className={`w-36 shrink-0 rounded-xl border p-2 lg:w-full ${item.id === currentId ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <button type="button" onClick={() => !locked && moveToItem(item.id)} disabled={locked} className="w-full text-left disabled:cursor-not-allowed disabled:opacity-55">
                  <span className="block truncate text-sm font-bold text-slate-800">{item.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{!item.eligible ? '編集対象外' : locked ? 'ロック中' : item.status === 'refined' ? '修正済み' : item.status === 'editing' ? '編集中' : '未修正'}</span>
                </button>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    disabled={!item.eligible}
                    onChange={() => setSelectedIds(current => {
                      const next = new Set(current);
                      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                      return next;
                    })}
                  />
                  ZIP対象
                </label>
              </div>
            );
          })}
        </aside>

        <section className="order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:order-2">
          {isLocked(currentItem) ? (
            <div className="grid min-h-[60dvh] place-items-center p-6 text-center">
              <div>
                <p className="font-bold text-slate-800">この画像はまだ編集できません</p>
                <Link href={`/refine/editor/rewarded?workspace=${encodeURIComponent(workspace.id)}`} className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">広告を見てバッチを解放</Link>
              </div>
            </div>
          ) : assets ? (
            <CutoutRefinementEditor
              key={currentItem.id}
              sourceImageUrl={assets.sourceUrl}
              transparentImageUrl={assets.transparentUrl}
              imageName={currentItem.name}
              initialStrokes={currentItem.draftStrokes}
              onDraftChange={saveDraft}
              onFirstEdit={(tool: RefinementTool) => trackAnalyticsEvent('refinement_editor_started', { tool_used: tool, access_type: routeMode })}
              onApply={handleApply}
              onCancel={() => { window.location.href = '/'; }}
              presentation="inline"
              applyLabel="適用して次へ"
            />
          ) : (
            <div className="grid min-h-[60dvh] place-items-center text-slate-500" role="status">画像を準備しています…</div>
          )}
        </section>
      </div>

      {pendingMoveId ? (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="move-confirm-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="move-confirm-title" className="text-lg font-black text-slate-900">未適用の修正があります</h2>
            <p className="mt-2 text-sm text-slate-600">下書きを残して移動するか、破棄して移動してください。</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => void keepDraftAndMove()} className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">下書きを保存して移動</button>
              <button type="button" onClick={() => void discardAndMove()} className="rounded-xl border border-red-300 px-4 py-3 font-bold text-red-700">破棄して移動</button>
              <button type="button" onClick={() => setPendingMoveId(null)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">戻る</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
