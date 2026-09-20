'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toCanvasSafeImageUrl } from '@/lib/client/canvasImage';

export type RefinementTool = 'erase' | 'restore';
type EditorTool = RefinementTool | 'pan';

type Point = { x: number; y: number };
export type RefinementStroke = {
  tool: RefinementTool;
  size: number;
  points: Point[];
};

type CutoutRefinementEditorProps = {
  sourceImageUrl: string;
  transparentImageUrl: string;
  imageName: string;
  onApply: (blob: Blob, toolUsed: 'erase' | 'restore' | 'both') => Promise<void> | void;
  onCancel: () => void;
  onFirstEdit?: (tool: RefinementTool) => void;
  initialStrokes?: RefinementStroke[];
  onDraftChange?: (strokes: RefinementStroke[]) => void;
  presentation?: 'modal' | 'inline';
  applyLabel?: string;
};

const PREVIEW_MAX_SIDE = 1400;
const MAX_EXPORT_PIXELS = 40_000_000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像を読み込めませんでした。'));
    image.src = toCanvasSafeImageUrl(url);
  });
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: RefinementStroke,
  width: number,
  height: number,
  source: CanvasImageSource,
) {
  if (stroke.points.length === 0) return;
  const points = stroke.points.map(point => ({ x: point.x * width, y: point.y * height }));
  const lineWidth = Math.max(1, stroke.size * Math.min(width, height));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  if (stroke.tool === 'erase') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    const pattern = ctx.createPattern(source, 'no-repeat');
    if (!pattern) {
      ctx.restore();
      return;
    }
    const sourceWidth = source instanceof HTMLImageElement
      ? source.naturalWidth
      : source instanceof HTMLCanvasElement
        ? source.width
        : width;
    const sourceHeight = source instanceof HTMLImageElement
      ? source.naturalHeight
      : source instanceof HTMLCanvasElement
        ? source.height
        : height;
    if (typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined' && sourceWidth && sourceHeight) {
      pattern.setTransform(new DOMMatrix().scale(width / sourceWidth, height / sourceHeight));
    }
    ctx.strokeStyle = pattern;
    ctx.fillStyle = pattern;
  }

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('修正画像を作成できませんでした。'));
    }, 'image/png');
  });
}

