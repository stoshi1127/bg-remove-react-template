import { FilterConfig } from '../types/filter';

/**
 * パフォーマンス最適化ユーティリティ
 * Requirements: 8.1, 8.2, 8.4
 */

export interface ImageOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  maxFileSize: number; // bytes
  quality: number; // 0.0 to 1.0
  enableProgressive: boolean;
}

export interface MemoryUsageInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryPressure: 'low' | 'medium' | 'high';
}

export interface ProcessingMetrics {
  startTime: number;
  endTime: number;
  processingTime: number;
  memoryBefore: MemoryUsageInfo;
  memoryAfter: MemoryUsageInfo;
  originalFileSize: number;
  processedFileSize: number;
  compressionRatio: number;
}

/**
 * デフォルトの最適化設定
 */
export const DEFAULT_OPTIMIZATION_CONFIG: ImageOptimizationConfig = {
  maxWidth: 4096,
  maxHeight: 4096,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  quality: 0.9,
  enableProgressive: true
};

/**
 * メモリ使用量を取得
 */
export function getMemoryUsage(): MemoryUsageInfo {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  
  if (!memory) {
    // Fallback for browsers without memory API
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      memoryPressure: 'low'
    };
  }

  const usedJSHeapSize = memory.usedJSHeapSize;
  const totalJSHeapSize = memory.totalJSHeapSize;
  const jsHeapSizeLimit = memory.jsHeapSizeLimit;
  
  // メモリプレッシャーを計算
  const memoryUsageRatio = usedJSHeapSize / jsHeapSizeLimit;
  let memoryPressure: 'low' | 'medium' | 'high' = 'low';
  
  if (memoryUsageRatio > 0.8) {
    memoryPressure = 'high';
  } else if (memoryUsageRatio > 0.6) {
    memoryPressure = 'medium';
  }

  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    memoryPressure
  };
}

/**
 * 画像サイズが最適化が必要かチェック
 */
export function shouldOptimizeImage(
  file: File, 
  config: ImageOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
): boolean {
  return file.size > config.maxFileSize;
}

/**
 * 画像の最適なリサイズ寸法を計算
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  config: ImageOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
): { width: number; height: number; shouldResize: boolean } {
  const { maxWidth, maxHeight } = config;
  
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return {
      width: originalWidth,
      height: originalHeight,
      shouldResize: false
    };
  }

  // アスペクト比を維持してリサイズ
  const aspectRatio = originalWidth / originalHeight;
  let newWidth = originalWidth;
  let newHeight = originalHeight;

  if (originalWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
    shouldResize: true
  };
}

/**
 * 大容量画像を最適化してCanvasに読み込み
 */
export async function loadOptimizedImageToCanvas(
  file: File,
  config: ImageOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const { width, height, shouldResize } = calculateOptimalDimensions(
          img.width,
          img.height,
          config
        );

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context could not be obtained'));
          return;
        }

        canvas.width = width;
        canvas.height = height;

        // 高品質なリサイズのための設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (shouldResize) {
          // 段階的リサイズで品質を向上
          const steps = Math.ceil(Math.log2(Math.max(img.width / width, img.height / height)));
          
          if (steps > 1) {
            // 複数段階でリサイズ
            let currentCanvas = document.createElement('canvas');
            let currentCtx = currentCanvas.getContext('2d')!;
            currentCanvas.width = img.width;
            currentCanvas.height = img.height;
            currentCtx.drawImage(img, 0, 0);

            for (let i = 0; i < steps; i++) {
              const ratio = Math.pow(0.5, i + 1);
              const stepWidth = Math.max(width, Math.round(img.width * ratio));
              const stepHeight = Math.max(height, Math.round(img.height * ratio));

              const nextCanvas = document.createElement('canvas');
              const nextCtx = nextCanvas.getContext('2d')!;
              nextCanvas.width = stepWidth;
              nextCanvas.height = stepHeight;
              
              nextCtx.imageSmoothingEnabled = true;
              nextCtx.imageSmoothingQuality = 'high';
              nextCtx.drawImage(currentCanvas, 0, 0, stepWidth, stepHeight);

              currentCanvas = nextCanvas;
              currentCtx = nextCtx;
            }

            // 最終サイズに調整
            ctx.drawImage(currentCanvas, 0, 0, width, height);
          } else {
            ctx.drawImage(img, 0, 0, width, height);
          }
        } else {
          ctx.drawImage(img, 0, 0);
        }

        // メモリクリーンアップ
        URL.revokeObjectURL(img.src);
        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Canvasを最適化されたBlobに変換
 */
export async function canvasToOptimizedBlob(
  canvas: HTMLCanvasElement,
  originalFileSize: number,
  config: ImageOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let quality = config.quality;
    
    // ファイルサイズに基づいて品質を調整
    if (originalFileSize > config.maxFileSize) {
      const sizeRatio = config.maxFileSize / originalFileSize;
      quality = Math.max(0.7, quality * sizeRatio);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/jpeg', quality);
  });
}

/**
 * メモリクリーンアップを実行
 */
export function performMemoryCleanup(): void {
  // ガベージコレクションを促進
  if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
    (window as unknown as { gc: () => void }).gc();
  }
  
  // 不要なオブジェクトURLを解放
  // Note: 実際のアプリケーションでは、使用済みURLのトラッキングが必要
}

/**
 * 処理メトリクスを計算
 */
export function calculateProcessingMetrics(
  startTime: number,
  endTime: number,
  memoryBefore: MemoryUsageInfo,
  memoryAfter: MemoryUsageInfo,
  originalFileSize: number,
  processedFileSize: number
): ProcessingMetrics {
  return {
    startTime,
    endTime,
    processingTime: endTime - startTime,
    memoryBefore,
    memoryAfter,
    originalFileSize,
    processedFileSize,
    compressionRatio: processedFileSize / originalFileSize
  };
}

/**
 * 並列処理の最適な同時実行数を計算
 */
export function calculateOptimalConcurrency(): number {
  const memoryInfo = getMemoryUsage();
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  
  // メモリプレッシャーに基づいて同時実行数を調整
  switch (memoryInfo.memoryPressure) {
    case 'high':
      return Math.max(1, Math.floor(hardwareConcurrency * 0.5));
    case 'medium':
      return Math.max(2, Math.floor(hardwareConcurrency * 0.75));
    case 'low':
    default:
      return Math.min(8, hardwareConcurrency);
  }
}

/**
 * 処理時間を最適化するためのバッチサイズを計算
 */
export function calculateOptimalBatchSize(
  totalImages: number,
  averageFileSize: number
): number {
  const memoryInfo = getMemoryUsage();
  const availableMemory = memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize;
  
  // 1画像あたりの推定メモリ使用量（処理中の一時的なメモリも含む）
  const estimatedMemoryPerImage = averageFileSize * 3; // 元画像 + 処理中 + 結果
  
  // 安全マージンを考慮したバッチサイズ
  const maxBatchSize = Math.floor(availableMemory * 0.7 / estimatedMemoryPerImage);
  
  return Math.max(1, Math.min(totalImages, maxBatchSize, 10));
}

/**
 * プログレッシブ処理のためのチャンク分割
 */
export function createProcessingChunks<T>(
  items: T[],
  chunkSize: number
): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  
  return chunks;
}