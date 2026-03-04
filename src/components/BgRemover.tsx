'use client'

import { useState, useCallback, useRef, useEffect } from "react";
// heic2any は必要な時だけ動的 import します
import Link from "next/link";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { upload as uploadToBlob } from '@vercel/blob/client';

// ファイルステータスの型定義
type FileStatus =
  | "pending"        // 待機中（HEIC変換前または処理待ち）
  | "converting"     // HEIC変換中
  | "ready"          // 処理準備完了（HEIC変換後または元々JPEG/PNG）
  | "uploading"      // アップロード中
  | "processing"     // 背景除去処理中
  | "completed"      // 完了
  | "error";         // エラー発生

type InFile = {
  id: string;          // ユニークID
  originalFile: File;  // 元のファイルオブジェクト
  blob: File | Blob;   // 処理用Blob (HEIC変換後は変換後のBlob)
  name: string;        // ファイル名
  status: FileStatus;  // 現在のステータス
  previewUrl?: string; // 追加: 元ファイルのプレビュー用URL
  errorMessage?: string; // エラーメッセージ
  outputUrl?: string;   // 処理後の画像URL (背景除去成功時)
  standardOutputUrl?: string; // 標準保存向けURL（Pro時に軽量版を併置）
  highQualityOutputUrl?: string; // 高画質保存向けURL（Pro時）
  boundingBox?: { x: number, y: number, width: number, height: number }; // 追加: 対象物のバウンディングボックス
  startTime?: number;   // 処理開始時刻
  endTime?: number;     // 処理完了時刻
  processingOrder?: number; // 並行処理での順序
  sourceQualityMode?: ProcessingMode;
  lastProcessingMode?: ProcessingMode;
  wasCompressedForFree?: boolean;
  wasEnhanced?: boolean;
  outputLongSide?: number;
  outputWidth?: number;
  outputHeight?: number;
};

import UploadArea from "./UploadArea";
import PrimaryButton from "./PrimaryButton";
import RatioButton from "./RatioButton";
import AdSlot from "./AdSlot";
import {
  normalizeDataUrlLongSide,
  resizeDataUrlLongSide,
  pickEsrganScaleForTarget,
  toEnhanceLongSide,
  compressDataUrlForApi,
  computeUpscaledDimensions,
} from '@/lib/image/enhance';
import { trackAnalyticsEvent } from '@/lib/analytics/events';

type AdUserPlan = 'pro' | 'free' | 'guest';
type AdPlacement = 'after_cta' | 'bottom';
type ProcessingMode = 'standard' | 'pro_high_precision';
type EnhanceTarget = '1k' | '2k' | '4k';
type OversizedPromptItem = {
  id: string;
  name: string;
  issues: string[];
};

// 背景テンプレートの定義
const templates = [
  { name: "白", src: "#FFFFFF" },
  { name: "グラデーション", src: "/templates/gradient-blue-purple.svg" },
  { name: "レンガ", src: "/templates/brick-wall.jpg" },
  { name: "ボケ", src: "/templates/bokeh-lights.jpg" },
  { name: "木目", src: "/templates/wood.jpg" },
  { name: "壁紙", src: "/templates/wallpaper.jpg" },
  { name: "大理石", src: "/templates/marble.jpg" },
  { name: "自然光", src: "/templates/natural-light.jpg" },
  { name: "アート", src: "/templates/art01.jpg" },
  { name: "コットン", src: "/templates/cotton.jpg" },
];

const aspectRatios = [
  { key: '1:1', label: '1:1 (正方形)' },
  { key: '16:9', label: '16:9 (ワイド)' },
  { key: '4:3', label: '4:3 (標準)' },
  { key: 'original', label: '元画像に合わせる' },
  { key: 'fit-subject', label: '被写体にフィット' }
];

// Freeの安全上限（Edge経由ルート互換）
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_UPLOAD_MB = 4;
const FREE_TARGET_BYTES = Math.floor(3.5 * 1024 * 1024);
const FREE_MAX_MP = Number(process.env.NEXT_PUBLIC_FREE_MAX_MP || '8');
const PRO_MAX_UPLOAD_BYTES = (Number(process.env.NEXT_PUBLIC_PRO_MAX_UPLOAD_MB || '25')) * 1024 * 1024;
const PRO_MAX_MP = Number(process.env.NEXT_PUBLIC_PRO_MAX_MP || '90');
const PRO_MAX_SIDE = Number(process.env.NEXT_PUBLIC_PRO_MAX_SIDE_PX || '10000');
const FREE_OUTPUT_MAX_SIDE = Number(process.env.NEXT_PUBLIC_FREE_OUTPUT_MAX_SIDE_PX || '3200');
const PRO_OUTPUT_MAX_SIDE = Number(process.env.NEXT_PUBLIC_PRO_OUTPUT_MAX_SIDE_PX || '7000');
const USE_DIRECT_UPLOAD_FOR_PRO = process.env.NEXT_PUBLIC_UPLOAD_DIRECT_ENABLED !== 'false';
const PROCESSING_MODE_SESSION_KEY = 'bgremover_processing_mode';

/** blob: または data: を Replicate が受け付ける data URI に変換 */
async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

type BgRemoverMultiProps = {
  isPro?: boolean;
  adUserPlan?: AdUserPlan;
};

