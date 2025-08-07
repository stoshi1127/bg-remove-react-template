import {
  PreviewCacheManager,
  calculatePreviewSize,
  estimateDataUrlSize,
  ProcessingSemaphore,
  PREVIEW_CONFIG
} from '../previewOptimization';

describe('previewOptimization', () => {
  describe('PreviewCacheManager', () => {
    let cacheManager: PreviewCacheManager;

    beforeEach(() => {
      cacheManager = new PreviewCacheManager();
    });

    it('キャッシュの保存と取得ができる', () => {
      const imageId = 'test-image';
      const presetId = 'test-preset';
      const url = 'data:image/jpeg;base64,test';
      const size = 1024;

      cacheManager.set(imageId, presetId, url, size);
      const retrieved = cacheManager.get(imageId, presetId);

      expect(retrieved).toBe(url);
    });

    it('存在しないキャッシュエントリに対してnullを返す', () => {
      const retrieved = cacheManager.get('nonexistent', 'preset');
      expect(retrieved).toBeNull();
    });

    it('画像のキャッシュを削除できる', () => {
      const imageId = 'test-image';
      const presetId = 'test-preset';
      const url = 'data:image/jpeg;base64,test';
      const size = 1024;

      cacheManager.set(imageId, presetId, url, size);
      cacheManager.removeImage(imageId);

      const retrieved = cacheManager.get(imageId, presetId);
      expect(retrieved).toBeNull();
    });

    it('プリセットのキャッシュを削除できる', () => {
      const imageId1 = 'test-image-1';
      const imageId2 = 'test-image-2';
      const presetId = 'test-preset';
      const url = 'data:image/jpeg;base64,test';
      const size = 1024;

      cacheManager.set(imageId1, presetId, url, size);
      cacheManager.set(imageId2, presetId, url, size);
      cacheManager.removePreset(presetId);

      expect(cacheManager.get(imageId1, presetId)).toBeNull();
      expect(cacheManager.get(imageId2, presetId)).toBeNull();
    });

    it('全キャッシュをクリアできる', () => {
      const imageId = 'test-image';
      const presetId = 'test-preset';
      const url = 'data:image/jpeg;base64,test';
      const size = 1024;

      cacheManager.set(imageId, presetId, url, size);
      cacheManager.clear();

      const retrieved = cacheManager.get(imageId, presetId);
      expect(retrieved).toBeNull();

      const stats = cacheManager.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.imageCount).toBe(0);
    });

    it('キャッシュ統計を正しく計算する', () => {
      const imageId1 = 'test-image-1';
      const imageId2 = 'test-image-2';
      const presetId1 = 'test-preset-1';
      const presetId2 = 'test-preset-2';
      const url = 'data:image/jpeg;base64,test';
      const size = 1024;

      cacheManager.set(imageId1, presetId1, url, size);
      cacheManager.set(imageId1, presetId2, url, size);
      cacheManager.set(imageId2, presetId1, url, size);

      const stats = cacheManager.getStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.totalSize).toBe(3072);
      expect(stats.imageCount).toBe(2);
    });

    it('既存のエントリを上書きする際にサイズを正しく更新する', () => {
      const imageId = 'test-image';
      const presetId = 'test-preset';
      const url1 = 'data:image/jpeg;base64,test1';
      const url2 = 'data:image/jpeg;base64,test2';
      const size1 = 1024;
      const size2 = 2048;

      cacheManager.set(imageId, presetId, url1, size1);
      cacheManager.set(imageId, presetId, url2, size2);

      const stats = cacheManager.getStats();
      expect(stats.totalSize).toBe(size2);
      expect(cacheManager.get(imageId, presetId)).toBe(url2);
    });
  });

  describe('calculatePreviewSize', () => {
    it('正方形の画像のサイズを正しく計算する', () => {
      const result = calculatePreviewSize(800, 800, 200);
      expect(result).toEqual({ width: 200, height: 200 });
    });

    it('横長の画像のサイズを正しく計算する', () => {
      const result = calculatePreviewSize(800, 400, 200);
      expect(result).toEqual({ width: 200, height: 100 });
    });

    it('縦長の画像のサイズを正しく計算する', () => {
      const result = calculatePreviewSize(400, 800, 200);
      expect(result).toEqual({ width: 100, height: 200 });
    });

    it('元の画像がプレビューサイズより小さい場合、元のサイズを維持する', () => {
      const result = calculatePreviewSize(100, 100, 200);
      expect(result).toEqual({ width: 100, height: 100 });
    });

    it('デフォルトの最大サイズを使用する', () => {
      const result = calculatePreviewSize(800, 800);
      expect(result.width).toBeLessThanOrEqual(PREVIEW_CONFIG.MAX_PREVIEW_SIZE);
      expect(result.height).toBeLessThanOrEqual(PREVIEW_CONFIG.MAX_PREVIEW_SIZE);
    });
  });

  describe('estimateDataUrlSize', () => {
    it('Data URLのサイズを推定する', () => {
      const dataUrl = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const estimatedSize = estimateDataUrlSize(dataUrl);
      
      // "Hello World"は11バイトなので、推定サイズは11に近い値になるはず
      expect(estimatedSize).toBeCloseTo(11, 0);
    });

    it('無効なData URLに対して0を返す', () => {
      const invalidDataUrl = 'invalid-data-url';
      const estimatedSize = estimateDataUrlSize(invalidDataUrl);
      expect(estimatedSize).toBe(0);
    });

    it('空のData URLに対して0を返す', () => {
      const emptyDataUrl = 'data:image/jpeg;base64,';
      const estimatedSize = estimateDataUrlSize(emptyDataUrl);
      expect(estimatedSize).toBe(0);
    });
  });

  describe('ProcessingSemaphore', () => {
    it('セマフォの取得と解放が正しく動作する', async () => {
      const semaphore = new ProcessingSemaphore(2);

      // 2つのセマフォを取得
      await semaphore.acquire();
      await semaphore.acquire();

      // 3つ目の取得は待機状態になる
      let thirdAcquired = false;
      const thirdPromise = semaphore.acquire().then(() => {
        thirdAcquired = true;
      });

      // 少し待っても3つ目は取得できない
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(thirdAcquired).toBe(false);

      // セマフォを1つ解放
      semaphore.release();

      // 3つ目が取得できるようになる
      await thirdPromise;
      expect(thirdAcquired).toBe(true);
    });

    it('複数の待機中のタスクを順番に処理する', async () => {
      const semaphore = new ProcessingSemaphore(1);
      const results: number[] = [];

      // セマフォを取得
      await semaphore.acquire();

      // 複数のタスクを待機状態にする
      const tasks = [1, 2, 3].map(async (id) => {
        await semaphore.acquire();
        results.push(id);
        semaphore.release();
      });

      // 最初のセマフォを解放
      semaphore.release();

      // 全てのタスクが完了するまで待機
      await Promise.all(tasks);

      // 順番に処理されることを確認
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('PREVIEW_CONFIG', () => {
    it('設定値が適切に定義されている', () => {
      expect(PREVIEW_CONFIG.MAX_PREVIEW_SIZE).toBeGreaterThan(0);
      expect(PREVIEW_CONFIG.JPEG_QUALITY).toBeGreaterThan(0);
      expect(PREVIEW_CONFIG.JPEG_QUALITY).toBeLessThanOrEqual(1);
      expect(PREVIEW_CONFIG.MAX_CONCURRENT_PROCESSING).toBeGreaterThan(0);
      expect(PREVIEW_CONFIG.MAX_CACHE_SIZE).toBeGreaterThan(0);
    });
  });
});