/**
 * プレビュー機能のパフォーマンス最適化ユーティリティ
 * Requirements: 2.2, 8.1
 */

/**
 * プレビュー用の画像サイズ設定
 */
export const PREVIEW_CONFIG = {
  // プレビュー画像の最大サイズ（パフォーマンス最適化）
  MAX_PREVIEW_SIZE: 200,
  // JPEG品質設定
  JPEG_QUALITY: 0.8,
  // 並列処理の最大数
  MAX_CONCURRENT_PROCESSING: 4,
  // キャッシュの最大サイズ（画像数）
  MAX_CACHE_SIZE: 50
} as const;

/**
 * プレビューキャッシュの型定義
 */
export interface PreviewCache {
  [imageId: string]: {
    [presetId: string]: {
      url: string;
      timestamp: number;
      size: number;
    };
  };
}

/**
 * プレビューキャッシュマネージャー
 */
export class PreviewCacheManager {
  private cache: PreviewCache = {};
  private totalSize = 0;

  /**
   * キャッシュからプレビューURLを取得
   */
  get(imageId: string, presetId: string): string | null {
    const imageCache = this.cache[imageId];
    if (!imageCache || !imageCache[presetId]) {
      return null;
    }

    // アクセス時刻を更新（LRU用）
    imageCache[presetId].timestamp = Date.now();
    return imageCache[presetId].url;
  }

  /**
   * プレビューURLをキャッシュに保存
   */
  set(imageId: string, presetId: string, url: string, size: number): void {
    if (!this.cache[imageId]) {
      this.cache[imageId] = {};
    }

    // 既存のエントリがある場合は削除
    if (this.cache[imageId][presetId]) {
      this.totalSize -= this.cache[imageId][presetId].size;
    }

    this.cache[imageId][presetId] = {
      url,
      timestamp: Date.now(),
      size
    };

    this.totalSize += size;

    // キャッシュサイズが上限を超えた場合、古いエントリを削除
    this.evictIfNeeded();
  }

  /**
   * 特定の画像のキャッシュを削除
   */
  removeImage(imageId: string): void {
    const imageCache = this.cache[imageId];
    if (!imageCache) return;

    // サイズを減算
    Object.values(imageCache).forEach(entry => {
      this.totalSize -= entry.size;
    });

    delete this.cache[imageId];
  }

  /**
   * 特定のプリセットのキャッシュを削除
   */
  removePreset(presetId: string): void {
    Object.keys(this.cache).forEach(imageId => {
      const imageCache = this.cache[imageId];
      if (imageCache[presetId]) {
        this.totalSize -= imageCache[presetId].size;
        delete imageCache[presetId];
      }
    });
  }

  /**
   * 全キャッシュをクリア
   */
  clear(): void {
    this.cache = {};
    this.totalSize = 0;
  }

  /**
   * キャッシュサイズが上限を超えた場合の削除処理
   */
  private evictIfNeeded(): void {
    const maxEntries = PREVIEW_CONFIG.MAX_CACHE_SIZE;
    const allEntries: Array<{
      imageId: string;
      presetId: string;
      timestamp: number;
      size: number;
    }> = [];

    // 全エントリを収集
    Object.keys(this.cache).forEach(imageId => {
      Object.keys(this.cache[imageId]).forEach(presetId => {
        const entry = this.cache[imageId][presetId];
        allEntries.push({
          imageId,
          presetId,
          timestamp: entry.timestamp,
          size: entry.size
        });
      });
    });

    // エントリ数が上限を超えている場合
    if (allEntries.length > maxEntries) {
      // タイムスタンプでソート（古い順）
      allEntries.sort((a, b) => a.timestamp - b.timestamp);

      // 古いエントリから削除
      const entriesToRemove = allEntries.slice(0, allEntries.length - maxEntries);
      entriesToRemove.forEach(({ imageId, presetId, size }) => {
        delete this.cache[imageId][presetId];
        this.totalSize -= size;

        // 画像のキャッシュが空になった場合は削除
        if (Object.keys(this.cache[imageId]).length === 0) {
          delete this.cache[imageId];
        }
      });
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    imageCount: number;
  } {
    let totalEntries = 0;
    const imageCount = Object.keys(this.cache).length;

    Object.values(this.cache).forEach(imageCache => {
      totalEntries += Object.keys(imageCache).length;
    });

    return {
      totalEntries,
      totalSize: this.totalSize,
      imageCount
    };
  }
}

/**
 * グローバルプレビューキャッシュインスタンス
 */
export const globalPreviewCache = new PreviewCacheManager();

/**
 * 画像のプレビューサイズを計算
 */
export function calculatePreviewSize(
  originalWidth: number,
  originalHeight: number,
  maxSize: number = PREVIEW_CONFIG.MAX_PREVIEW_SIZE
): { width: number; height: number } {
  const ratio = Math.min(maxSize / originalWidth, maxSize / originalHeight);
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  };
}

/**
 * Data URLのサイズを推定
 */
export function estimateDataUrlSize(dataUrl: string): number {
  // Base64エンコードされたデータのサイズを推定
  // "data:image/jpeg;base64," の部分を除いてBase64部分のサイズを計算
  const base64Data = dataUrl.split(',')[1] || '';
  return Math.round((base64Data.length * 3) / 4); // Base64デコード後のサイズ
}

/**
 * 並列処理用のセマフォ
 */
export class ProcessingSemaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * セマフォを取得
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  /**
   * セマフォを解放
   */
  release(): void {
    this.permits++;
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

/**
 * プレビュー処理用のグローバルセマフォ
 */
export const previewProcessingSemaphore = new ProcessingSemaphore(
  PREVIEW_CONFIG.MAX_CONCURRENT_PROCESSING
);

/**
 * メモリ使用量を監視し、必要に応じてキャッシュをクリア
 */
export function monitorMemoryUsage(): void {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as unknown as { memory: unknown })) {
    const memory = (window.performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;

    // メモリ使用量が80%を超えた場合、キャッシュをクリア
    if (usedMB / limitMB > 0.8) {
      console.warn('High memory usage detected, clearing preview cache');
      globalPreviewCache.clear();
    }
  }
}

/**
 * 定期的なメモリ監視を開始
 */
export function startMemoryMonitoring(intervalMs: number = 30000): () => void {
  const intervalId = setInterval(monitorMemoryUsage, intervalMs);
  
  return () => {
    clearInterval(intervalId);
  };
}