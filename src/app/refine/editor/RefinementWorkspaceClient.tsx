'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import CutoutRefinementEditor, { type RefinementStroke, type RefinementTool } from '@/components/CutoutRefinementEditor';
import RefinementThumbnail, { createThumbnailCache } from './RefinementThumbnail';
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

function WorkspaceDialog({
  titleId,
  title,
  description,
  onDismiss,
  children,
}: {
  titleId: string;
  title: string;
  description: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onDismiss();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? []);
    if (buttons.length === 0) return;
    if (event.shiftKey && document.activeElement === buttons[0]) {
      event.preventDefault();
      buttons[buttons.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
      event.preventDefault();
      buttons[0].focus();
    }
  };

  return <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/60 p-4" role="presentation">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={`${titleId}-description`} onKeyDown={handleKeyDown} className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:p-8">
      <h2 id={titleId} className="text-balance text-lg font-black text-slate-900 sm:text-xl">{title}</h2>
      <p id={`${titleId}-description`} className="mt-2 text-pretty text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6">{children}</div>
    </div>
  </div>;
}

export default function RefinementWorkspaceClient({
  workspaceId,
  routeMode,
  isPro,
  offerwallRequested = false,
}: {
  workspaceId: string;
  routeMode: RefinementWorkspaceMode;
  isPro: boolean;
  offerwallRequested?: boolean;
}) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<RefinementWorkspace | null>(null);
  const [items, setItems] = useState<RefinementWorkspaceItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [assets, setAssets] = useState<LoadedAssets | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [exportMode, setExportMode] = useState(false);
  const [message, setMessage] = useState('編集workspaceを読み込んでいます…');
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [requiresOfferwallBeforeEdit, setRequiresOfferwallBeforeEdit] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const allowExitRef = useRef(false);
  const objectUrlsRef = useRef<string[]>([]);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftWriteRef = useRef<Promise<RefinementWorkspaceItem> | null>(null);
  const currentDraftRef = useRef<RefinementStroke[]>([]);
  const currentItemRef = useRef<RefinementWorkspaceItem | null>(null);
  const thumbnailCache = useMemo(() => createThumbnailCache(), []);
  const hasBatchAccess = isPro || routeMode === 'rewarded' && offerwallRequested;

  useEffect(() => {
    if (!workspace) return;
    const confirmExit = (event: BeforeUnloadEvent) => {
      if (allowExitRef.current) return;
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', confirmExit);
    return () => window.removeEventListener('beforeunload', confirmExit);
  }, [workspace]);

  useEffect(() => {
    if (!workspace || hasBatchAccess || (!workspace.trialItemId && !requiresOfferwallBeforeEdit)) return;
    const key = `refinement-unlock-prompt:${workspace.id}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, 'shown');
    } catch {
      // The prompt still works when session storage is unavailable.
    }
    setShowUnlockPrompt(true);
  }, [hasBatchAccess, requiresOfferwallBeforeEdit, workspace]);

  const currentItem = useMemo(
    () => items.find(item => item.id === currentId) ?? null,
    [currentId, items],
  );
  currentItemRef.current = currentItem;
  const sourceAsset = currentItem?.source ?? null;
  const transparentAsset = currentItem?.refined ?? currentItem?.transparent ?? null;

  const isLocked = useCallback((item: RefinementWorkspaceItem) => {
    if (!item.eligible) return true;
    if (hasBatchAccess) return false;
    if (requiresOfferwallBeforeEdit) return item.status !== 'refined';
    return !!workspace?.trialItemId && item.id !== workspace.trialItemId && item.status !== 'refined';
  }, [hasBatchAccess, requiresOfferwallBeforeEdit, workspace]);

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
        if (routeMode === 'rewarded' && offerwallRequested && !nextWorkspace.batchUnlocked) {
          await updateRefinementWorkspace(workspaceId, { mode: 'rewarded', batchUnlocked: true, status: 'editing' });
          nextWorkspace = { ...nextWorkspace, mode: 'rewarded', batchUnlocked: true, status: 'editing', updatedAt: Date.now() };
          trackAnalyticsEvent('refinement_batch_unlocked', { access_method: 'adsense_offerwall' });
        }
        if (!active) return;
        setRequiresOfferwallBeforeEdit(routeMode === 'rewarded' && !offerwallRequested && nextWorkspace.mode === 'rewarded');
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
  }, [isPro, offerwallRequested, routeMode, workspaceId]);

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

  useEffect(() => {
    thumbnailCache.revive();
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      thumbnailCache.dispose();
    };
  }, [thumbnailCache]);

  const saveDraft = useCallback((strokes: RefinementStroke[]) => {
    if (!currentItemRef.current) return;
    currentDraftRef.current = strokes;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      const latestItem = currentItemRef.current;
      if (!latestItem || latestItem.id !== currentId) return;
      const next = { ...latestItem, status: strokes.length > 0 ? 'editing' as const : latestItem.refined ? 'refined' as const : 'unmodified' as const, draftStrokes: strokes };
      setItems(existing => existing.map(item => item.id === next.id ? next : item));
      const write = updateRefinementItem(next);
      draftWriteRef.current = write;
      void write.catch(() => setMessage('下書きを保存できませんでした。')).finally(() => {
        if (draftWriteRef.current === write) draftWriteRef.current = null;
      });
    }, 250);
  }, [currentId]);

  const leaveWorkspace = async () => {
    setLeaving(true);
    setExitError(null);
    try {
      while (draftWriteRef.current) await draftWriteRef.current;
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
        const item = currentItemRef.current;
        if (item) {
          const strokes = currentDraftRef.current;
          await updateRefinementItem({
            ...item,
            status: strokes.length > 0 ? 'editing' : item.refined ? 'refined' : 'unmodified',
            draftStrokes: strokes,
          });
        }
      }
      allowExitRef.current = true;
      router.push('/');
    } catch {
      setExitError('下書きを保存できませんでした。もう一度お試しください。');
    } finally {
      setLeaving(false);
    }
  };

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
    if (isLocked(currentItem)) throw new Error('残りの画像を編集するには、広告案内から解放してください。');
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
      if (!hasBatchAccess && !workspace.trialItemId && !currentItem.refined) {
        await updateRefinementWorkspace(workspace.id, { trialItemId: currentItem.id, status: 'editing' });
        writeRefinementTrialUsed(window.localStorage);
        nextWorkspace = { ...workspace, trialItemId: currentItem.id, status: 'editing', updatedAt: Date.now() };
        setWorkspace(nextWorkspace);
      }
      currentDraftRef.current = [];
      setItems(existing => existing.map(item => item.id === saved.id ? saved : item));
      setMessage('修正を適用しました。');
      if (hasBatchAccess) {
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
        recalculateBoundingBox: item.refined === null,
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
  const eligibleIds = items.filter(item => item.eligible).map(item => item.id);
  const selectedCount = eligibleIds.filter(id => selectedIds.has(id)).length;
  const selectedRefinedCount = items.filter(item => item.eligible && selectedIds.has(item.id) && item.status === 'refined').length;

  return (
    <main className="mx-auto flex h-[calc(100dvh-5rem)] min-h-0 max-w-[1600px] flex-col overflow-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900">まとめて仕上げ修正</h1>
            <p className="text-xs text-slate-500">{items.findIndex(item => item.id === currentId) + 1} / {items.length}・修正済み {refinedCount}枚</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!exportMode && <button type="button" onClick={() => void saveCurrent()} disabled={exporting || !currentItem.eligible} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40">現在画像を保存</button>}
            <button type="button" onClick={() => setExportMode(value => !value)} disabled={exporting} aria-pressed={exportMode} className={`rounded-lg px-3 py-2 text-sm font-bold focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 ${exportMode ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{exportMode ? '編集に戻る' : 'ZIPを書き出す'}</button>
            {!hasBatchAccess && (workspace.trialItemId || requiresOfferwallBeforeEdit) && <button type="button" onClick={() => setShowUnlockPrompt(true)} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500">残りの画像を解放</button>}
            {!exportMode && <button type="button" onClick={() => setShowExitConfirm(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500">新しい画像を処理</button>}
          </div>
        </div>
        {exportMode && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 p-2 text-sm" aria-label="ZIP書き出し選択">
          <span className="mr-1 font-bold text-blue-950" role="status" aria-live="polite">{selectedCount}枚を選択中</span>
          <button type="button" onClick={() => setSelectedIds(new Set(eligibleIds))} className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-800 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500">全選択</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-800 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500">選択解除</button>
          <button type="button" onClick={() => void saveZip(false)} disabled={exporting || selectedCount === 0} className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40">{selectedCount}枚をZIP保存</button>
          <button type="button" onClick={() => void saveZip(true)} disabled={exporting || selectedRefinedCount === 0} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-bold text-emerald-700 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40">修正済み {selectedRefinedCount}枚だけ保存</button>
        </div>}
        {message ? <p className="mt-2 text-sm text-blue-700" role="status" aria-live="polite">{message}</p> : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside aria-label={exportMode ? 'ZIP書き出し画像の選択' : '編集画像の選択'} className="order-2 flex w-full shrink-0 gap-2 overflow-x-auto border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:order-1 lg:w-48 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-t-0 lg:pb-3 xl:w-52">
          {items.map(item => {
            const locked = isLocked(item);
            return (
              <div key={item.id} className={`w-32 shrink-0 rounded-xl border p-1.5 lg:w-full ${!exportMode && item.id === currentId ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                {exportMode ? <label className="block cursor-pointer rounded-lg p-1 hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500">
                  <RefinementThumbnail item={item} cache={thumbnailCache} />
                  <span className="mt-1 flex items-start gap-1.5 text-xs font-bold text-slate-800"><input type="checkbox" checked={selectedIds.has(item.id)} disabled={!item.eligible} onChange={() => setSelectedIds(current => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                    return next;
                  })} className="mt-0.5 accent-blue-600" /><span className="min-w-0 break-all">{item.name}</span></span>
                  <span className="mt-1 block text-[11px] text-slate-500">{!item.eligible ? '書き出し対象外' : locked ? '編集ロック中' : item.status === 'refined' ? '修正済み' : item.status === 'editing' ? '編集中' : '未修正'}</span>
                </label> : <button type="button" onClick={() => !locked && moveToItem(item.id)} disabled={locked} aria-current={item.id === currentId ? 'true' : undefined} aria-label={`${item.name}を編集・${!item.eligible ? '編集対象外' : locked ? 'ロック中' : item.status === 'refined' ? '修正済み' : item.status === 'editing' ? '編集中' : '未修正'}`} className="w-full rounded-lg p-1 text-left hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-55">
                  <RefinementThumbnail item={item} cache={thumbnailCache} />
                  <span className="mt-1 block truncate text-xs font-bold text-slate-800">{item.name}</span>
                  <span className="mt-1 block text-[11px] text-slate-500">{!item.eligible ? '編集対象外' : locked ? 'ロック中' : item.status === 'refined' ? '修正済み' : item.status === 'editing' ? '編集中' : '未修正'}</span>
                </button>}
              </div>
            );
          })}
        </aside>

        <section className="order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:order-2">
          {isLocked(currentItem) ? (
            <div className="grid min-h-[60dvh] place-items-center p-6 text-center">
              <div>
                <p className="font-bold text-slate-800">この画像はまだ編集できません</p>
                <button type="button" onClick={() => setShowUnlockPrompt(true)} className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">残りの画像を解放する</button>
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
              onCancel={() => setShowExitConfirm(true)}
              presentation="inline"
              applyLabel={hasBatchAccess ? '適用して次へ' : 'この画像に適用'}
            />
          ) : (
            <div className="grid min-h-[60dvh] place-items-center text-slate-500" role="status">画像を準備しています…</div>
          )}
        </section>
      </div>

      {showExitConfirm ? <WorkspaceDialog titleId="exit-confirm-title" title="編集画面を離れますか？" description="新しい画像の処理画面に移動します。未適用の修正は書き出し画像に反映されません。" onDismiss={() => { if (!leaving) setShowExitConfirm(false); }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setShowExitConfirm(false)} disabled={leaving} className="min-h-11 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">編集を続ける</button>
          <button type="button" onClick={() => void leaveWorkspace()} disabled={leaving} className="min-h-11 rounded-xl border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">{leaving ? '下書きを保存中…' : '新しい画像を処理'}</button>
        </div>
        {exitError ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{exitError}</p> : null}
      </WorkspaceDialog> : null}

      {pendingMoveId && !showExitConfirm ? <WorkspaceDialog titleId="move-confirm-title" title="未適用の修正があります" description="下書きを残して移動するか、破棄して移動してください。" onDismiss={() => setPendingMoveId(null)}>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_auto]">
          <button type="button" onClick={() => void keepDraftAndMove()} className="min-h-12 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-base">下書きを保存して移動</button>
          <button type="button" onClick={() => void discardAndMove()} className="min-h-12 whitespace-nowrap rounded-xl border border-red-300 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 sm:text-base">破棄して移動</button>
          <button type="button" onClick={() => setPendingMoveId(null)} className="min-h-12 whitespace-nowrap rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-base">戻る</button>
        </div>
      </WorkspaceDialog> : null}

      {showUnlockPrompt && !pendingMoveId && !showExitConfirm ? <WorkspaceDialog titleId="unlock-confirm-title" title="残りの画像も仕上げ修正しますか？" description={requiresOfferwallBeforeEdit ? '無料の修正枠は利用済みです。広告の対象ページへ移動すると、このバッチを解放できます。' : '最初の1枚は無料で修正できました。広告の対象ページへ移動すると、このバッチの残りを修正できます。'} onDismiss={() => setShowUnlockPrompt(false)}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setShowUnlockPrompt(false)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500">後で決める</button>
          <a href={`/refine/editor/rewarded?workspace=${encodeURIComponent(workspace.id)}&from_unlock=1`} onClick={() => { allowExitRef.current = true; }} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">広告の対象ページへ進む</a>
        </div>
      </WorkspaceDialog> : null}
    </main>
  );
}