export default function BgRemoverMulti({ isPro = false, adUserPlan = 'guest' }: BgRemoverMultiProps) {

  /* ------------ state --------------- */
  const [inputs, setInputs] = useState<InFile[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState<string>('#FFFFFF');
  const [selectedRatio, setSelectedRatio] = useState<string>('fit-subject');

  // --- 背景拡張: 任意画像 / AI生成 / なじませる ---
  const [customBgImage, setCustomBgImage] = useState<string | null>(null); // 任意背景画像のData URL
  const [aiBgPrompt, setAiBgPrompt] = useState<string>(''); // AI背景生成のテキスト入力
  const [aiBgPreset, setAiBgPreset] = useState<string | null>(null); // 選択されたAIプリセット
  const [aiBgError, setAiBgError] = useState<string | null>(null); // AI背景生成エラー
  const [premiumRemaining, setPremiumRemaining] = useState<number | null>(null); // 残回数
  const customBgInputRef = useRef<HTMLInputElement>(null);
  // 背景処理モード: 'normal'=従来bg-remove, 'ai_generate'=bria/generate-background
  const [bgMode, setBgMode] = useState<'normal' | 'ai_generate'>('normal');
  // 「自然になじませる」ON/OFF（デフォルトOFF、テンプレ/カラー/カスタム画像選択時のみ有効）
  const [blendEnabled, setBlendEnabled] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [oversizedPromptItems, setOversizedPromptItems] = useState<OversizedPromptItem[]>([]);
  const [selectedProcessingMode, setSelectedProcessingMode] = useState<ProcessingMode>(() =>
    isPro ? 'pro_high_precision' : 'standard'
  );
  const [enhancingFileId, setEnhancingFileId] = useState<string | null>(null);
  const [batchEnhanceState, setBatchEnhanceState] = useState<{
    inProgress: boolean;
    target: EnhanceTarget | null;
    completed: number;
    total: number;
  }>({
    inProgress: false,
    target: null,
    completed: 0,
    total: 0,
  });
  const [pendingEnhance, setPendingEnhance] = useState<{ fileId: string; target: EnhanceTarget } | null>(null);
  const [pendingBatchTarget, setPendingBatchTarget] = useState<EnhanceTarget | null>(null);
  const proOfferImpressionTrackedRef = useRef(false);
  const sectionModeRef = useRef<HTMLDivElement>(null);
  const sectionSizeRef = useRef<HTMLDivElement>(null);
  const sectionBgRef = useRef<HTMLDivElement>(null);
  const sectionFilesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [isCtaVisible, setIsCtaVisible] = useState<boolean>(true);

  // 並行処理制限の設定（ユーザーには見せず、完全自動）
  const [maxConcurrentProcesses, setMaxConcurrentProcesses] = useState<number>(5); // デフォルト5並行
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentlyProcessing, setCurrentlyProcessing] = useState<number>(0);
  const [adaptiveConcurrency] = useState<boolean>(true); // 常に自動調整ON
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [avgResponseTime, setAvgResponseTime] = useState<number>(0); // 平均レスポンス時間

  // デバッグ・ログ機能（開発者モードのみ、通常は非表示）
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [processingLogs, setProcessingLogs] = useState<Array<{
    id: string;
    fileName: string;
    timestamp: number;
    event: 'start' | 'api_request' | 'api_response' | 'processing' | 'completed' | 'error';
    duration?: number;
    details?: string;
    responseTime?: number;
  }>>([]);

  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED !== 'false';
  const adPlacement: AdPlacement = process.env.NEXT_PUBLIC_AD_PLACEMENT === 'bottom' ? 'bottom' : 'after_cta';
  const adHref = process.env.NEXT_PUBLIC_AD_RESULT_URL;
  const adTitle = process.env.NEXT_PUBLIC_AD_RESULT_TITLE || '画像作業に役立つおすすめサービス';
  const adDescription =
    process.env.NEXT_PUBLIC_AD_RESULT_DESCRIPTION || '背景透過の次の作業に使える関連ツールを紹介しています。';
  const adCtaLabel = process.env.NEXT_PUBLIC_AD_RESULT_CTA_LABEL || '詳細を見る';
  const hasCompletedResults = inputs.some(input => input.status === 'completed');
  const shouldShowResultAd = adsEnabled && !isPro && hasCompletedResults;
  const HEADER_OFFSET_PX = 88;

  const scrollToSectionWithHeaderOffset = useCallback((target: HTMLDivElement | null) => {
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isPro) return;
    if (!hasCompletedResults) return;
    if (proOfferImpressionTrackedRef.current) return;
    trackAnalyticsEvent('pro_high_precision_impression', { section: 'result' });
    proOfferImpressionTrackedRef.current = true;
  }, [hasCompletedResults, isPro]);

  // 隠し機能：デバッグモード切り替え（Ctrl+Shift+D）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
        console.log('Debug mode:', !debugMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PROCESSING_MODE_SESSION_KEY);
      if (saved === 'standard' || saved === 'pro_high_precision') {
        if (saved === 'pro_high_precision' && !isPro) {
          setSelectedProcessingMode('standard');
        } else {
          setSelectedProcessingMode(saved);
        }
        return;
      }
    } catch {
      // ignore sessionStorage errors
    }

    setSelectedProcessingMode(isPro ? 'pro_high_precision' : 'standard');
  }, [isPro]);

  useEffect(() => {
    try {
      sessionStorage.setItem(PROCESSING_MODE_SESSION_KEY, selectedProcessingMode);
    } catch {
      // ignore sessionStorage errors
    }
  }, [selectedProcessingMode]);

  // 元のCTAがビューポート内にあるか監視（スティッキーCTAの表示切り替え用）
  useEffect(() => {
    if (!ctaRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsCtaVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, []);

  // ログ記録関数（デバッグモード時のみ動作）
  const addLog = useCallback((log: {
    id: string;
    fileName: string;
    event: 'start' | 'api_request' | 'api_response' | 'processing' | 'completed' | 'error';
    duration?: number;
    details?: string;
    responseTime?: number;
  }) => {
    // デバッグモードでない場合は何もしない
    if (!debugMode) return;

    setProcessingLogs(prev => [...prev, {
      ...log,
      timestamp: Date.now()
    }].slice(-100)); // 最新100件を保持
  }, [debugMode, setProcessingLogs]);

  // パフォーマンス統計
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [performanceStats, setPerformanceStats] = useState<{
    totalProcessed: number;
    totalErrors: number;
    totalTime: number;
    avgFileSize: number;
    peakConcurrency: number;
  }>({
    totalProcessed: 0,
    totalErrors: 0,
    totalTime: 0,
    avgFileSize: 0,
    peakConcurrency: 0
  });

  // AbortController for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelRequestedRef = useRef(false);

  // 並行数を動的に調整する関数
  const adjustConcurrency = useCallback((responseTime: number, success: boolean) => {
    if (!adaptiveConcurrency) return;

    setAvgResponseTime(prev => {
      const newAvg = prev === 0 ? responseTime : (prev * 0.7 + responseTime * 0.3);

      // レスポンス時間とエラー状況に基づいて並行数を調整
      setMaxConcurrentProcesses(current => {
        if (!success) {
          // エラーの場合は並行数を減らす
          return Math.max(1, current - 1);
        } else if (newAvg < 3000 && current < 10) {
          // レスポンスが早い場合は並行数を増やす
          return current + 1;
        } else if (newAvg > 8000 && current > 2) {
          // レスポンスが遅い場合は並行数を減らす
          return current - 1;
        }
        return current;
      });

      return newAvg;
    });
  }, [adaptiveConcurrency]);

  // セマフォ機能：並行数制限
  const processingQueue = useRef<(() => void)[]>([]);
  const processingSlots = useRef<number>(0);

  const acquireSlot = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (processingSlots.current < maxConcurrentProcesses) {
        processingSlots.current++;
        resolve();
      } else {
        processingQueue.current.push(() => {
          processingSlots.current++;
          resolve();
        });
      }
    });
  }, [maxConcurrentProcesses]);

  const releaseSlot = useCallback(() => {
    processingSlots.current--;
    const next = processingQueue.current.shift();
    if (next) {
      next();
    }
  }, []);

  // キャンセル機能
  const handleCancel = useCallback(() => {
    cancelRequestedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('User cancelled');
    }

    // 処理中のファイルを ready 状態に戻す
    setInputs(prev => prev.map(input => {
      if (input.status === 'uploading' || input.status === 'processing') {
        return { ...input, status: 'ready', errorMessage: undefined };
      }
      return input;
    }));

    setBusy(false);
    setCurrentlyProcessing(0);
    setMsg('処理がキャンセルされました。');

    // 並行処理関連の状態をリセット
    processingSlots.current = 0;
    processingQueue.current = [];

    // キャンセル記録（デバッグモード時のみ）
    addLog({
      id: 'system',
      fileName: 'SYSTEM',
      event: 'error',
      details: 'ユーザーによるキャンセル'
    });
  }, [addLog]);

  // オブジェクトURLを管理するためのRef
  const objectUrlsRef = useRef<string[]>([]);

  // オブジェクトURLをクリーンアップする関数
  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Failed to revoke object URL:', url, error);
      }
    });
    objectUrlsRef.current = [];
  }, []);

  // 新しいオブジェクトURLを登録
  const registerObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
  };

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      cleanupObjectUrls();
      // 進行中のリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Component unmounted');
      }
    };
  }, [cleanupObjectUrls]);

  // メモリ最適化：定期的なガベージコレクション誘発とクリーンアップ
  useEffect(() => {
    const memoryCleanupInterval = setInterval(() => {
      // 大量のオブジェクトURL管理時のメモリクリーンアップ
      if (objectUrlsRef.current.length > 50) {
        const urlsToRevoke = objectUrlsRef.current.splice(0, objectUrlsRef.current.length - 30);
        urlsToRevoke.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            console.warn('Failed to revoke object URL:', url, error);
          }
        });
      }

      // ログの自動削除（100件を超える場合）
      if (processingLogs.length > 100) {
        setProcessingLogs(prev => prev.slice(-50));
      }
    }, 30000); // 30秒間隔

    return () => {
      clearInterval(memoryCleanupInterval);
    };
  }, [processingLogs.length]);

  // 特定の入力ファイルのステータスを更新するヘルパー関数
  const updateInputStatus = useCallback((id: string, newStatus: FileStatus, newMessage?: string, newOutputUrl?: string) => {
    setInputs(prevInputs =>
      prevInputs.map(input => {
        if (input.id === id) {
          const updates: Partial<InFile> = {
            status: newStatus,
            errorMessage: newMessage,
          };

          // 完了時に終了時刻を記録
          if (newStatus === 'completed') {
            updates.endTime = Date.now();
          }

          if (newOutputUrl && newOutputUrl !== input.outputUrl) {
            registerObjectUrl(newOutputUrl);
            updates.outputUrl = newOutputUrl;
            calculateBoundingBox(newOutputUrl).then(bbox => {
              setInputs(prev => prev.map(i => i.id === id ? { ...i, boundingBox: bbox } : i));
            }).catch(err => {
              console.error("Bounding box calculation failed:", err);
            });
            const img = new Image();
            img.onload = () => {
              const w = img.naturalWidth;
              const h = img.naturalHeight;
              setInputs(prev => prev.map(i => i.id === id ? {
                ...i,
                outputLongSide: Math.max(w, h),
                outputWidth: w,
                outputHeight: h,
              } : i));
            };
            img.src = newOutputUrl;
          } else if (newOutputUrl !== undefined) {
            updates.outputUrl = newOutputUrl;
          }

          return { ...input, ...updates };
        }
        return input;
      })
    );
  }, []);

  const getImageDimensions = useCallback(async (blob: Blob): Promise<{ width: number; height: number; mp: number }> => {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(blob);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      return { width, height, mp: (width * height) / 1_000_000 };
    }

    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        URL.revokeObjectURL(objectUrl);
        resolve({ width, height, mp: (width * height) / 1_000_000 });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('画像サイズの取得に失敗しました。'));
      };
      img.src = objectUrl;
    });
  }, []);

  const changeExtension = useCallback((name: string, ext: string) => {
    return name.replace(/\.[^.]+$/, ext);
  }, []);

  const compressForFree = useCallback(async (blob: Blob, name: string) => {
    const dims = await getImageDimensions(blob);
    if (blob.size <= FREE_TARGET_BYTES && dims.mp <= FREE_MAX_MP) {
      return { blob, name, changed: false };
    }
    const useBitmap = 'createImageBitmap' in window;
    let sourceBitmap: ImageBitmap | null = null;
    let sourceImage: HTMLImageElement | null = null;
    if (useBitmap) {
      sourceBitmap = await createImageBitmap(blob);
    } else {
      const objectUrl = URL.createObjectURL(blob);
      sourceImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('画像の読み込みに失敗しました。'));
        };
        img.src = objectUrl;
      });
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      sourceBitmap?.close();
      throw new Error('圧縮の準備に失敗しました。');
    }

    // Freeの入力圧縮は「できるだけ画質を保ちつつサイズを落とす」優先。
    // JPEGよりWebPのほうが同等品質でサイズを稼ぎやすいので、まずWebPを試し、ダメならJPEGへ。
    const preferredMimes: Array<'image/webp' | 'image/jpeg'> = ['image/webp', 'image/jpeg'];
    const qualitySteps = [0.88, 0.8, 0.72];
    // まず12MP付近まで落としてから、最小限の追加縮小のみ行う。
    const initialMpRatio = Math.min(1, Math.sqrt((FREE_MAX_MP * 1.05) / Math.max(dims.mp, 0.1)));
    const scaleSteps = [1, 0.95, 0.88];

    let bestBlob: Blob | null = null;
    let bestExt = '.jpg';
    try {
      for (const scale of scaleSteps) {
        // scale==1 のときは品質調整を優先し、ダメなら徐々に縮小する
        const mergedScale = scale * initialMpRatio;
        const targetWidth = Math.max(1, Math.floor(dims.width * mergedScale));
        const targetHeight = Math.max(1, Math.floor(dims.height * mergedScale));
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        if (sourceBitmap) {
          ctx.drawImage(sourceBitmap, 0, 0, targetWidth, targetHeight);
        } else if (sourceImage) {
          ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
        }

        for (const targetMime of preferredMimes) {
          for (const quality of qualitySteps) {
            const outBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob(resolve, targetMime, quality);
            });
            if (!outBlob) continue;
            if (!bestBlob || outBlob.size < bestBlob.size) {
              bestBlob = outBlob;
              bestExt = targetMime === 'image/webp' ? '.webp' : '.jpg';
            }
            if (outBlob.size <= FREE_TARGET_BYTES) {
              return {
                blob: outBlob,
                name: targetMime === 'image/webp' ? changeExtension(name, '.webp') : changeExtension(name, '.jpg'),
                changed: true,
              };
            }
          }
        }
      }
    } finally {
      sourceBitmap?.close();
    }

    if (!bestBlob) {
      throw new Error('画像の軽量化に失敗しました。');
    }

    // bestBlob の拡張子は最後に試したmimeが分からないため、
    // ここでは安全側として .jpg を付ける（Data/AI入力用途なので拡張子は実害が小さい）。
    // 目標サイズに入って return するケースでは正しい拡張子が付与される。
    return {
      blob: bestBlob,
      name: changeExtension(name, bestExt),
      changed: true,
    };
  }, [changeExtension, getImageDimensions]);

  const goToProPurchase = useCallback((reason: string) => {
    trackAnalyticsEvent('pro_purchase_click', { source: reason });
    trackAnalyticsEvent('pro_high_precision_click', { reason, isPro });
    window.location.href = '/?buyPro=1#pro';
  }, [isPro]);

  // --- プレミアムAI残回数の取得 ---
  const fetchPremiumRemaining = useCallback(async () => {
    if (!isPro) return;
    try {
      const res = await fetch('/api/premium-usage');
      if (res.ok) {
        const data = await res.json();
        if (data.available) setPremiumRemaining(data.remaining);
      }
    } catch { /* ignore */ }
  }, [isPro]);

  useEffect(() => { fetchPremiumRemaining(); }, [fetchPremiumRemaining]);

  // AI背景プリセット
  const aiBgPresets = [
    { key: 'cafe', label: 'カフェ風', prompt: 'cozy cafe interior with warm lighting' },
    { key: 'nature', label: '自然', prompt: 'beautiful natural outdoor scenery with soft sunlight' },
    { key: 'studio', label: 'スタジオ', prompt: 'professional photography studio with clean background' },
    { key: 'office', label: 'オフィス', prompt: 'modern clean office space' },
    { key: 'city', label: '街並み', prompt: 'urban city street scene' },
    { key: 'sky', label: '空', prompt: 'beautiful blue sky with clouds' },
  ];

  // --- 任意背景画像の選択ハンドラ ---
  const handleCustomBgSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isPro) {
      goToProPurchase('custom_bg_upload');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setCustomBgImage(dataUrl);
      setSelectedTemplate(dataUrl); // applyTemplate で使える形にする
      setBgMode('normal');
      setAiBgPreset(null); setAiBgPrompt('');
      trackAnalyticsEvent('bg_custom_image_applied', {});
      setTimeout(() => scrollToSectionWithHeaderOffset(sectionFilesRef.current), 100);
    };
    reader.readAsDataURL(file);
    // input をリセット（同じファイルを再選択できるように）
    e.target.value = '';
  }, [isPro, goToProPurchase, scrollToSectionWithHeaderOffset]);

  // handleAiBgGenerate / handleBlend は handleRemove 内に統合済みのため削除

  const handleSelectProcessingMode = useCallback((nextMode: ProcessingMode) => {
    if (nextMode === 'pro_high_precision' && !isPro) {
      goToProPurchase('pre_mode_selector');
      return;
    }
    setSelectedProcessingMode(nextMode);
    trackAnalyticsEvent('processing_mode_selected', { mode: nextMode, isPro });
    setTimeout(() => scrollToSectionWithHeaderOffset(sectionSizeRef.current), 100);
  }, [goToProPurchase, isPro, scrollToSectionWithHeaderOffset]);

  const createStandardOutputFromDataUrl = useCallback(async (dataUrl: string) => {
    return resizeDataUrlLongSide(dataUrl, 1600);
  }, []);

  const runEnhance = useCallback(async (sourceDataUrl: string, target: EnhanceTarget) => {
    const targetLongSide = toEnhanceLongSide(target);
    const normalized = await normalizeDataUrlLongSide(sourceDataUrl, 1440);
    const scale = pickEsrganScaleForTarget(normalized.longSide, targetLongSide);
    const compressedDataUrl = await compressDataUrlForApi(normalized.dataUrl);

    trackAnalyticsEvent('enhance_started', { target, targetLongSide, scale });
    const startedAt = Date.now();

    const response = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: compressedDataUrl,
        scale,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'くっきり処理に失敗しました。' }));
      trackAnalyticsEvent('enhance_failed', {
        target,
        status: response.status,
        message: errorData?.error ?? 'unknown',
        durationMs: Date.now() - startedAt,
      });
      throw new Error(errorData?.error || 'くっきり処理に失敗しました。');
    }

    const blob = await response.blob();
    const enhancedDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('くっきり画像の読み込みに失敗しました。'));
      reader.readAsDataURL(blob);
    });

    const finalDataUrl = await resizeDataUrlLongSide(enhancedDataUrl, targetLongSide);
    trackAnalyticsEvent('enhance_succeeded', {
      target,
      targetLongSide,
      durationMs: Date.now() - startedAt,
    });
    return finalDataUrl;
  }, []);

  // 画像合成関数
  const applyTemplate = async (
    originalImageUrl: string,
    templateUrl: string,
    ratio: string,
    bbox: { x: number, y: number, width: number, height: number } | undefined
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const originalImg = new Image();
      originalImg.crossOrigin = "anonymous";
      originalImg.onload = () => {
        const baseWidth = 1200;
        let targetWidth = baseWidth;
        let targetHeight = baseWidth;

        if (ratio === 'fit-subject') {
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            targetWidth = bbox.width;
            targetHeight = bbox.height;
          } else {
            // フォールバック
            targetWidth = originalImg.naturalWidth;
            targetHeight = originalImg.naturalHeight;
          }
        } else if (ratio === 'original') {
          targetWidth = originalImg.naturalWidth;
          targetHeight = originalImg.naturalHeight;
        } else if (ratio === '16:9') {
          targetWidth = baseWidth; // 幅は固定
          targetHeight = Math.round(baseWidth * 9 / 16);
        } else if (ratio === '4:3') {
          targetWidth = baseWidth; // 幅は固定
          targetHeight = Math.round(baseWidth * 3 / 4);
        }
        // '1:1' はデフォルトの baseWidth x baseWidth

        // 最終出力の長辺をプラン別でクランプ（巨大PNG化と端末負荷を抑える）
        const outputMaxSide = isPro ? PRO_OUTPUT_MAX_SIDE : FREE_OUTPUT_MAX_SIDE;
        const longestSide = Math.max(targetWidth, targetHeight);
        if (longestSide > outputMaxSide) {
          const scale = outputMaxSide / longestSide;
          targetWidth = Math.max(1, Math.round(targetWidth * scale));
          targetHeight = Math.max(1, Math.round(targetHeight * scale));
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const drawFinalImage = () => {
          if (ratio === 'fit-subject' && bbox && bbox.width > 0) {
            // 被写体のバウンディングボックスを使って元画像から切り出して描画
            ctx.drawImage(
              originalImg,
              bbox.x,
              bbox.y,
              bbox.width,
              bbox.height,
              0,
              0,
              targetWidth,
              targetHeight
            );
          } else {
            // それ以外の比率では、中央に余白をもって描画
            // 「元画像に合わせる」場合はパディングなし
            const padding = ratio === 'original' ? 0 : 100;
            const maxW = targetWidth - padding;
            const maxH = targetHeight - padding;
            const scale = Math.min(maxW / originalImg.width, maxH / originalImg.height);
            const w = originalImg.width * scale;
            const h = originalImg.height * scale;
            const x = (targetWidth - w) / 2;
            const y = (targetHeight - h) / 2;
            ctx.drawImage(originalImg, x, y, w, h);
          }
          resolve(canvas.toDataURL('image/png'));
        };

        // テンプレートが透明か、色か、画像かで処理を分岐
        if (templateUrl === 'transparent') {
          drawFinalImage();
        } else if (templateUrl.startsWith('#')) {
          ctx.fillStyle = templateUrl;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          drawFinalImage();
        } else {
          const templateImg = new Image();
          templateImg.crossOrigin = "anonymous";
          templateImg.onload = () => {
            // テンプレート画像を中央に描画（アスペクト比を維持して全体をカバー）
            const templateAspectRatio = templateImg.width / templateImg.height;
            const canvasAspectRatio = targetWidth / targetHeight;
            let sx, sy, sWidth, sHeight;

            if (templateAspectRatio > canvasAspectRatio) {
              sHeight = templateImg.height;
              sWidth = sHeight * canvasAspectRatio;
              sx = (templateImg.width - sWidth) / 2;
              sy = 0;
            } else {
              sWidth = templateImg.width;
              sHeight = sWidth / canvasAspectRatio;
              sx = 0;
              sy = (templateImg.height - sHeight) / 2;
            }
            ctx.drawImage(templateImg, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
            drawFinalImage();
          };
          templateImg.onerror = () => reject(new Error("Template image loading failed"));
          templateImg.src = templateUrl;
        }
      }
      originalImg.onerror = () => reject(new Error("Original image loading failed"));
      originalImg.src = originalImageUrl;
    });
  };

  // バウンディングボックスを計算する関数
  // NOTE: alpha>0 をそのまま採用すると、半透明ノイズでbboxが画像全体に広がることがある。
  // そのため「alphaしきい値」+「外れ値（ごく少数のピクセル）除外」で安定させる。
  const calculateBoundingBox = async (
    imageUrl: string,
  ): Promise<{ x: number; y: number; width: number; height: number } | undefined> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject('Could not get canvas context');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // しきい値（1〜255）。小さすぎると薄いゴミも拾う。
        const ALPHA_THRESHOLD = 24;

        const rowCounts = new Uint32Array(height);
        const colCounts = new Uint32Array(width);
        let totalSolid = 0;
        let hasTransparent = false;

        for (let y = 0; y < height; y++) {
          const rowOffset = y * width * 4;
          for (let x = 0; x < width; x++) {
            const idx = rowOffset + x * 4;
            const alpha = pixels[idx + 3];
            if (alpha >= ALPHA_THRESHOLD) {
              rowCounts[y]++;
              colCounts[x]++;
              totalSolid++;
            } else {
              hasTransparent = true;
            }
          }
        }

        // 透明が無い（写真そのまま等）の場合は全体
        if (!hasTransparent || totalSolid === 0) {
          resolve({ x: 0, y: 0, width, height });
          return;
        }

        // 外れ値（ごく少数のピクセル）をトリムする
        // 例: 全solidの0.1%未満の“端っこ”は無視（speckle対策）
        const trimSolid = Math.max(1, Math.floor(totalSolid * 0.001));

        const findFromTop = () => {
          let acc = 0;
          for (let y = 0; y < height; y++) {
            acc += rowCounts[y];
            if (acc >= trimSolid) return y;
          }
          return 0;
        };
        const findFromBottom = () => {
          let acc = 0;
          for (let y = height - 1; y >= 0; y--) {
            acc += rowCounts[y];
            if (acc >= trimSolid) return y;
          }
          return height - 1;
        };
        const findFromLeft = () => {
          let acc = 0;
          for (let x = 0; x < width; x++) {
            acc += colCounts[x];
            if (acc >= trimSolid) return x;
          }
          return 0;
        };
        const findFromRight = () => {
          let acc = 0;
          for (let x = width - 1; x >= 0; x--) {
            acc += colCounts[x];
            if (acc >= trimSolid) return x;
          }
          return width - 1;
        };

        let minY = findFromTop();
        let maxY = findFromBottom();
        let minX = findFromLeft();
        let maxX = findFromRight();

        if (minX > maxX || minY > maxY) {
          resolve({ x: 0, y: 0, width, height });
          return;
        }

        // 余白を少し足して切り詰めすぎを防ぐ
        const margin = Math.min(24, Math.max(2, Math.floor(Math.min(width, height) * 0.005)));
        minX = Math.max(0, minX - margin);
        minY = Math.max(0, minY - margin);
        maxX = Math.min(width - 1, maxX + margin);
        maxY = Math.min(height - 1, maxY + margin);

        resolve({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
      };

      img.onerror = (e) => reject('Image loading error for bounding box calculation' + e);
      img.src = imageUrl;
    });
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // 30枚制限チェック
    const MAX_FILES = 30;
    let filesToProcess = Array.from(files);

    if (filesToProcess.length > MAX_FILES) {
      setMsg(`一度に処理できるのは${MAX_FILES}枚までです。最初の${MAX_FILES}枚だけを処理します。`);
      filesToProcess = filesToProcess.slice(0, MAX_FILES);
    }

    // 既存のオブジェクトURLをクリーンアップ
    cleanupObjectUrls();
    // inputs をクリアする前に、各 input の previewUrl と outputUrl も revoke することが望ましいが、
    // cleanupObjectUrls ですべてクリアしているので、ここでは setInputs のみ。

    setInputs([]);
    setMsg(null); setProgress(0); setProcessedCount(0);

    const newInputs: InFile[] = [];
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const id = crypto.randomUUID();
      const isHeic = file.type.includes("heic")
        || /\.(heic|heif)$/i.test(file.name)
        || (file.type === "" && /\.(heic|heif)$/i.test(file.name));

      let previewUrl: string | undefined = undefined;
      if (file.type.startsWith("image/") || isHeic) {
        previewUrl = URL.createObjectURL(file);
        registerObjectUrl(previewUrl);
      }

      newInputs.push({
        id,
        originalFile: file,
        blob: file,
        name: file.name,
        status: isHeic ? "pending" : "ready",
        previewUrl, // 追加
        sourceQualityMode: selectedProcessingMode,
        lastProcessingMode: selectedProcessingMode,
        wasCompressedForFree: false,
        wasEnhanced: false,
      });
    }
    setInputs(newInputs);

    for (const input of newInputs) {
      if (input.status === "pending") {
        updateInputStatus(input.id, "converting");
        try {
          const { default: heic2any } = await import("heic2any");
          const convertedBlob = await heic2any({ blob: input.originalFile, toType: "image/jpeg" });
          const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          const newName = input.originalFile.name.replace(/\.[^.]+$/, ".jpg");

          // HEIC変換後の新しいプレビューURLを生成
          const newPreviewUrl = URL.createObjectURL(finalBlob);
          registerObjectUrl(newPreviewUrl);

          setInputs(prev => prev.map(i => i.id === input.id ? {
            ...i,
            blob: finalBlob,
            name: newName,
            status: "ready",
            previewUrl: newPreviewUrl // HEIC変換後のプレビューURLに更新
          } : i));
        } catch (err: unknown) {
          console.error("HEIC 変換エラー:", err, input.name);
          let errMsg = "HEIC 変換エラー";
          if (typeof err === 'object' && err !== null && 'code' in err && err.code === 1) {
            errMsg = "HEIC形式ではないか、サポートされていない形式です。";
          }
          const detailMsg = typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? `: ${err.message}` : '';
          updateInputStatus(input.id, "error", `${input.name}: ${errMsg}${detailMsg}`);
        }
      }
    }
  }, [updateInputStatus, cleanupObjectUrls, selectedProcessingMode]); // cleanupObjectUrls を依存配列に追加

  /* ------------ ① ファイル選択（複数 OK） --------------- */
  // handleFileSelect: UploadArea用（単一ファイル向け、後方互換性のため残す）
  const handleFileSelect = async (file: File) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    await processFiles(dataTransfer.files);
  };

  // handleFilesSelect: UploadArea用（複数ファイル向け）
  const handleFilesSelect = async (files: FileList) => {
    await processFiles(files);
  };

  /* ------------ ② 背景除去：API経由で並行実行 --------------- */
  const handleRemove = async (forceFreeCompress = false) => {
    const candidates = inputs.filter(input => input.status === "ready" || input.status === "error");
    if (busy || candidates.length === 0) {
      if (candidates.length === 0 && inputs.length > 0) {
        setMsg("処理できるファイルがありません。写真の準備が終わっているかご確認ください。");
      }
      return;
    }

    if (!isPro && !forceFreeCompress) {
      const oversizedWithReasons = (
        await Promise.all(
          candidates.map(async (file): Promise<OversizedPromptItem | null> => {
            const issues: string[] = [];

            if (file.blob.size > MAX_UPLOAD_BYTES) {
              const sizeMb = (file.blob.size / 1024 / 1024).toFixed(1);
              issues.push(`データが大きい（${sizeMb}MB → 無料は${MAX_UPLOAD_MB}MBまで）`);
            }

            const meta = await getImageDimensions(file.blob).catch(() => null);
            if (meta && meta.mp > FREE_MAX_MP) {
              issues.push(`画質がとても高い（${meta.width}×${meta.height}px）`);
            }

            if (issues.length === 0) return null;
            return { id: file.id, name: file.name, issues };
          }),
        )
      ).filter((item): item is OversizedPromptItem => item !== null);

      if (oversizedWithReasons.length > 0) {
        console.info('[upload_too_large]', { count: oversizedWithReasons.length, files: oversizedWithReasons.map((i) => i.name) });
        setOversizedPromptItems(oversizedWithReasons);
        setMsg('大きな写真があります。処理方法を選んでください。');
        return;
      }
    }

    setOversizedPromptItems([]);
    cancelRequestedRef.current = false;
    const filesToProcess = candidates;

    // --- AI処理モードの事前チェック ---
    const useAiApi = bgMode === 'ai_generate' || (bgMode === 'normal' && blendEnabled && selectedTemplate);
    if (useAiApi) {
      if (!isPro) {
        goToProPurchase('ai_bg_processing');
        return;
      }
      // 残回数チェック
      const needed = filesToProcess.length;
      if (premiumRemaining !== null && premiumRemaining < needed) {
        setAiBgError(`AI機能の残回数が足りません（必要: ${needed}回、残り: ${premiumRemaining}回）。来月にリセットされます。`);
        return;
      }
    }

    // blendモード用: 参照背景画像をData URLに変換（全ファイル共通なので事前に1回だけ変換）
    let blendRefImageDataUrl: string | undefined;
    let blendRefImageUrl: string | undefined; // Vercel 4.5MB制限回避のため、大きい場合はBlobにアップロード
    if (bgMode === 'normal' && blendEnabled && selectedTemplate) {
      try {
        if (selectedTemplate.startsWith('#')) {
          const canvas = document.createElement('canvas');
          canvas.width = 512; canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.fillStyle = selectedTemplate; ctx.fillRect(0, 0, 512, 512); }
          blendRefImageDataUrl = canvas.toDataURL('image/png');
        } else if (selectedTemplate.startsWith('data:')) {
          blendRefImageDataUrl = selectedTemplate;
        } else {
          blendRefImageDataUrl = await urlToDataUrl(selectedTemplate);
        }
        // 大きい参照画像はBlobにアップロード（4.5MB制限回避）
        if (blendRefImageDataUrl && !selectedTemplate.startsWith('#')) {
          const res = await fetch(blendRefImageDataUrl);
          const refBlob = await res.blob();
          const refFile = new File([refBlob], 'ref.png', { type: refBlob.type || 'image/png' });
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = blendRefImageDataUrl!;
          });
          const refResult = await uploadToBlob(refFile.name, refFile, {
            access: 'public',
            handleUploadUrl: '/api/upload/blob',
            clientPayload: JSON.stringify({
              sizeBytes: refFile.size,
              mimeType: refFile.type,
              width: img.naturalWidth,
              height: img.naturalHeight,
            }),
          });
          blendRefImageUrl = refResult.url;
        }
      } catch {
        setAiBgError('背景画像の読み込みに失敗しました。');
        return;
      }
    }

    // AI背景生成用のプロンプトを事前構築
    let aiPrompt = '';
    if (bgMode === 'ai_generate') {
      const presetPrompt = aiBgPresets.find(p => p.key === aiBgPreset)?.prompt || '';
      aiPrompt = [presetPrompt, aiBgPrompt].filter(Boolean).join(', ');
      if (!aiPrompt) {
        setAiBgError('背景のスタイルを選ぶか、イメージを入力してください。');
        return;
      }
    }

    // 大量ファイル処理時の自動調整
    if (filesToProcess.length > 20 && adaptiveConcurrency) {
      setMaxConcurrentProcesses(Math.min(3, maxConcurrentProcesses)); // 大量処理時は保守的に開始
      setMsg("ファイルが多いため、処理速度を自動で調整しています。");
    }

    setBusy(true);
    setMsg(null);
    setAiBgError(null);
    setProgress(0);
    setProcessedCount(0);

    // 処理開始ログ
    if (debugMode) {
      addLog({
        id: 'batch',
        fileName: `BATCH_START`,
        event: 'start',
        details: `${filesToProcess.length}件のバッチ処理開始`
      });
    }

    // 個別ファイルの処理を行う関数
    const processSingleFile = async (input: InFile, index: number): Promise<void> => {
      // 並行スロットを取得（キューで待機）
      await acquireSlot();

      // 処理開始時刻と順序を記録
      const startTime = Date.now();
      const requestStartTime = Date.now(); // API レスポンス時間測定用
      setInputs(prev => prev.map(i =>
        i.id === input.id
          ? { ...i, startTime, processingOrder: index }
          : i
      ));

      // ログ記録：処理開始
      addLog({
        id: input.id,
        fileName: input.name,
        event: 'start',
        details: `ファイルサイズ: ${(input.blob.size / 1024).toFixed(1)}KB`
      });

      // 処理中カウントを増加
      setCurrentlyProcessing(prev => {
        const newCount = prev + 1;
        // ピーク並行数を更新
        setPerformanceStats(stats => ({
          ...stats,
          peakConcurrency: Math.max(stats.peakConcurrency, newCount)
        }));
        return newCount;
      });

      // タイムアウト設定（5分）
      const timeoutMs = 5 * 60 * 1000;
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => {
        timeoutController.abort('Processing timeout');
      }, timeoutMs);

      try {
        // エラー状態の場合はリセット
        if (input.status === 'error') {
          updateInputStatus(input.id, 'ready', undefined);
        }

        updateInputStatus(input.id, "uploading");
        let blobForRequest: Blob = input.blob;
        let nameForRequest = input.name;
        let wasCompressedForFree = false;
        const requestedProcessingMode: ProcessingMode = isPro
          ? selectedProcessingMode
          : 'standard';
        const imageMeta = await getImageDimensions(blobForRequest);

        if (!isPro) {
          if (blobForRequest.size > MAX_UPLOAD_BYTES || imageMeta.mp > FREE_MAX_MP) {
            const compressed = await compressForFree(blobForRequest, nameForRequest);
            blobForRequest = compressed.blob;
            nameForRequest = compressed.name;
            wasCompressedForFree = compressed.changed;
          }
          if (blobForRequest.size > MAX_UPLOAD_BYTES) {
            throw new Error(`無料プランの送信上限 ${MAX_UPLOAD_MB}MB を超えています。別の画像でお試しください。`);
          }
        } else {
          if (blobForRequest.size > PRO_MAX_UPLOAD_BYTES) {
            throw new Error(`Proプランでも処理できるサイズを超えています（最大${Math.round(PRO_MAX_UPLOAD_BYTES / 1024 / 1024)}MBまで）。`);
          }
          if (imageMeta.mp > PRO_MAX_MP || imageMeta.width > PRO_MAX_SIDE || imageMeta.height > PRO_MAX_SIDE) {
            throw new Error('この写真は大きすぎるため、Proプランでも処理できません。もう少し小さい写真をお試しください。');
          }
        }

        // ログ記録：API リクエスト開始
        addLog({
          id: input.id,
          fileName: input.name,
          event: 'api_request',
          details: `並行スロット: ${processingSlots.current}/${maxConcurrentProcesses}`
        });

        // AbortControllerを組み合わせる（コンポーネントのアンマウントとタイムアウト）
        // AbortSignal.any() は新しいブラウザでのみサポートされているため、手動で実装
        let combinedSignal: AbortSignal;
        if (abortControllerRef.current?.signal) {
          // 複数のAbortSignalを手動で組み合わせる
          const combinedController = new AbortController();
          combinedSignal = combinedController.signal;

          // 既存のAbortControllerがabortされた場合
          if (abortControllerRef.current.signal.aborted) {
            combinedController.abort(abortControllerRef.current.signal.reason);
          } else {
            abortControllerRef.current.signal.addEventListener('abort', () => {
              combinedController.abort(abortControllerRef.current?.signal.reason);
            }, { once: true });
          }

          // タイムアウトコントローラーがabortされた場合
          if (timeoutController.signal.aborted) {
            combinedController.abort(timeoutController.signal.reason);
          } else {
            timeoutController.signal.addEventListener('abort', () => {
              combinedController.abort(timeoutController.signal.reason);
            }, { once: true });
          }
        } else {
          // abortControllerRef.currentがない場合はタイムアウトのみ
          combinedSignal = timeoutController.signal;
        }

        let response: Response;
        if (useAiApi) {
          // --- AI処理パス: bria/generate-background のみで処理 ---
          // Vercel 4.5MB制限回避のため、BlobにアップロードしてURLを送る
          updateInputStatus(input.id, "processing");
          const uploadFile = blobForRequest instanceof File
            ? blobForRequest
            : new File([blobForRequest], nameForRequest, { type: blobForRequest.type || 'application/octet-stream' });
          const blobResult = await uploadToBlob(uploadFile.name, uploadFile, {
            access: 'public',
            handleUploadUrl: '/api/upload/blob',
            clientPayload: JSON.stringify({
              sizeBytes: uploadFile.size,
              mimeType: uploadFile.type,
              width: imageMeta.width,
              height: imageMeta.height,
            }),
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const aiBody: Record<string, any> = { imageUrl: blobResult.url };
          if (bgMode === 'ai_generate') {
            aiBody.mode = 'generate';
            aiBody.prompt = aiPrompt;
          } else if (blendRefImageUrl || blendRefImageDataUrl) {
            aiBody.mode = 'blend';
            if (blendRefImageUrl) {
              aiBody.refImageUrl = blendRefImageUrl;
            } else {
              aiBody.refImageDataUrl = blendRefImageDataUrl;
            }
          }

          response = await fetch('/api/ai/generate-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aiBody),
            signal: combinedSignal,
          });
        } else if (isPro && USE_DIRECT_UPLOAD_FOR_PRO) {
          const uploadFile = blobForRequest instanceof File
            ? blobForRequest
            : new File([blobForRequest], nameForRequest, { type: blobForRequest.type || 'application/octet-stream' });
          const blobResult = await uploadToBlob(uploadFile.name, uploadFile, {
            access: 'public',
            handleUploadUrl: '/api/upload/blob',
            clientPayload: JSON.stringify({
              sizeBytes: uploadFile.size,
              mimeType: uploadFile.type,
              width: imageMeta.width,
              height: imageMeta.height,
            }),
          });

          response = await fetch("/api/remove-bg", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: blobResult.url,
              sourceBlobUrl: blobResult.url,
              processingMode: requestedProcessingMode,
            }),
            signal: combinedSignal,
          });
        } else {
          const formData = new FormData();
          formData.append("file", blobForRequest, nameForRequest);
          formData.append("processingMode", requestedProcessingMode);
          response = await fetch("/api/remove-bg", {
            method: "POST",
            body: formData,
            signal: combinedSignal,
          });
        }

        // レスポンス時間を測定
        const responseTime = Date.now() - requestStartTime;
        const success = response.ok;

        // ログ記録：API レスポンス
        addLog({
          id: input.id,
          fileName: input.name,
          event: 'api_response',
          responseTime,
          details: success ? `成功 (${response.status})` : `エラー (${response.status})`
        });

        // 動的並行数調整
        adjustConcurrency(responseTime, success);

        // レスポンスチェック
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "不明なサーバーエラー" }));
          const errorLabel = useAiApi ? 'AI背景エラー' : '背景除去エラー';
          const errorMessage = `${errorLabel}: ${errorData.error || response.statusText}`;

          // ログ記録：エラー
          addLog({
            id: input.id,
            fileName: input.name,
            event: 'error',
            details: errorMessage,
            responseTime
          });

          updateInputStatus(input.id, "error", errorMessage);
          setMsg(prevMsg => prevMsg ? `${prevMsg}\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);

          // エラー統計更新
          setPerformanceStats(stats => ({
            ...stats,
            totalErrors: stats.totalErrors + 1
          }));

          return;
        }

        // AI API成功時: 残回数を更新
        if (useAiApi) {
          const remaining = response.headers.get('x-premium-remaining');
          if (remaining !== null) setPremiumRemaining(Number(remaining));
          trackAnalyticsEvent('premium_ai_consumed', {
            feature: bgMode === 'ai_generate' ? 'bg_generate' : 'bg_blend',
          });
        }

        updateInputStatus(input.id, "processing");
        const imageBlob = await response.blob();
        const appliedProcessingMode = useAiApi ? 'pro_high_precision' : ((response.headers.get('x-processing-mode') as ProcessingMode | null) ?? requestedProcessingMode);

        // ログ記録：後処理開始
        addLog({
          id: input.id,
          fileName: input.name,
          event: 'processing',
          details: `処理後サイズ: ${(imageBlob.size / 1024).toFixed(1)}KB`
        });

        // メモリ効率のためのサイズチェック
        if (imageBlob.size > 50 * 1024 * 1024) { // 50MB制限
          throw new Error(`仕上がりのデータが大きすぎるため保存できませんでした（${Math.round(imageBlob.size / 1024 / 1024)}MB）`);
        }

        // BlobをData URLに変換し、必要であればテンプレートを適用
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();

          // FileReader のタイムアウト設定
          const readerTimeoutId = setTimeout(() => {
            reader.abort();
            reject(new Error('画像読み込みタイムアウト'));
          }, 30000); // 30秒

          reader.onloadend = async () => {
            clearTimeout(readerTimeoutId);
            try {
              const removedBgUrl = reader.result as string;

              let finalUrl = removedBgUrl;

              if (useAiApi) {
                // AI処理時: 既に完成画像なのでテンプレート適用不要
                // removedBgUrl をそのまま finalUrl として使う
              } else {
                // 通常処理: 背景除去後の画像からバウンディングボックスを計算してテンプレ適用
                const subjectBbox = await Promise.race([
                  calculateBoundingBox(removedBgUrl),
                  new Promise<undefined>((_, reject) =>
                    setTimeout(() => reject(new Error('バウンディングボックス計算タイムアウト')), 15000)
                  )
                ]);

                // アスペクト比がデフォルトでない場合、またはテンプレートが選択されている場合は常に画像処理を行う
                if (selectedRatio !== '1:1' || selectedTemplate) {
                  const templateUrl = selectedTemplate ?? 'transparent';
                  // 計算したバウンディングボックスをテンプレート適用関数に渡す
                  finalUrl = await Promise.race([
                    applyTemplate(removedBgUrl, templateUrl, selectedRatio, subjectBbox),
                    new Promise<string>((_, reject) =>
                      setTimeout(() => reject(new Error('テンプレート適用タイムアウト')), 30000)
                    )
                  ]);
                }
              }

              updateInputStatus(input.id, "completed", undefined, finalUrl);
              setInputs(prev => prev.map(i => {
                if (i.id !== input.id) return i;
                const next = { ...i } as InFile;
                next.sourceQualityMode = selectedProcessingMode;
                next.lastProcessingMode = appliedProcessingMode;
                next.wasCompressedForFree = wasCompressedForFree;
                next.highQualityOutputUrl = finalUrl;
                next.wasEnhanced = false;
                if (isPro) {
                  void createStandardOutputFromDataUrl(finalUrl).then((standardUrl) => {
                    setInputs(current => current.map(item => item.id === input.id ? {
                      ...item,
                      standardOutputUrl: standardUrl,
                    } : item));
                  }).catch(() => {
                    // fallback to same data
                    setInputs(current => current.map(item => item.id === input.id ? {
                      ...item,
                      standardOutputUrl: finalUrl,
                    } : item));
                  });
                  next.standardOutputUrl = finalUrl;
                } else {
                  next.standardOutputUrl = finalUrl;
                }
                return next;
              }));

              // 処理時間を計算
              const totalDuration = Date.now() - startTime;

              // ログ記録：完了
              addLog({
                id: input.id,
                fileName: input.name,
                event: 'completed',
                duration: totalDuration,
                responseTime
              });

              // パフォーマンス統計更新
              setPerformanceStats(stats => ({
                ...stats,
                totalProcessed: stats.totalProcessed + 1,
                totalTime: stats.totalTime + totalDuration,
                avgFileSize: (stats.avgFileSize * stats.totalProcessed + blobForRequest.size) / (stats.totalProcessed + 1)
              }));

              // 完了カウントと進捗を更新
              setProcessedCount(prev => {
                const newCount = prev + 1;
                const newProgress = Math.round((newCount / filesToProcess.length) * 100);
                setProgress(newProgress);
                return newCount;
              });

              resolve();
            } catch (e) {
              clearTimeout(readerTimeoutId);
              console.error("Template application failed", e);
              const errorMessage = e instanceof Error ? e.message : "不明なエラー";

              // ログ記録：エラー
              addLog({
                id: input.id,
                fileName: input.name,
                event: 'error',
                details: `処理エラー: ${errorMessage}`,
                duration: Date.now() - startTime
              });

              updateInputStatus(input.id, "error", `処理エラー: ${errorMessage}`);
              setMsg(prev => prev ? `${prev}\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);

              // エラー統計更新
              setPerformanceStats(stats => ({
                ...stats,
                totalErrors: stats.totalErrors + 1
              }));

              // エラーでも並行数調整を行う
              adjustConcurrency(responseTime, false);
              reject(e);
            }
          };

          reader.onerror = (e) => {
            clearTimeout(readerTimeoutId);
            console.error("Blob to Data URL conversion failed", e);

            // ログ記録：エラー
            addLog({
              id: input.id,
              fileName: input.name,
              event: 'error',
              details: 'Blob読み込みエラー',
              duration: Date.now() - startTime
            });

            updateInputStatus(input.id, "error", `処理済み画像の読み込みエラー: ${input.name}`);
            setMsg(prevMsg => prevMsg ? `${prevMsg}\n${input.name}: 処理済み画像の読み込みに失敗しました。` : `${input.name}: 処理済み画像の読み込みに失敗しました。`);

            setPerformanceStats(stats => ({
              ...stats,
              totalErrors: stats.totalErrors + 1
            }));

            adjustConcurrency(responseTime, false);
            reject(e);
          };

          reader.onabort = () => {
            clearTimeout(readerTimeoutId);
            reject(new Error('読み込み中断'));
          };

          reader.readAsDataURL(imageBlob);
        });

      } catch (error: unknown) {
        console.error("ファイル処理エラー:", error, input.name);
        const isCancelled =
          cancelRequestedRef.current ||
          (abortControllerRef.current?.signal.aborted ?? false) ||
          (error instanceof Error && (
            error.name === 'AbortError' ||
            /cancel|aborted|abort|中断/i.test(error.message)
          )) ||
          (typeof error === 'string' && /cancel|aborted|abort|中断/i.test(error));

        let errorMessage = "不明なエラー";
        if (isCancelled) {
          errorMessage = "処理がキャンセルされました";
        } else if (error instanceof Error) {
          if (error.message.includes('timeout') || error.message.includes('タイムアウト')) {
            errorMessage = "処理タイムアウト";
          } else {
            errorMessage = error.message;
          }
        }

        // ログ記録：エラー（キャンセル時は ready に戻すため別扱い）
        addLog({
          id: input.id,
          fileName: input.name,
          event: 'error',
          details: errorMessage,
          duration: Date.now() - startTime
        });

        if (isCancelled) {
          updateInputStatus(input.id, "ready", undefined);
          return;
        } else {
          updateInputStatus(input.id, "error", errorMessage);
          setMsg(prevMsg => prevMsg ? `${prevMsg}\n${input.name}: ${errorMessage}` : `${input.name}: ${errorMessage}`);
        }

        // エラー時は進捗を更新
        setProcessedCount(prev => {
          const newCount = prev + 1;
          const newProgress = Math.round((newCount / filesToProcess.length) * 100);
          setProgress(newProgress);
          return newCount;
        });

        // エラー統計更新
        setPerformanceStats(stats => ({
          ...stats,
          totalErrors: stats.totalErrors + 1
        }));

        // エラー時の並行数調整
        const responseTime = Date.now() - requestStartTime;
        adjustConcurrency(responseTime, false);
      } finally {
        clearTimeout(timeoutId);
        // 処理中カウントを減少
        setCurrentlyProcessing(prev => Math.max(0, prev - 1));
        // 並行スロットを解放
        releaseSlot();
      }
    };

    try {
      // AbortControllerを初期化
      abortControllerRef.current = new AbortController();

      // 全てのファイルを並行処理で開始
      const processPromises = filesToProcess.map((input, index) => processSingleFile(input, index));

      // 全ての処理の完了を待機（エラーがあっても他の処理は続行）
      const results = await Promise.allSettled(processPromises);

      // 結果の集計
      const fulfilled = results.filter(result => result.status === 'fulfilled').length;
      const rejected = results.filter(result => result.status === 'rejected').length;

      console.log(`並行処理完了: 成功=${fulfilled}件, エラー=${rejected}件`);

      // バッチ処理完了ログ
      if (debugMode) {
        addLog({
          id: 'batch',
          fileName: `BATCH_END`,
          event: 'completed',
          details: `バッチ処理完了: 成功=${fulfilled}件, エラー=${rejected}件`
        });
      }

    } catch (err: unknown) {
      console.error("全体的な処理エラー:", err);
      const generalErrorMessage = typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
        ? err.message : "背景除去中に予期せぬエラーが発生しました。詳細不明。";
      setMsg(generalErrorMessage);

      if (debugMode) {
        addLog({
          id: 'batch',
          fileName: `BATCH_ERROR`,
          event: 'error',
          details: generalErrorMessage
        });
      }
    } finally {
      setBusy(false);

      // 透過完了後に選択されたファイルへスクロール
      setTimeout(() => scrollToSectionWithHeaderOffset(sectionFilesRef.current), 200);

      // 少し待ってから状態を確認（React の状態更新が完了するまで）
      setTimeout(() => {
        setInputs(currentInputs => {
          if (cancelRequestedRef.current) {
            return currentInputs;
          }
          const totalProcessed = filesToProcess.length;
          const actualCompletedCount = currentInputs.filter(input => input.status === "completed").length;
          const actualErrorCount = currentInputs.filter(input => input.status === "error").length;
          const anyErrors = actualErrorCount > 0;

          if (totalProcessed > 0) {
            if (anyErrors && actualCompletedCount > 0) {
              // 一部成功、一部エラー
              setMsg(`処理が終わりました：${actualCompletedCount}枚 成功、${actualErrorCount}枚 失敗。各ファイルの状態をご確認ください。`);
            } else if (anyErrors && actualCompletedCount === 0) {
              // 全てエラー
              setMsg("すべてのファイルで問題が発生しました。各ファイルの状態をご確認ください。");
            } else if (actualCompletedCount === totalProcessed) {
              // 全て成功
              setMsg(`すべてのファイル（${actualCompletedCount}枚）の処理が完了しました！`);
            } else {
              // 処理中や準備完了状態のファイルがある場合
              const processingCount = currentInputs.filter(input =>
                input.status === "processing" || input.status === "uploading"
              ).length;
              if (processingCount > 0) {
                setMsg(`${actualCompletedCount}枚 完了、あと${processingCount}枚 処理中です。`);
              } else {
                setMsg(`${actualCompletedCount}枚の処理が完了しました。残りの状態をご確認ください。`);
              }
            }
          } else if (currentInputs.length > 0 && totalProcessed === 0) {
            setMsg("処理できるファイルがありません。");
          }

          return currentInputs; // 状態は変更せず、メッセージのみ更新
        });
      }, 100);
    }
  };

  const handleRemakeWithOriginal = async (input: InFile, reason: 'result_remake' | 'edge_cleanup') => {
    if (!isPro) {
      goToProPurchase(reason);
      return;
    }

    setEnhancingFileId(input.id);
    setMsg(null);
    updateInputStatus(input.id, 'processing', undefined);

    try {
      const imageMeta = await getImageDimensions(input.originalFile);
      const processingMode: ProcessingMode = reason === 'edge_cleanup' ? 'pro_high_precision' : selectedProcessingMode;
      let response: Response;

      if (USE_DIRECT_UPLOAD_FOR_PRO) {
        const uploadFile = input.originalFile;
        const blobResult = await uploadToBlob(uploadFile.name, uploadFile, {
          access: 'public',
          handleUploadUrl: '/api/upload/blob',
          clientPayload: JSON.stringify({
            sizeBytes: uploadFile.size,
            mimeType: uploadFile.type,
            width: imageMeta.width,
            height: imageMeta.height,
          }),
        });

        response = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: blobResult.url,
            sourceBlobUrl: blobResult.url,
            processingMode,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', input.originalFile, input.name);
        formData.append('processingMode', processingMode);
        response = await fetch('/api/remove-bg', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '作り直しに失敗しました。' }));
        throw new Error(errorData.error || '作り直しに失敗しました。');
      }

      const imageBlob = await response.blob();
      const remadeDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
        reader.readAsDataURL(imageBlob);
      });

      updateInputStatus(input.id, 'completed', undefined, remadeDataUrl);
      trackAnalyticsEvent('post_upgrade_remake_succeeded', {
        reason,
        mode: processingMode,
      });

      const standardUrl = await createStandardOutputFromDataUrl(remadeDataUrl).catch(() => remadeDataUrl);
      setInputs(prev => prev.map(item => item.id === input.id ? {
        ...item,
        sourceQualityMode: selectedProcessingMode,
        lastProcessingMode: processingMode,
        wasCompressedForFree: false,
        highQualityOutputUrl: remadeDataUrl,
        standardOutputUrl: standardUrl,
        wasEnhanced: false,
      } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : '作り直しに失敗しました。';
      setMsg(message);
      updateInputStatus(input.id, 'error', message);
    } finally {
      setEnhancingFileId(null);
    }
  };

  const handleEnhanceForFile = async (input: InFile, target: EnhanceTarget) => {
    if (!isPro) {
      goToProPurchase('result_enhance');
      return;
    }

    setEnhancingFileId(input.id);
    setMsg(null);

    try {
      trackAnalyticsEvent('enhance_target_selected', { target });
      const sourceDataUrl = input.highQualityOutputUrl || input.outputUrl;
      if (!sourceDataUrl) {
        throw new Error('くっきり処理する画像が見つかりません。');
      }
      const enhancedDataUrl = await runEnhance(sourceDataUrl, target);
      updateInputStatus(input.id, 'completed', undefined, enhancedDataUrl);
      const standardUrl = await createStandardOutputFromDataUrl(enhancedDataUrl).catch(() => enhancedDataUrl);
      setInputs(prev => prev.map(item => item.id === input.id ? {
        ...item,
        highQualityOutputUrl: enhancedDataUrl,
        standardOutputUrl: standardUrl,
        wasEnhanced: true,
      } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'くっきり処理に失敗しました。';
      setMsg(message);
    } finally {
      setEnhancingFileId(null);
    }
  };

  const handleBatchEnhance = async (target: EnhanceTarget) => {
    if (!isPro) {
      goToProPurchase('result_batch_enhance');
      return;
    }

    const targetPx = toEnhanceLongSide(target);
    const completedFiles = inputs.filter(
      (input) => input.status === 'completed'
        && (input.highQualityOutputUrl || input.outputUrl)
        && (input.outputLongSide ?? 0) < targetPx
    );
    if (completedFiles.length === 0) {
      setMsg('対象サイズ未満の画像がありません。すべて既にそのサイズ以上です。');
      return;
    }

    setPendingBatchTarget(null);
    setBatchEnhanceState({
      inProgress: true,
      target,
      completed: 0,
      total: completedFiles.length,
    });
    setMsg(`${completedFiles.length}枚を${target.toUpperCase()}へ高画質化しています...`);

    let successCount = 0;
    let failureCount = 0;
    for (const input of completedFiles) {
      setEnhancingFileId(input.id);
      try {
        const sourceDataUrl = input.highQualityOutputUrl || input.outputUrl;
        if (!sourceDataUrl) {
          throw new Error('くっきり処理する画像が見つかりません。');
        }
        const enhancedDataUrl = await runEnhance(sourceDataUrl, target);
        updateInputStatus(input.id, 'completed', undefined, enhancedDataUrl);
        const standardUrl = await createStandardOutputFromDataUrl(enhancedDataUrl).catch(() => enhancedDataUrl);
        setInputs(prev => prev.map(item => item.id === input.id ? {
          ...item,
          highQualityOutputUrl: enhancedDataUrl,
          standardOutputUrl: standardUrl,
          wasEnhanced: true,
        } : item));
        successCount += 1;
      } catch (error) {
        failureCount += 1;
        console.error('一括高画質化失敗:', input.name, error);
      } finally {
        setBatchEnhanceState(prev => ({
          ...prev,
          completed: Math.min(prev.total, prev.completed + 1),
        }));
      }
    }

    setEnhancingFileId(null);
    setBatchEnhanceState({
      inProgress: false,
      target: null,
      completed: 0,
      total: 0,
    });
    setMsg(
      failureCount === 0
        ? `${successCount}枚の高画質化が完了しました。`
        : `${successCount}枚完了、${failureCount}枚失敗しました。`
    );
  };

  /* ------------ ③ 全てダウンロード --------------- */
  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const completedFiles = inputs.filter(input => input.status === 'completed' && input.outputUrl);

    if (completedFiles.length === 0) {
      setMsg("ダウンロードできるファイルがまだありません。");
      return;
    }

    setMsg("ZIPファイルを準備中です...");
    setBusy(true);

    try {
      for (const input of completedFiles) {
        if (input.outputUrl) {
          // Data URLからBlobを生成
          const response = await fetch(input.outputUrl);
          const blob = await response.blob();
          // オリジナルのファイル名から拡張子を取り、.pngを付与
          const fileName = `processed_${input.name.replace(/\.[^.]+$/, ".png")}`;
          zip.file(fileName, blob);
        }
      }

      zip.generateAsync({ type: "blob" })
        .then(content => {
          saveAs(content, "processed_images.zip");
          setMsg("ZIPファイルのダウンロードが開始されました。");
        })
        .catch(err => {
          console.error("ZIP生成エラー:", err);
          setMsg(`ZIPファイルの生成に失敗しました: ${err.message}`);
        });

    } catch (err) {
      console.error("一括ダウンロード処理エラー:", err);
      const errorMessage = err instanceof Error ? err.message : "不明なエラー";
      setMsg(`エラーが発生しました: ${errorMessage}`);
    } finally {
      setBusy(false);
    }
  };

  /* ------------ UI --------------- */
  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-xl">
      {oversizedPromptItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOversizedPromptItems([])} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900">{oversizedPromptItems.length}枚の写真がそのままでは処理できません</h3>
            <p className="text-sm text-gray-600 mt-2">
              以下の写真は無料プランの上限より大きいため、処理方法を選んでください。
            </p>
            <ul className="mt-3 max-h-44 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
              {oversizedPromptItems.map((item) => (
                <li key={item.id} className="text-xs text-gray-700 leading-relaxed">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  {item.issues.map((issue) => (
                    <p key={issue}>- {issue}</p>
                  ))}
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-colors shadow-sm"
                onClick={() => {
                  console.info('[pro_original_chosen]', { count: oversizedPromptItems.length });
                  setOversizedPromptItems([]);
                  setMsg(null);
                  goToProPurchase('oversized_modal');
                }}
              >
                そのままキレイに処理する（Pro）
              </button>
              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl font-semibold border border-gray-300 text-gray-800 hover:bg-gray-50"
                  onClick={() => {
                    console.info('[free_compress_chosen]', { count: oversizedPromptItems.length });
                    setOversizedPromptItems([]);
                    void handleRemove(true);
                  }}
                >
                  自動で軽くして無料で処理する
                </button>
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  写真を自動で軽くするため、仕上がりが少し粗くなることがあります。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="flex items-center justify-center my-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-4 border-blue-500 border-opacity-60"></div>
          <span className="ml-3 text-base font-medium text-blue-700">処理中...</span>
        </div>
      )}
      {/* ファイル入力エリア (ドラッグ＆ドロップ対応) */}
      <UploadArea
        onFileSelect={handleFileSelect}
        onFilesSelect={handleFilesSelect}
        multiple={true}
        accept="image/*,.heic,.heif"
        label="クリックまたはドラッグ＆ドロップでファイルを選択"
        description="背景を切り抜きたい画像 (JPG, PNG, HEIC等) を選択してください"
        shadow="shadow-2xl"
        disabled={busy}
      />

      {/* 処理モード選択 */}
      <div ref={sectionModeRef} className="space-y-2">
        <h3 className="text-base font-semibold text-gray-800">仕上がりモード</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSelectProcessingMode('standard')}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${selectedProcessingMode === 'standard'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
              }`}
          >
            <p className="font-semibold text-gray-900">標準</p>
            <p className="text-xs text-gray-600 mt-1">AIが自動で背景を切り抜きます</p>
          </button>
          <button
            type="button"
            onClick={() => handleSelectProcessingMode('pro_high_precision')}
            className={`rounded-xl border px-4 py-3 text-left transition-colors relative ${selectedProcessingMode === 'pro_high_precision'
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-200 hover:border-amber-400'
              } ${!isPro ? 'opacity-80' : ''}`}
          >
            <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Pro
            </span>
            <p className="font-semibold text-gray-900">高精度（Pro）</p>
            <p className="text-xs text-gray-600 mt-1">より高性能なAIで背景を切り抜きます</p>
            {!isPro && (
              <p className="text-[11px] text-amber-700 mt-2">Proで選べます</p>
            )}
          </button>
        </div>
      </div>

      {/* ファイル数制限の案内 */}
      <div className="flex items-center justify-center">
        <div className={`text-sm px-4 py-2 rounded-lg border ${inputs.length >= 30 ? 'text-red-600 bg-red-50 border-red-200' :
          inputs.length >= 25 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
            inputs.length > 0 ? 'text-blue-600 bg-blue-50 border-blue-200' :
              'text-gray-500 bg-gray-50 border-gray-200'
          }`}>
          {inputs.length > 0 ?
            `${inputs.length}/30枚選択中` :
            '最大30枚まで同時処理可能です'
          }
        </div>
      </div>

      {/* アスペクト比選択エリア */}
      {inputs.length > 0 && (
        <div ref={sectionSizeRef} className="space-y-3 pt-4">
          <h3 className="text-base font-semibold text-gray-800">仕上がりのサイズ</h3>
          <div className="flex flex-wrap gap-3">
            {aspectRatios.map(ratio => (
              <RatioButton
                key={ratio.key}
                label={ratio.label}
                isActive={selectedRatio === ratio.key}
                onClick={() => {
                  setSelectedRatio(ratio.key);
                  setTimeout(() => scrollToSectionWithHeaderOffset(sectionBgRef.current), 100);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 背景テンプレート選択エリア */}
      {inputs.length > 0 && (
        <div ref={sectionBgRef} className="space-y-4 pt-4">
          <h3 className="text-base font-semibold text-gray-800">背景をカスタマイズ（オプション）</h3>

          {/* --- カラー・テンプレ（無料） --- */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {/* 「背景なし」オプション */}
            <div
              onClick={() => {
                setSelectedTemplate(null);
                setCustomBgImage(null);
                setBgMode('normal');
                setAiBgPreset(null); setAiBgPrompt('');
                setBlendEnabled(false);
                setTimeout(() => scrollToSectionWithHeaderOffset(sectionFilesRef.current), 100);
              }}
              className={`cursor-pointer rounded-lg border-2 ${!selectedTemplate ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-400'} overflow-hidden relative aspect-square flex items-center justify-center bg-gray-100 transition-all`}
            >
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}></div>
              <span className="relative z-10 text-sm font-medium text-gray-600 bg-white bg-opacity-75 px-2 py-1 rounded">なし</span>
            </div>
            {/* カラーピッカー */}
            <div
              onClick={() => {
                setSelectedTemplate(customColor);
                setCustomBgImage(null);
                setBgMode('normal');
                setAiBgPreset(null); setAiBgPrompt('');
                setTimeout(() => scrollToSectionWithHeaderOffset(sectionFilesRef.current), 100);
              }}
              className={`cursor-pointer rounded-lg border-2 ${selectedTemplate === customColor ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-400'} overflow-hidden relative aspect-square flex items-center justify-center transition-all`}
              style={{ backgroundColor: customColor }}
            >
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setSelectedTemplate(e.target.value);
                  setCustomBgImage(null);
                  setBgMode('normal');
                  setAiBgPreset(null); setAiBgPrompt('');
                  setTimeout(() => scrollToSectionWithHeaderOffset(sectionFilesRef.current), 100);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="color-picker"
                title="色を選択"
              />
              <label htmlFor="color-picker" className="relative z-10 text-sm font-medium text-black mix-blend-difference bg-white bg-opacity-75 px-2 py-1 rounded cursor-pointer">
                カスタム
              </label>
            </div>
            {/* テンプレート画像 */}
            {templates.map((template) => (
              <div
                key={template.src}
                onClick={() => {
                  setSelectedTemplate(template.src);
                  setCustomBgImage(null);
                  setBgMode('normal');
                  setAiBgPreset(null); setAiBgPrompt('');
                  setTimeout(() => scrollToSectionWithHeaderOffset(sectionFilesRef.current), 100);
                }}
                className={`cursor-pointer rounded-lg border-2 ${selectedTemplate === template.src ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-blue-400'} overflow-hidden relative aspect-square transition-all`}
              >
                {template.src.startsWith('#') ? (
                  <div style={{ backgroundColor: template.src }} className="w-full h-full"></div>
                ) : (
                  <img src={template.src} alt={template.name} className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-0.5 font-semibold">{template.name}</div>
              </div>
            ))}

            {/* --- 画像を背景にする（Pro） --- */}
            <div
              onClick={() => {
                if (!isPro) {
                  goToProPurchase('custom_bg_upload');
                  trackAnalyticsEvent('pro_purchase_click_from_ai_bg', { feature: 'custom_bg' });
                  return;
                }
                customBgInputRef.current?.click();
              }}
              className={`cursor-pointer rounded-lg border-2 ${customBgImage && selectedTemplate === customBgImage ? 'border-blue-500 ring-2 ring-blue-300' : 'border-dashed border-gray-300 hover:border-blue-400'} overflow-hidden relative aspect-square flex flex-col items-center justify-center transition-all bg-gray-50`}
            >
              {customBgImage ? (
                <img src={customBgImage} alt="アップロード画像" className="w-full h-full object-cover" />
              ) : (
                <>
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-gray-500 text-center leading-tight">画像を{'\n'}背景に</span>
                </>
              )}
              {!isPro && (
                <div className="absolute top-1 right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Pro</div>
              )}
              {customBgImage && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-0.5 font-semibold">アップロード</div>
              )}
            </div>
            <input
              ref={customBgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCustomBgSelect}
            />
          </div>

          {/* --- ✨ AIで背景を作る（事前設定型、Pro / プレミアムAI回数消費） --- */}
          <div className={`mt-4 p-4 rounded-xl border-2 transition-all ${bgMode === 'ai_generate' ? 'border-purple-500 ring-2 ring-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50' : 'border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                ✨ AIで背景を作る
                {!isPro && <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Pro</span>}
              </h4>
              {isPro && premiumRemaining !== null && (
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                  残り {premiumRemaining} 回
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">好きなスタイルや場所を選ぶと、AIが自然な背景を作ります</p>

            {/* プリセットボタン */}
            <div className="flex flex-wrap gap-2 mb-3">
              {aiBgPresets.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => {
                    if (!isPro) {
                      goToProPurchase('ai_bg_preset');
                      trackAnalyticsEvent('pro_purchase_click_from_ai_bg', { feature: 'bg_generate', preset: preset.key });
                      return;
                    }
                    if (aiBgPreset === preset.key) {
                      // 同じプリセット再タップ → 解除 → normalモードに戻す
                      setAiBgPreset(null);
                      if (!aiBgPrompt) setBgMode('normal');
                    } else {
                      setAiBgPreset(preset.key);
                      setBgMode('ai_generate');
                      setSelectedTemplate(null); // テンプレ解除
                      setCustomBgImage(null);
                      setBlendEnabled(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${aiBgPreset === preset.key
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100'
                    }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* テキスト入力 */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="さらに詳しく（任意）例: 木のテーブルの上、窓際の光"
                value={aiBgPrompt}
                onChange={(e) => {
                  setAiBgPrompt(e.target.value);
                  if (e.target.value || aiBgPreset) {
                    setBgMode('ai_generate');
                    setSelectedTemplate(null);
                    setCustomBgImage(null);
                    setBlendEnabled(false);
                  } else if (!aiBgPreset) {
                    setBgMode('normal');
                  }
                }}
                className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                disabled={!isPro || busy}
              />
            </div>

            {bgMode === 'ai_generate' && (
              <p className="mt-2 text-xs text-purple-600 font-medium">
                ✓ 処理開始時にAIが背景を生成します（{inputs.filter(i => i.status === 'ready' || i.status === 'error').length}枚 × 1回消費）
              </p>
            )}
          </div>

          {/* --- 自然になじませる チェックボックス（テンプレ/カラー/カスタム画像選択時のみ） --- */}
          {selectedTemplate && bgMode === 'normal' && (
            <div className="mt-3 p-3 rounded-lg border border-teal-200 bg-teal-50/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blendEnabled}
                  onChange={(e) => {
                    if (!isPro) {
                      goToProPurchase('ai_bg_blend');
                      trackAnalyticsEvent('pro_purchase_click_from_ai_bg', { feature: 'bg_blend' });
                      return;
                    }
                    setBlendEnabled(e.target.checked);
                  }}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  disabled={!isPro}
                />
                <span className="text-sm font-medium text-teal-800 flex items-center gap-1.5">
                  自然になじませる（影・光を自動調整）
                  {!isPro && <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Pro</span>}
                </span>
                {isPro && premiumRemaining !== null && blendEnabled && (
                  <span className="text-xs text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full ml-auto">
                    {inputs.filter(i => i.status === 'ready' || i.status === 'error').length}枚 × 1回消費
                  </span>
                )}
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">選んだ背景に合わせてAIが影や明るさを自然に調整します</p>
            </div>
          )}

          {/* AIエラー表示 */}
          {aiBgError && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{aiBgError}</p>
          )}
        </div>
      )}

      {/* 選択されたファイルリスト */}
      {inputs.length > 0 && (
        <div ref={sectionFilesRef} className="space-y-4 pt-6">
          <h3 className="text-base font-semibold text-gray-800">選択されたファイル</h3>

          <ul className="flex flex-col gap-4 list-none p-0 m-0">
            {inputs.map(input => {
              const processingTime = input.startTime && input.endTime
                ? ((input.endTime - input.startTime) / 1000).toFixed(1)
                : null;
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const currentTime = input.startTime && !input.endTime
                ? ((Date.now() - input.startTime) / 1000).toFixed(1)
                : null;
              const showComparison = input.status === 'completed' && input.outputUrl && input.previewUrl;

              return (
                <li key={input.id} className={`p-4 sm:p-5 transition-all duration-300 ease-in-out relative rounded-xl border border-gray-200 shadow-sm ${input.status === 'completed' ? 'bg-emerald-50/60 border-l-4 border-l-emerald-500' :
                  input.status === 'error' ? 'bg-red-50/80 border-l-4 border-l-red-400' :
                    input.status === 'processing' || input.status === 'uploading' ? 'bg-sky-50/80 border-l-4 border-l-sky-400' :
                      'bg-white'
                  }`}>


                  <div className="flex items-start space-x-3">
                    <div
                      className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex items-center justify-center relative bg-gray-100"
                      style={input.outputUrl && input.status === 'completed' ? {
                        backgroundImage: 'linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)',
                        backgroundSize: '10px 10px',
                        backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                        backgroundColor: '#f3f4f6',
                      } : undefined}
                    >
                      {/* 処理中のパルスアニメーション */}
                      {(input.status === 'uploading' || input.status === 'processing') && (
                        <div className="absolute inset-0 bg-blue-400 opacity-20 animate-pulse rounded"></div>
                      )}

                      {input.outputUrl ? (
                        <img
                          src={input.outputUrl}
                          alt={`処理済み ${input.name}`}
                          className="object-contain w-full h-full relative z-10"
                        />
                      ) : input.previewUrl && (input.status === 'ready' || input.status === 'uploading' || input.status === 'processing' || input.status === 'completed') ? (
                        <img
                          src={input.previewUrl}
                          alt={`プレビュー ${input.name}`}
                          className="object-contain w-full h-full relative z-10"
                          onError={(e) => {
                            // プレビューの読み込みエラー時（HEICファイルなど）はプレースホルダーを表示
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.fallback-icon')) {
                              const fallbackDiv = document.createElement('div');
                              fallbackDiv.className = 'fallback-icon flex flex-col items-center justify-center text-gray-500 w-full h-full relative z-10';
                              fallbackDiv.innerHTML = `
                                <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span class="text-xs">画像</span>
                              `;
                              parent.appendChild(fallbackDiv);
                            }
                          }}
                        />
                      ) : input.status === 'converting' ? (
                        <div className="flex flex-col items-center justify-center text-gray-500 relative z-10">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-1"></div>
                          <span className="text-xs">変換中</span>
                        </div>
                      ) : input.status === 'uploading' ? (
                        <div className="flex flex-col items-center justify-center text-blue-600 relative z-10">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-1"></div>
                          <span className="text-xs font-medium">送信中</span>
                        </div>
                      ) : input.status === 'processing' ? (
                        <div className="flex flex-col items-center justify-center text-blue-600 relative z-10">
                          <div className="animate-pulse">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                          <span className="text-xs font-medium mt-1">処理中</span>
                        </div>
                      ) : input.status === 'pending' ? (
                        <div className="flex flex-col items-center justify-center text-gray-500 relative z-10">
                          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs">待機中</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-500 relative z-10">
                          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs">画像</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{input.name}</p>
                        {/* 処理時間表示 */}
                        {processingTime && (
                          <span className="text-xs text-emerald-700 font-medium bg-emerald-100 px-2 py-1 rounded-full">
                            {processingTime}秒
                          </span>
                        )}

                      </div>

                      <div className="flex items-center space-x-2">
                        <p className={`text-xs font-medium ${input.status === 'error' ? 'text-red-700' :
                          input.status === 'completed' ? 'text-emerald-700' :
                            input.status === 'processing' || input.status === 'uploading' ? 'text-sky-600' :
                              'text-gray-500'
                          }`}>
                          {input.status === 'pending' && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              待機中
                            </span>
                          )}
                          {input.status === 'converting' && (
                            <span className="flex items-center">
                              <div className="animate-spin rounded-full h-3 w-3 border border-blue-500 border-t-transparent mr-1"></div>
                              写真を準備中...
                            </span>
                          )}
                          {input.status === 'ready' && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              準備完了
                            </span>
                          )}
                          {input.status === 'uploading' && (
                            <span className="flex items-center">
                              <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent mr-1"></div>
                              アップロード中...
                            </span>
                          )}
                          {input.status === 'processing' && (
                            <span className="flex items-center">
                              <div className="flex space-x-1 mr-2">
                                <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                                <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                              </div>
                              AI背景除去中...
                            </span>
                          )}
                          {input.status === 'completed' && (
                            <span className="flex items-center text-emerald-700">
                              <svg className="w-3 h-3 mr-1 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              完了
                            </span>
                          )}
                          {input.status === 'error' && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              エラー
                            </span>
                          )}
                        </p>
                      </div>
                      {input.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 break-words bg-red-50 p-2 rounded border border-red-200">
                          <strong>詳細:</strong> {input.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 完了時: 元の画像 vs 透過後の比較表示 */}
                  {showComparison && (
                    <div className="mt-4 rounded-xl border border-emerald-200/80 bg-white/80 overflow-hidden shadow-inner">
                      <div className="grid grid-cols-2 gap-0">
                        <div className="flex flex-col p-2 sm:p-3 border-r border-gray-200">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">元の画像</span>
                          <div className="aspect-square max-h-32 sm:max-h-40 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                            <img
                              src={input.previewUrl}
                              alt={`元画像 ${input.name}`}
                              className="object-contain w-full h-full"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col p-2 sm:p-3">
                          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">透過後</span>
                          <div
                            className="aspect-square max-h-32 sm:max-h-40 rounded-lg overflow-hidden flex items-center justify-center flex-1 min-h-0"
                            style={{
                              backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                              backgroundSize: '14px 14px',
                              backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                              backgroundColor: '#f9fafb',
                            }}
                          >
                            <img
                              src={input.outputUrl}
                              alt={`透過後 ${input.name}`}
                              className="object-contain w-full h-full relative z-10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ボタンエリア - スマホでは下に配置 */}
                  {(input.outputUrl && input.status === 'completed') || input.status === 'error' ? (
                    <div className={`mt-4 pt-3 border-t ${input.status === 'completed' ? 'border-emerald-200/60' : 'border-red-200/60'}`}>
                      {input.outputUrl && input.status === 'completed' && isPro && (
                        <div className="mb-3 rounded-xl border p-3 border-purple-200 bg-purple-50">
                          <p className="text-sm font-semibold text-gray-900">
                            {input.lastProcessingMode === 'pro_high_precision' ? '高画質化（拡大）' : 'Pro機能'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {input.lastProcessingMode === 'pro_high_precision'
                              ? '画像を拡大して高解像度にできます。サイズを選んでから実行してください。'
                              : '高精度で再処理したあと、高画質化（拡大）もできます。'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <>
                              {input.lastProcessingMode !== 'pro_high_precision' && (
                                <button
                                  type="button"
                                  onClick={() => { void handleRemakeWithOriginal(input, 'edge_cleanup'); }}
                                  disabled={batchEnhanceState.inProgress || enhancingFileId === input.id}
                                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60"
                                >
                                  {enhancingFileId === input.id ? '再処理中…' : '高精度で再処理'}
                                </button>
                              )}
                              {enhancingFileId === input.id && pendingEnhance?.fileId !== input.id && (
                                <div className="flex items-center gap-2 w-full py-1">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
                                  <span className="text-xs text-purple-700 font-medium">高画質化処理中…</span>
                                </div>
                              )}
                              {input.wasEnhanced && enhancingFileId !== input.id && (
                                <div className="flex items-center gap-1.5 w-full py-1 px-2 rounded-md bg-green-50 border border-green-200">
                                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs text-green-700 font-medium">高画質化完了</span>
                                </div>
                              )}
                              {enhancingFileId !== input.id && (
                                <>
                                  {input.outputWidth && input.outputHeight && (
                                    <p className="text-xs text-gray-500">現在のサイズ: {input.outputWidth}×{input.outputHeight}px</p>
                                  )}
                                  <div className="inline-flex rounded-lg border border-purple-200 overflow-hidden">
                                    {(['1k', '2k', '4k'] as EnhanceTarget[]).map((target) => {
                                      const targetPx = toEnhanceLongSide(target);
                                      const alreadyLargeEnough = (input.outputLongSide ?? 0) >= targetPx;
                                      const isSelected = pendingEnhance?.fileId === input.id && pendingEnhance.target === target;
                                      const afterDims = (input.outputWidth && input.outputHeight)
                                        ? computeUpscaledDimensions(input.outputWidth, input.outputHeight, target)
                                        : null;
                                      const titleText = alreadyLargeEnough
                                        ? `既に${target.toUpperCase()}以上のサイズです`
                                        : afterDims
                                          ? `${afterDims.width}×${afterDims.height}px に高画質化（拡大）`
                                          : `${target.toUpperCase()}に高画質化（拡大）`;
                                      return (
                                        <button
                                          key={target}
                                          type="button"
                                          onClick={() => {
                                            if (isSelected) {
                                              setPendingEnhance(null);
                                            } else {
                                              setPendingEnhance({ fileId: input.id, target });
                                            }
                                          }}
                                          disabled={batchEnhanceState.inProgress || alreadyLargeEnough}
                                          title={titleText}
                                          className={`px-3 py-2 text-sm font-medium border-r last:border-r-0 border-purple-200 transition-colors ${isSelected
                                            ? 'bg-purple-600 text-white'
                                            : alreadyLargeEnough
                                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                              : 'bg-white text-purple-700 hover:bg-purple-100'
                                            } disabled:opacity-60`}
                                        >
                                          {target === '1k' ? '1K' : target === '2k' ? '2K' : '4K'}
                                          {alreadyLargeEnough && ' ✓'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {pendingEnhance?.fileId === input.id && (() => {
                                    const cur = { w: input.outputWidth ?? 0, h: input.outputHeight ?? 0 };
                                    const after = computeUpscaledDimensions(cur.w, cur.h, pendingEnhance.target);
                                    return (
                                      <div className="flex flex-col gap-1.5">
                                        <p className="text-xs text-gray-600">
                                          <span className="font-medium">{cur.w}×{cur.h}</span>
                                          <span className="mx-1.5 text-purple-400">→</span>
                                          <span className="font-bold text-purple-700">{after.width}×{after.height}</span>
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const t = pendingEnhance.target;
                                              setPendingEnhance(null);
                                              void handleEnhanceForFile(input, t);
                                            }}
                                            className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700"
                                          >
                                            {pendingEnhance.target.toUpperCase()}に高画質化を実行
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setPendingEnhance(null)}
                                            className="text-xs text-gray-500 hover:text-gray-700"
                                          >
                                            キャンセル
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                            </>
                          </div>
                        </div>
                      )}
                      {input.outputUrl && input.status === 'completed' && (
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          {/* ダウンロードボタン */}
                          {!isPro && (
                            <a
                              href={input.outputUrl}
                              download={`processed_${input.name.replace(/\.[^.]+$/, ".png")}`}
                              className="flex-1 sm:flex-none"
                            >
                              <PrimaryButton variant="primary" size="sm" className="w-full sm:w-auto">
                                保存
                              </PrimaryButton>
                            </a>
                          )}
                          {isPro && (
                            <a
                              href={input.highQualityOutputUrl || input.outputUrl}
                              download={`processed_hq_${input.name.replace(/\.[^.]+$/, ".png")}`}
                              className="flex-1 sm:flex-none"
                            >
                              <PrimaryButton variant="primary" size="sm" className="w-full sm:w-auto">
                                {input.wasEnhanced ? '高画質化して保存' : '保存'}
                              </PrimaryButton>
                            </a>
                          )}
                          {/* イージートリミングで編集ボタン - Linkを使用 */}
                          {input.boundingBox && input.outputUrl && (
                            <Link
                              href="/trim"
                              onClick={() => {
                                // localStorageに画像URLとバウンディングボックスを保存
                                // outputUrlは既にData URLになっているはず
                                localStorage.setItem('trimImage', input.outputUrl || '');
                                localStorage.setItem('trimBoundingBox', JSON.stringify(input.boundingBox));
                                // ページ遷移はLinkコンポーネントが行う
                              }}
                              passHref // Next.js 13/14のLinkで子要素がインタラクティブな場合に使用が推奨
                              target="_blank" // ここで新しいタブで開く設定を追加
                              rel="noopener noreferrer" // セキュリティのために追加
                              className="flex-1 sm:flex-none"
                            >
                              <PrimaryButton variant="outline" size="sm" className="w-full sm:w-auto bg-white text-gray-800 hover:bg-gray-100 border-gray-300">
                                イージートリミングで編集
                              </PrimaryButton>
                            </Link>
                          )}
                        </div>
                      )}
                      {input.status === 'error' && (
                        <button
                          onClick={() => {
                            updateInputStatus(input.id, 'ready', undefined);
                            setMsg(null);
                          }}
                          className="w-full sm:w-auto px-3 py-1.5 rounded-md text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 transition-colors"
                          title="このファイルで再試行（エラークリア）"
                        >
                          再試行
                        </button>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 背景除去・一括ダウンロードボタン */}
      <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-4">
        {inputs.length > 0 && inputs.some(i => i.status === 'ready' || i.status === 'error') && !busy && (
          <PrimaryButton
            onClick={() => {
              void handleRemove();
            }}
            disabled={busy || inputs.filter(i => i.status === 'ready').length === 0}
          >
            {busy ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-opacity-60 mr-2"></div>
                処理中...
              </span>
            ) : `選択した画像（${inputs.filter(i => i.status === 'ready').length}枚）の背景を透過する`}
          </PrimaryButton>
        )}

        {/* エラーファイル一括再処理ボタン */}
        {inputs.filter(i => i.status === 'error').length > 0 && !busy && (
          <PrimaryButton
            onClick={() => {
              // エラーファイルを全て ready 状態にリセット
              const errorFiles = inputs.filter(i => i.status === 'error');
              errorFiles.forEach(file => {
                updateInputStatus(file.id, 'ready', undefined);
              });
              setMsg(`${errorFiles.length}件のやり直し準備ができました。`);
            }}
            variant="secondary"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              エラー{inputs.filter(i => i.status === 'error').length}件を一括再処理
            </span>
          </PrimaryButton>
        )}

        {hasCompletedResults && (
          <>
            {!isPro && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 p-4 text-left shadow-sm">
                <p className="text-sm font-bold text-amber-900">
                  Proならもっときれいに仕上がります
                </p>
                <p className="text-xs text-amber-700 mt-1 font-medium">月額780円で高精度＋プレミアムAIが使えます</p>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">高精度透過</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">髪の毛やフチまできれいに切り抜き</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">高画質化（拡大）</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">最大4K（3840px）まで拡大してさらに綺麗に</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">元画質を維持</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">写真を圧縮せずそのまま処理</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => goToProPurchase('result_upsell_top')}
                  className="mt-3 w-full inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 transition-colors shadow-sm"
                >
                  Proを購入する
                </button>
              </div>
            )}
            {inputs.filter(input => input.status === 'completed').length > 1 && (
              <>
                {isPro && !batchEnhanceState.inProgress && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">一括高画質化（拡大）:</span>
                    <div className="inline-flex rounded-lg border border-purple-200 overflow-hidden">
                      {(['1k', '2k', '4k'] as EnhanceTarget[]).map((target) => {
                        const targetPx = toEnhanceLongSide(target);
                        const eligibleCount = inputs.filter(
                          i => i.status === 'completed' && (i.highQualityOutputUrl || i.outputUrl) && (i.outputLongSide ?? 0) < targetPx
                        ).length;
                        const isSelected = pendingBatchTarget === target;
                        return (
                          <button
                            key={`batch-${target}`}
                            type="button"
                            onClick={() => setPendingBatchTarget(isSelected ? null : target)}
                            disabled={busy || eligibleCount === 0}
                            title={eligibleCount === 0 ? `全画像が既に${target.toUpperCase()}以上です` : `${eligibleCount}枚を${target.toUpperCase()}に高画質化（拡大）`}
                            className={`px-3 py-2 text-sm font-semibold border-r last:border-r-0 border-purple-200 transition-colors ${isSelected
                              ? 'bg-purple-600 text-white'
                              : eligibleCount === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-purple-700 hover:bg-purple-50'
                              } disabled:opacity-60`}
                          >
                            {target === '1k' ? '1K' : target === '2k' ? '2K' : '4K'}
                          </button>
                        );
                      })}
                    </div>
                    {pendingBatchTarget && (() => {
                      const targetPx = toEnhanceLongSide(pendingBatchTarget);
                      const eligible = inputs.filter(
                        i => i.status === 'completed' && (i.highQualityOutputUrl || i.outputUrl) && (i.outputLongSide ?? 0) < targetPx
                      );
                      return (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-gray-500">
                            {eligible.length}枚が対象（長辺 {targetPx}px へ拡大）
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { void handleBatchEnhance(pendingBatchTarget); }}
                              className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700"
                            >
                              {eligible.length}枚を{pendingBatchTarget.toUpperCase()}に高画質化を実行
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingBatchTarget(null)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {(() => {
                  const enhancedByTarget = inputs
                    .filter(i => i.status === 'completed' && i.wasEnhanced && (i.outputLongSide ?? 0) >= 1024)
                    .reduce<Record<EnhanceTarget, number>>(
                      (acc, i) => {
                        const long = i.outputLongSide ?? 0;
                        if (long >= toEnhanceLongSide('4k')) acc['4k'] = (acc['4k'] ?? 0) + 1;
                        else if (long >= toEnhanceLongSide('2k')) acc['2k'] = (acc['2k'] ?? 0) + 1;
                        else if (long >= toEnhanceLongSide('1k')) acc['1k'] = (acc['1k'] ?? 0) + 1;
                        return acc;
                      },
                      { '1k': 0, '2k': 0, '4k': 0 }
                    );
                  const parts = (['4k', '2k', '1k'] as const)
                    .filter(t => enhancedByTarget[t] > 0)
                    .map(t => `${enhancedByTarget[t]}枚を${t.toUpperCase()}`);
                  const upscaleSummary = parts.length > 0 ? parts.join('、') + 'に高画質化済み' : null;
                  return (
                    <div className="flex w-full flex-col items-center gap-1">
                      {upscaleSummary && (
                        <p className="text-sm text-gray-600">
                          {upscaleSummary}
                        </p>
                      )}
                      <PrimaryButton onClick={handleDownloadAll} disabled={busy || batchEnhanceState.inProgress} variant="primary" className="w-full">
                        すべてダウンロード (.zip)
                      </PrimaryButton>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}
      </div>

      {shouldShowResultAd && adPlacement === 'after_cta' && (
        <div className="border-t border-gray-100 pt-4">
          <AdSlot
            slotId="bgremover_result"
            variant="A"
            userPlan={adUserPlan}
            href={adHref}
            title={adTitle}
            description={adDescription}
            ctaLabel={adCtaLabel}
          />
        </div>
      )}

      {/* 処理中・高画質化中モーダル */}
      {(busy || enhancingFileId || batchEnhanceState.inProgress) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="processing-modal-title">
          <div
            className="fixed inset-0 bg-black/40"
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            {busy ? (
              <>
                <h2 id="processing-modal-title" className="text-lg font-bold text-gray-900 mb-4">
                  処理中
                </h2>
                {(() => {
                  const uploadingCount = inputs.filter(i => i.status === 'uploading').length;
                  const processingCount = inputs.filter(i => i.status === 'processing').length;
                  return (uploadingCount > 0 || processingCount > 0) ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm text-gray-700">
                      {uploadingCount > 0 && <span>アップロード中: {uploadingCount}枚</span>}
                      {processingCount > 0 && <span>AI背景除去中: {processingCount}枚</span>}
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center gap-3 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {processedCount}/{inputs.filter(i => i.status === 'ready' || i.status === 'uploading' || i.status === 'processing' || i.status === 'completed' || i.status === 'error').length}枚完了
                    </p>
                    <p className="text-xs text-gray-600">{progress}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <PrimaryButton
                  onClick={handleCancel}
                  variant="secondary"
                  className="w-full bg-red-500 hover:bg-red-600 text-white border-red-500"
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    処理をキャンセル
                  </span>
                </PrimaryButton>
              </>
            ) : batchEnhanceState.inProgress ? (
              <>
                <h2 id="processing-modal-title" className="text-lg font-bold text-gray-900 mb-4">
                  一括高画質化（拡大）中
                </h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {batchEnhanceState.completed}/{batchEnhanceState.total}枚完了
                    </p>
                    <p className="text-xs text-purple-600">
                      {batchEnhanceState.target ? batchEnhanceState.target.toUpperCase() : ''}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2 mb-6">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${batchEnhanceState.total > 0
                        ? Math.round((batchEnhanceState.completed / batchEnhanceState.total) * 100)
                        : 0}%`
                    }}
                  />
                </div>
              </>
            ) : enhancingFileId ? (
              (() => {
                const enhancingInput = inputs.find(i => i.id === enhancingFileId);
                return (
                  <>
                    <h2 id="processing-modal-title" className="text-lg font-bold text-gray-900 mb-4">
                      高画質化（拡大）中
                    </h2>
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {enhancingInput ? enhancingInput.name : '処理中...'}
                      </p>
                    </div>
                  </>
                );
              })()
            ) : null}
          </div>
        </div>
      )}

      {shouldShowResultAd && adPlacement === 'bottom' && (
        <div className="border-t border-gray-100 pt-4">
          <AdSlot
            slotId="bgremover_result"
            variant="B"
            userPlan={adUserPlan}
            href={adHref}
            title={adTitle}
            description={adDescription}
            ctaLabel={adCtaLabel}
          />
        </div>
      )}

      {/* 全体メッセージ */}
      {msg && <p className={`text-sm p-3.5 rounded-md shadow ${inputs.some(i => i.status === 'error') && (msg.includes("エラー") || msg.includes("失敗")) ? 'text-red-800 bg-red-100 border border-red-300' : 'text-gray-800 bg-gray-100 border border-gray-300'}`}>{msg}</p>}

      {/* スティッキーCTA（元のCTAが画面外のときのみ表示） */}
      {!isCtaVisible && inputs.length > 0 && !busy && (
        inputs.some(i => i.status === 'ready') || hasCompletedResults
      ) && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="max-w-3xl mx-auto space-y-2">
              {inputs.some(i => i.status === 'ready') && (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollToSectionWithHeaderOffset(sectionModeRef.current)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${selectedProcessingMode === 'pro_high_precision'
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : 'bg-gray-50 border border-gray-200 text-gray-600'
                        }`}
                    >
                      仕上：{selectedProcessingMode === 'standard' ? '標準' : '高精度'}
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSectionWithHeaderOffset(sectionSizeRef.current)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 border border-gray-200 text-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      サイズ：{{ '1:1': '1:1', '16:9': '16:9', '4:3': '4:3', 'original': '元画像', 'fit-subject': 'フィット' }[selectedRatio] ?? selectedRatio}
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSectionWithHeaderOffset(sectionBgRef.current)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 border border-gray-200 text-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      背景：{selectedTemplate ? (templates.find(t => t.src === selectedTemplate)?.name ?? 'カスタム色') : '透過'}
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSectionWithHeaderOffset(sectionFilesRef.current)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 border border-blue-200 text-blue-700 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {inputs.filter(i => i.status === 'ready').length}/30枚
                    </button>
                  </div>
                  <PrimaryButton
                    onClick={() => void handleRemove()}
                    disabled={inputs.filter(i => i.status === 'ready').length === 0}
                  >
                    選択した画像（{inputs.filter(i => i.status === 'ready').length}枚）の背景を透過する
                  </PrimaryButton>
                </>
              )}
              {!inputs.some(i => i.status === 'ready') && hasCompletedResults && (
                <>
                  {(() => {
                    const enhancedByTarget = inputs
                      .filter(i => i.status === 'completed' && i.wasEnhanced && (i.outputLongSide ?? 0) >= 1024)
                      .reduce<Record<EnhanceTarget, number>>(
                        (acc, i) => {
                          const long = i.outputLongSide ?? 0;
                          if (long >= toEnhanceLongSide('4k')) acc['4k'] = (acc['4k'] ?? 0) + 1;
                          else if (long >= toEnhanceLongSide('2k')) acc['2k'] = (acc['2k'] ?? 0) + 1;
                          else if (long >= toEnhanceLongSide('1k')) acc['1k'] = (acc['1k'] ?? 0) + 1;
                          return acc;
                        },
                        { '1k': 0, '2k': 0, '4k': 0 }
                      );
                    const parts = (['4k', '2k', '1k'] as const)
                      .filter(t => enhancedByTarget[t] > 0)
                      .map(t => `${enhancedByTarget[t]}枚を${t.toUpperCase()}`);
                    const upscaleSummary = parts.length > 0 ? parts.join('、') + 'に高画質化済み' : null;
                    return upscaleSummary ? (
                      <p className="text-center text-[11px] font-medium text-gray-600">
                        {upscaleSummary}
                      </p>
                    ) : null;
                  })()}
                  {isPro && !batchEnhanceState.inProgress && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-2.5 space-y-2">
                      <p className="text-[11px] font-semibold text-purple-700">一括高画質化（Pro）</p>
                      <div className="inline-flex w-full rounded-lg border border-purple-200 overflow-hidden">
                        {(['1k', '2k', '4k'] as EnhanceTarget[]).map((target) => {
                          const targetPx = toEnhanceLongSide(target);
                          const eligibleCount = inputs.filter(
                            i => i.status === 'completed' && (i.highQualityOutputUrl || i.outputUrl) && (i.outputLongSide ?? 0) < targetPx
                          ).length;
                          const isSelected = pendingBatchTarget === target;
                          return (
                            <button
                              key={`sticky-batch-${target}`}
                              type="button"
                              onClick={() => setPendingBatchTarget(isSelected ? null : target)}
                              disabled={busy || eligibleCount === 0}
                              className={`flex-1 px-2 py-1.5 text-xs font-semibold border-r last:border-r-0 border-purple-200 transition-colors ${isSelected
                                ? 'bg-purple-600 text-white'
                                : eligibleCount === 0
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-white text-purple-700 hover:bg-purple-100'
                                }`}
                            >
                              {target === '1k' ? '1K' : target === '2k' ? '2K' : '4K'}
                            </button>
                          );
                        })}
                      </div>
                      {pendingBatchTarget && (() => {
                        const targetPx = toEnhanceLongSide(pendingBatchTarget);
                        const eligible = inputs.filter(
                          i => i.status === 'completed' && (i.highQualityOutputUrl || i.outputUrl) && (i.outputLongSide ?? 0) < targetPx
                        );
                        if (eligible.length === 0) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => { void handleBatchEnhance(pendingBatchTarget); }}
                            className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700"
                          >
                            {eligible.length}枚を{pendingBatchTarget.toUpperCase()}に高画質化
                          </button>
                        );
                      })()}
                    </div>
                  )}
                  {!isPro && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5">
                      <p className="text-[11px] text-amber-700 mb-2">Proなら高画質化（拡大）、高精度モードが使えます</p>
                      <button
                        type="button"
                        onClick={() => goToProPurchase('sticky_download_upsell')}
                        className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                      >
                        Proで高画質化する
                      </button>
                    </div>
                  )}
                  <PrimaryButton onClick={handleDownloadAll} disabled={batchEnhanceState.inProgress} variant="primary" className="w-full">
                    すべてダウンロード (.zip)
                  </PrimaryButton>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