export default function CutoutRefinementEditor({
  sourceImageUrl,
  transparentImageUrl,
  imageName,
  onApply,
  onCancel,
  onFirstEdit,
  initialStrokes = [],
  onDraftChange,
  presentation = 'modal',
  applyLabel = '修正を適用',
}: CutoutRefinementEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sourcePreviewRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const transparentImageRef = useRef<HTMLImageElement | null>(null);
  const activeStrokeRef = useRef<RefinementStroke | null>(null);
  const activeStrokePointerIdRef = useRef<number | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<
    | { kind: 'pan'; pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number }
    | { kind: 'pinch'; distance: number; zoom: number; centerX: number; centerY: number; scrollLeft: number; scrollTop: number }
    | null
  >(null);
  const firstEditTrackedRef = useRef(false);
  const [strokes, setStrokes] = useState<RefinementStroke[]>(() => initialStrokes);
  const [redoStrokes, setRedoStrokes] = useState<RefinementStroke[]>([]);
  const [tool, setTool] = useState<EditorTool>('erase');
  const [brushSize, setBrushSize] = useState(32);
  const [zoom, setZoom] = useState(1);
  const [showBefore, setShowBefore] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 });
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });
  const [brushCursor, setBrushCursor] = useState({ x: 0, y: 0, visible: false });
  const [hasFinePointer, setHasFinePointer] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [viewOpen, setViewOpen] = useState(false);

  const fitScale = useMemo(() => Math.min(
    1,
    Math.max(0.01, (viewportSize.width - 24) / previewSize.width),
    Math.max(0.01, (viewportSize.height - 24) / previewSize.height),
  ), [previewSize.height, previewSize.width, viewportSize.height, viewportSize.width]);
  const displaySize = useMemo(() => ({
    width: Math.max(1, Math.round(previewSize.width * fitScale * zoom)),
    height: Math.max(1, Math.round(previewSize.height * fitScale * zoom)),
  }), [fitScale, previewSize.height, previewSize.width, zoom]);

  const usedTools = useMemo(() => {
    const tools = new Set(strokes.map(stroke => stroke.tool));
    if (tools.has('erase') && tools.has('restore')) return 'both' as const;
    if (tools.has('restore')) return 'restore' as const;
    return 'erase' as const;
  }, [strokes]);

  const renderPreview = useCallback((nextStrokes = strokes, active?: RefinementStroke | null) => {
    const canvas = canvasRef.current;
    const transparentImage = transparentImageRef.current;
    const sourcePreview = sourcePreviewRef.current;
    if (!canvas || !transparentImage || !sourcePreview) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showOriginal) {
      ctx.drawImage(sourcePreview, 0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.drawImage(transparentImage, 0, 0, canvas.width, canvas.height);
    if (showBefore) return;
    nextStrokes.forEach(stroke => drawStroke(ctx, stroke, canvas.width, canvas.height, sourcePreview));
    if (active) drawStroke(ctx, active, canvas.width, canvas.height, sourcePreview);
    if (tool === 'restore') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.globalAlpha = 0.32;
      ctx.drawImage(sourcePreview, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }, [showBefore, showOriginal, strokes, tool]);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    Promise.all([loadImage(sourceImageUrl), loadImage(transparentImageUrl)])
      .then(([sourceImage, transparentImage]) => {
        if (canceled) return;
        const width = transparentImage.naturalWidth;
        const height = transparentImage.naturalHeight;
        if (!width || !height) throw new Error('画像サイズを取得できませんでした。');
        sourceImageRef.current = sourceImage;
        transparentImageRef.current = transparentImage;
        setImageSize({ width, height });

        const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(width, height));
        const previewWidth = Math.max(1, Math.round(width * scale));
        const previewHeight = Math.max(1, Math.round(height * scale));
        setPreviewSize({ width: previewWidth, height: previewHeight });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = previewWidth;
        canvas.height = previewHeight;

        const sourcePreview = document.createElement('canvas');
        sourcePreview.width = previewWidth;
        sourcePreview.height = previewHeight;
        const sourceCtx = sourcePreview.getContext('2d');
        if (!sourceCtx) throw new Error('編集画面を準備できませんでした。');
        sourceCtx.drawImage(sourceImage, 0, 0, previewWidth, previewHeight);
        sourcePreviewRef.current = sourcePreview;
        setLoading(false);
      })
      .catch(nextError => {
        if (!canceled) {
          setError(nextError instanceof Error ? nextError.message : '編集画面を準備できませんでした。');
          setLoading(false);
        }
      });
    return () => { canceled = true; };
  }, [sourceImageUrl, transparentImageUrl]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview, loading]);

  useEffect(() => {
    onDraftChange?.(strokes);
  }, [onDraftChange, strokes]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updatePointerType = () => setHasFinePointer(media.matches);
    updatePointerType();
    media.addEventListener?.('change', updatePointerType);
    return () => media.removeEventListener?.('change', updatePointerType);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frameId: number | null = null;
    const updateSize = () => {
      if (frameId != null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const width = Math.max(1, viewport.clientWidth);
        const height = Math.max(1, viewport.clientHeight);
        setViewportSize(current => current.width === width && current.height === height
          ? current
          : { width, height });
      });
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      if (frameId != null) cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applying) onCancel();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          setRedoStrokes(current => {
            const redo = current.at(-1);
            if (!redo) return current;
            setStrokes(existing => [...existing, redo]);
            return current.slice(0, -1);
          });
        } else {
          setStrokes(current => {
            const removed = current.at(-1);
            if (!removed) return current;
            setRedoStrokes(existing => [...existing, removed]);
            return current.slice(0, -1);
          });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applying, onCancel]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };

  const updateBrushCursor = (event: React.PointerEvent<HTMLCanvasElement>, visible = true) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setBrushCursor({
      x: Math.min(rect.width, Math.max(0, event.clientX - rect.left)),
      y: Math.min(rect.height, Math.max(0, event.clientY - rect.top)),
      visible: visible && tool !== 'pan' && !showBefore && !showOriginal,
    });
  };

  const beginPinchGesture = () => {
    const viewport = viewportRef.current;
    const points = Array.from(pointersRef.current.values());
    if (!viewport || points.length < 2) return;
    const [first, second] = points;
    const rect = viewport.getBoundingClientRect();
    const centerX = ((first.x + second.x) / 2) - rect.left;
    const centerY = ((first.y + second.y) / 2) - rect.top;
    gestureRef.current = {
      kind: 'pinch',
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      zoom,
      centerX,
      centerY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    activeStrokeRef.current = null;
    activeStrokePointerIdRef.current = null;
    renderPreview(strokes);
    setBrushCursor(current => ({ ...current, visible: false }));
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (loading || applying || showBefore || showOriginal) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size >= 2) {
      beginPinchGesture();
      return;
    }
    const viewport = viewportRef.current;
    if (tool === 'pan') {
      if (viewport) {
        gestureRef.current = {
          kind: 'pan',
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          scrollLeft: viewport.scrollLeft,
          scrollTop: viewport.scrollTop,
        };
      }
      return;
    }
    updateBrushCursor(event);
    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedBrushSize = brushSize / Math.max(1, Math.min(rect.width, rect.height));
    const stroke: RefinementStroke = { tool, size: normalizedBrushSize, points: [pointFromEvent(event)] };
    activeStrokeRef.current = stroke;
    activeStrokePointerIdRef.current = event.pointerId;
    renderPreview(strokes, stroke);
    if (!firstEditTrackedRef.current) {
      firstEditTrackedRef.current = true;
      onFirstEdit?.(tool);
    }
  };

  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    // マウスでは描画していないホバー中もブラシ径を追従表示する。
    if (event.pointerType === 'mouse' && tool !== 'pan') {
      updateBrushCursor(event);
    }
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const viewport = viewportRef.current;
    const gesture = gestureRef.current;

    if (pointersRef.current.size >= 2) {
      if (gesture?.kind !== 'pinch') beginPinchGesture();
      const pinch = gestureRef.current;
      const points = Array.from(pointersRef.current.values());
      if (!viewport || pinch?.kind !== 'pinch' || points.length < 2) return;
      const [first, second] = points;
      const rect = viewport.getBoundingClientRect();
      const centerX = ((first.x + second.x) / 2) - rect.left;
      const centerY = ((first.y + second.y) / 2) - rect.top;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const nextZoom = Math.min(5, Math.max(0.5, pinch.zoom * (distance / pinch.distance)));
      const zoomRatio = nextZoom / pinch.zoom;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        viewport.scrollLeft = (pinch.scrollLeft + pinch.centerX) * zoomRatio - centerX;
        viewport.scrollTop = (pinch.scrollTop + pinch.centerY) * zoomRatio - centerY;
      });
      return;
    }

    if (gesture?.kind === 'pan' && gesture.pointerId === event.pointerId && viewport) {
      viewport.scrollLeft = gesture.scrollLeft - (event.clientX - gesture.x);
      viewport.scrollTop = gesture.scrollTop - (event.clientY - gesture.y);
      return;
    }

    const active = activeStrokeRef.current;
    if (!active || activeStrokePointerIdRef.current !== event.pointerId || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateBrushCursor(event);
    active.points.push(pointFromEvent(event));
    renderPreview(strokes, active);
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    const gesture = gestureRef.current;
    if (gesture?.kind === 'pinch') {
      if (pointersRef.current.size < 2) gestureRef.current = null;
      if (event.pointerType !== 'mouse') setBrushCursor(current => ({ ...current, visible: false }));
      return;
    }
    if (gesture?.kind === 'pan' && gesture.pointerId === event.pointerId) {
      gestureRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    const active = activeStrokeRef.current;
    if (!active || activeStrokePointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activeStrokeRef.current = null;
    activeStrokePointerIdRef.current = null;
    setStrokes(current => [...current, active]);
    setRedoStrokes([]);
    if (event.pointerType !== 'mouse') setBrushCursor(current => ({ ...current, visible: false }));
  };

  const changeZoom = (nextZoom: number) => {
    const viewport = viewportRef.current;
    const clampedZoom = Math.min(5, Math.max(0.5, nextZoom));
    if (!viewport) {
      setZoom(clampedZoom);
      return;
    }
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    const ratio = clampedZoom / zoom;
    const previousScrollLeft = viewport.scrollLeft;
    const previousScrollTop = viewport.scrollTop;
    setZoom(clampedZoom);
    requestAnimationFrame(() => {
      viewport.scrollLeft = (previousScrollLeft + centerX) * ratio - centerX;
      viewport.scrollTop = (previousScrollTop + centerY) * ratio - centerY;
    });
  };

  const undo = () => {
    setStrokes(current => {
      const removed = current.at(-1);
      if (!removed) return current;
      setRedoStrokes(existing => [...existing, removed]);
      return current.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStrokes(current => {
      const restored = current.at(-1);
      if (!restored) return current;
      setStrokes(existing => [...existing, restored]);
      return current.slice(0, -1);
    });
  };

  const apply = async () => {
    const sourceImage = sourceImageRef.current;
    const transparentImage = transparentImageRef.current;
    if (!sourceImage || !transparentImage || strokes.length === 0) return;
    const width = transparentImage.naturalWidth;
    const height = transparentImage.naturalHeight;
    if (width * height > MAX_EXPORT_PIXELS) {
      setError('この画像は修正用の上限を超えています。長辺を小さくしてからお試しください。');
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('修正画像を作成できませんでした。');
      ctx.drawImage(transparentImage, 0, 0, width, height);
      strokes.forEach(stroke => drawStroke(ctx, stroke, width, height, sourceImage));
      const blob = await canvasToPngBlob(canvas);
      await onApply(blob, usedTools);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '修正の適用に失敗しました。');
    } finally {
      setApplying(false);
    }
  };

  const editor = (
    <div
      className={presentation === 'modal'
        ? 'fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 sm:p-5'
        : 'flex h-full min-h-0 flex-1 overflow-hidden bg-slate-100'}
      role={presentation === 'modal' ? 'dialog' : 'region'}
      aria-modal={presentation === 'modal' ? 'true' : undefined}
      aria-labelledby="refinement-title"
    >
      <div className={presentation === 'modal'
        ? 'flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[92dvh] sm:max-h-[900px] sm:rounded-2xl'
        : 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white'}>
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="refinement-title" className="text-base font-black text-slate-900 sm:text-lg">切り抜きを修正</h2>
            <p className="truncate text-xs text-slate-500">{imageName}・{imageSize.width}×{imageSize.height}px</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={undo} disabled={strokes.length === 0} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30" aria-label="元に戻す" title="元に戻す">
              <span className="material-symbols-outlined" aria-hidden="true">undo</span>
            </button>
            <button type="button" onClick={redo} disabled={redoStrokes.length === 0} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30" aria-label="やり直す" title="やり直す">
              <span className="material-symbols-outlined" aria-hidden="true">redo</span>
            </button>
            {presentation === 'inline' && <button type="button" onClick={() => void apply()} disabled={loading || applying || strokes.length === 0} className="min-h-11 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 sm:px-4 sm:text-sm">{applying ? '適用中…' : applyLabel}</button>}
            {presentation === 'modal' && <button type="button" onClick={onCancel} disabled={applying} className="min-h-11 min-w-11 rounded-full text-2xl text-slate-500 hover:bg-slate-100" aria-label="修正画面を閉じる">×</button>}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={viewportRef}
            className={`relative flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable_both-edges] bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] ${presentation === 'modal' ? 'min-h-[40dvh] lg:min-h-0' : 'min-h-0'}`}
          >
            <div
              className="grid place-items-center p-3 sm:p-4"
              style={{
                width: `max(100%, ${displaySize.width + 24}px)`,
                height: `max(100%, ${displaySize.height + 24}px)`,
              }}
            >
              <div className="relative shadow-xl" style={{ width: `${displaySize.width}px`, height: `${displaySize.height}px` }}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={startStroke}
                  onPointerMove={continueStroke}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                  onPointerEnter={event => updateBrushCursor(event)}
                  onPointerLeave={event => {
                    if (event.pointerType === 'mouse' && !activeStrokeRef.current) {
                      setBrushCursor(current => ({ ...current, visible: false }));
                    }
                  }}
                  className={`block max-w-none touch-none ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'}`}
                  style={{ width: `${displaySize.width}px`, height: `${displaySize.height}px` }}
                  aria-label="切り抜き修正キャンバス"
                />
                {brushCursor.visible && (
                  <div
                    className="pointer-events-none absolute rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.9)]"
                    style={{
                      width: `${brushSize}px`,
                      height: `${brushSize}px`,
                      left: `${brushCursor.x}px`,
                      top: `${brushCursor.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </div>
          {presentation === 'inline' && <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
            <div className="pointer-events-auto max-w-[min(19rem,calc(100vw-5rem))] rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
              <button type="button" aria-expanded={toolsOpen} aria-controls="inline-refinement-tools" onClick={() => setToolsOpen(value => !value)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500">ツール {toolsOpen ? '−' : '＋'}</button>
              <div id="inline-refinement-tools" hidden={!toolsOpen} className={toolsOpen ? 'space-y-2 p-1' : 'hidden'}>
                <div className="flex gap-1" role="group" aria-label="修正ツール">
                  {(['erase', 'restore', 'pan'] as const).map(nextTool => <button key={nextTool} type="button" onClick={() => { setTool(nextTool); setShowOriginal(false); setShowBefore(false); }} aria-pressed={tool === nextTool} className={`min-h-10 flex-1 rounded-lg border px-2 text-xs font-bold hover:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 ${tool === nextTool ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{nextTool === 'erase' ? '透過' : nextTool === 'restore' ? '復元' : '移動'}</button>)}
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">ブラシ <span className="tabular-nums">{brushSize}px</span><input type="range" min="8" max="120" step="2" value={brushSize} onChange={event => setBrushSize(Number(event.target.value))} disabled={tool === 'pan'} className="min-w-0 flex-1 accent-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500" /></label>
              </div>
            </div>
            <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
              <button type="button" aria-expanded={viewOpen} aria-controls="inline-refinement-view" onClick={() => setViewOpen(value => !value)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500">表示 {viewOpen ? '−' : '＋'}</button>
              <div id="inline-refinement-view" hidden={!viewOpen} className={viewOpen ? 'grid w-40 grid-cols-3 gap-1 p-1' : 'hidden'}>
                <button type="button" onClick={() => changeZoom(zoom - 0.25)} aria-label="縮小" className="min-h-10 rounded-lg border border-slate-200 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500">−</button>
                <button type="button" onClick={() => changeZoom(1)} aria-label="全体表示" className="min-h-10 rounded-lg border border-slate-200 text-xs hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500">全体</button>
                <button type="button" onClick={() => changeZoom(zoom + 0.25)} aria-label="拡大" className="min-h-10 rounded-lg border border-slate-200 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500">＋</button>
                <button type="button" onClick={() => { setShowBefore(value => !value); setShowOriginal(false); }} aria-pressed={showBefore} className={`col-span-3 min-h-10 rounded-lg border text-xs font-bold focus-visible:ring-2 focus-visible:ring-blue-500 ${showBefore ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>修正前と比較</button>
                <button type="button" onClick={() => { setShowOriginal(value => !value); setShowBefore(false); }} aria-pressed={showOriginal} className={`col-span-3 min-h-10 rounded-lg border text-xs font-bold focus-visible:ring-2 focus-visible:ring-blue-500 ${showOriginal ? 'border-amber-600 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}>元画像と比較</button>
              </div>
            </div>
          </div>}
          <div className="pointer-events-none absolute bottom-[calc(0.5rem+env(safe-area-inset-bottom))] right-[calc(0.5rem+env(safe-area-inset-right))] z-10 sm:bottom-4 sm:right-4">
            <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-bold text-white shadow-sm tabular-nums">{Math.round(zoom * 100)}%・{hasFinePointer ? '移動ツールでドラッグ' : '2本指で移動/拡大'}</span>
          </div>
          {presentation === 'inline' && (loading || error) && <div className="pointer-events-none absolute bottom-12 left-2 z-10 max-w-xs rounded-lg bg-white/95 p-2 text-sm shadow-lg" role={error ? 'alert' : 'status'}>{error ?? '編集画面を準備しています…'}</div>}
          </div>

          {presentation === 'modal' && <aside className="w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:w-80 lg:space-y-5 lg:border-l lg:border-t-0 lg:p-5">
            <div>
              <p className="mb-2 hidden text-xs font-bold uppercase tracking-wide text-slate-500 lg:block">ツール</p>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => { setTool('erase'); setShowOriginal(false); setShowBefore(false); }} aria-pressed={tool === 'erase'} className={`min-h-11 rounded-xl border px-2 text-sm font-bold ${tool === 'erase' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>透過</button>
                <button type="button" onClick={() => { setTool('restore'); setShowOriginal(false); setShowBefore(false); }} aria-pressed={tool === 'restore'} className={`min-h-11 rounded-xl border px-2 text-sm font-bold ${tool === 'restore' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>復元</button>
                <button type="button" onClick={() => { setTool('pan'); setShowOriginal(false); setShowBefore(false); }} aria-pressed={tool === 'pan'} className={`min-h-11 rounded-xl border px-2 text-sm font-bold ${tool === 'pan' ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>移動</button>
              </div>
            </div>

            <label className="mt-3 flex items-center gap-3 text-sm font-bold text-slate-700 lg:mt-0 lg:block">
              <span className="shrink-0">ブラシサイズ <span className="font-mono text-xs text-slate-500">{brushSize}px</span></span>
              <input type="range" min="8" max="120" step="2" value={brushSize} onChange={event => setBrushSize(Number(event.target.value))} className="w-full lg:mt-2" disabled={tool === 'pan'} aria-label="ブラシサイズ" />
            </label>

            <div className="mt-3 lg:mt-0">
              <p className="mb-2 hidden text-xs font-bold uppercase tracking-wide text-slate-500 lg:block">表示</p>
              <div className="grid grid-cols-5 gap-2">
                <button type="button" onClick={() => changeZoom(zoom - 0.25)} className="min-h-10 rounded-lg border border-slate-200" aria-label="縮小">−</button>
                <button type="button" onClick={() => changeZoom(1)} className="min-h-10 rounded-lg border border-slate-200 text-xs font-bold" aria-label="全体表示">全体</button>
                <button type="button" onClick={() => changeZoom(zoom + 0.25)} className="min-h-10 rounded-lg border border-slate-200" aria-label="拡大">＋</button>
                <button
                  type="button"
                  onClick={() => { setShowBefore(value => !value); setShowOriginal(false); }}
                  className={`min-h-10 rounded-lg border text-xs font-bold transition-colors ${showBefore ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700'}`}
                  aria-pressed={showBefore}
                >
                  {showBefore ? '✓ 修正前' : '修正前'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOriginal(value => !value); setShowBefore(false); }}
                  className={`min-h-10 rounded-lg border text-xs font-bold transition-colors ${showOriginal ? 'border-amber-600 bg-amber-500 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700'}`}
                  aria-pressed={showOriginal}
                >
                  {showOriginal ? '✓ 元画像' : '元画像'}
                </button>
              </div>
            </div>

            {loading && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">編集画面を準備しています…</p>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-3 grid grid-cols-[0.8fr_1.2fr] gap-2 lg:mt-0 lg:flex lg:flex-col lg:pt-2">
              <button type="button" onClick={onCancel} disabled={applying} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold text-slate-700">キャンセル</button>
              <button type="button" onClick={() => void apply()} disabled={loading || applying || strokes.length === 0} className="min-h-11 rounded-xl bg-blue-600 px-4 font-bold text-white disabled:opacity-50 lg:order-first lg:min-h-12">{applying ? '適用中…' : applyLabel}</button>
            </div>
          </aside>}
        </div>
      </div>
    </div>
  );

  return presentation === 'inline' ? editor : createPortal(editor, document.body);
}
