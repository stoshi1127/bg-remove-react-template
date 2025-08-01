import { renderHook, act } from '@testing-library/react';
import { useDownload, getDownloadStats } from '../useDownload';
import { ProcessedImage, ProcessableImage } from '../../types/processing';
import * as downloadUtils from '../../utils/downloadUtils';

// downloadUtilsのモック
jest.mock('../../utils/downloadUtils', () => ({
  downloadSingleImage: jest.fn(),
  downloadAllImagesAsZipWithProgress: jest.fn(),
  canDownload: jest.fn().mockReturnValue(true),
  checkFileSizeLimit: jest.fn().mockReturnValue(true)
}));

const mockDownloadUtils = downloadUtils as jest.Mocked<typeof downloadUtils>;

// テスト用のモックデータ
const createMockProcessableImage = (id: string, fileName: string): ProcessableImage => ({
  id,
  file: new File(['mock content'], fileName, { type: 'image/jpeg' }),
  originalUrl: `blob:original-${id}`,
  metadata: {
    width: 800,
    height: 600,
    fileSize: 1024,
    format: 'jpeg',
    lastModified: Date.now()
  },
  status: 'completed'
});

const createMockProcessedImage = (id: string, fileName: string, preset: string): ProcessedImage => ({
  id,
  originalImage: createMockProcessableImage(id, fileName),
  processedUrl: `blob:processed-${id}`,
  processedBlob: new Blob(['processed content'], { type: 'image/jpeg' }),
  appliedPreset: preset,
  processingTime: 1000,
  fileSize: 2048
});

describe('useDownload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDownloadUtils.canDownload.mockReturnValue(true);
    mockDownloadUtils.checkFileSizeLimit.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useDownload());

      expect(result.current.isDownloading).toBe(false);
      expect(result.current.downloadType).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('downloadSingle', () => {
    it('should download single image successfully', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImage = createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと');

      mockDownloadUtils.downloadSingleImage.mockResolvedValue();

      await act(async () => {
        await result.current.downloadSingle(processedImage);
      });

      expect(mockDownloadUtils.downloadSingleImage).toHaveBeenCalledWith(processedImage);
      expect(result.current.isDownloading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle download error', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImage = createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと');
      const errorMessage = 'Download failed';

      mockDownloadUtils.downloadSingleImage.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await result.current.downloadSingle(processedImage);
      });

      expect(result.current.isDownloading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle unsupported download', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImage = createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと');

      mockDownloadUtils.canDownload.mockReturnValue(false);

      await act(async () => {
        await result.current.downloadSingle(processedImage);
      });

      expect(result.current.error).toBe('ダウンロード機能がサポートされていません');
      expect(mockDownloadUtils.downloadSingleImage).not.toHaveBeenCalled();
    });

    it('should set downloading state during download', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImage = createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと');

      let resolveDownload: () => void;
      const downloadPromise = new Promise<void>((resolve) => {
        resolveDownload = resolve;
      });
      mockDownloadUtils.downloadSingleImage.mockReturnValue(downloadPromise);

      // ダウンロード開始
      act(() => {
        result.current.downloadSingle(processedImage);
      });

      // ダウンロード中の状態をチェック
      expect(result.current.isDownloading).toBe(true);
      expect(result.current.downloadType).toBe('single');

      // ダウンロード完了
      await act(async () => {
        resolveDownload!();
        await downloadPromise;
      });

      expect(result.current.isDownloading).toBe(false);
      expect(result.current.downloadType).toBe(null);
    });
  });

  describe('downloadAll', () => {
    it('should download all images as zip successfully', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImages = [
        createMockProcessedImage('1', 'photo1.jpg', '商品をくっきりと'),
        createMockProcessedImage('2', 'photo2.jpg', '明るくクリアに')
      ];

      mockDownloadUtils.downloadAllImagesAsZipWithProgress.mockImplementation(
        async (images, onProgress) => {
          onProgress?.({
            current: 1,
            total: 2,
            fileName: 'photo1.jpg',
            progress: 50
          });
          onProgress?.({
            current: 2,
            total: 2,
            fileName: 'photo2.jpg',
            progress: 100
          });
        }
      );

      await act(async () => {
        await result.current.downloadAll(processedImages);
      });

      expect(mockDownloadUtils.downloadAllImagesAsZipWithProgress).toHaveBeenCalledWith(
        processedImages,
        expect.any(Function),
        undefined
      );
      expect(result.current.isDownloading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle empty images array', async () => {
      const { result } = renderHook(() => useDownload());

      await act(async () => {
        await result.current.downloadAll([]);
      });

      expect(result.current.error).toBe('ダウンロードする画像がありません');
      expect(mockDownloadUtils.downloadAllImagesAsZipWithProgress).not.toHaveBeenCalled();
    });

    it('should handle file size limit exceeded', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImages = [createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと')];

      mockDownloadUtils.checkFileSizeLimit.mockReturnValue(false);

      await act(async () => {
        await result.current.downloadAll(processedImages);
      });

      expect(result.current.error).toBe('ファイルサイズが大きすぎます（100MB以下にしてください）');
      expect(mockDownloadUtils.downloadAllImagesAsZipWithProgress).not.toHaveBeenCalled();
    });

    it('should handle download error', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImages = [createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと')];
      const errorMessage = 'ZIP creation failed';

      mockDownloadUtils.downloadAllImagesAsZipWithProgress.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await result.current.downloadAll(processedImages);
      });

      expect(result.current.isDownloading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should update progress during download', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImages = [createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと')];

      let progressCallback: ((progress: any) => void) | undefined;
      mockDownloadUtils.downloadAllImagesAsZipWithProgress.mockImplementation(
        async (images, onProgress) => {
          progressCallback = onProgress;
          return new Promise(() => {}); // Never resolve to keep downloading state
        }
      );

      // ダウンロード開始
      act(() => {
        result.current.downloadAll(processedImages);
      });

      expect(result.current.isDownloading).toBe(true);
      expect(result.current.downloadType).toBe('batch');

      // 進行状況更新
      const mockProgress = {
        current: 1,
        total: 2,
        fileName: 'photo.jpg',
        progress: 50
      };

      act(() => {
        progressCallback?.(mockProgress);
      });

      expect(result.current.progress).toEqual(mockProgress);
    });

    it('should use custom zip filename', async () => {
      const { result } = renderHook(() => useDownload());
      const processedImages = [createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと')];
      const customFileName = 'custom.zip';

      mockDownloadUtils.downloadAllImagesAsZipWithProgress.mockResolvedValue();

      await act(async () => {
        await result.current.downloadAll(processedImages, customFileName);
      });

      expect(mockDownloadUtils.downloadAllImagesAsZipWithProgress).toHaveBeenCalledWith(
        processedImages,
        expect.any(Function),
        customFileName
      );
    });
  });

  describe('clearError', () => {
    it('should clear error', async () => {
      const { result } = renderHook(() => useDownload());

      // エラーを設定
      mockDownloadUtils.canDownload.mockReturnValue(false);
      await act(async () => {
        await result.current.downloadSingle(createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと'));
      });

      expect(result.current.error).toBeTruthy();

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('cancelDownload', () => {
    it('should cancel download', () => {
      const { result } = renderHook(() => useDownload());

      // ダウンロード状態を設定
      act(() => {
        result.current.downloadAll([createMockProcessedImage('1', 'photo.jpg', '商品をくっきりと')]);
      });

      expect(result.current.isDownloading).toBe(true);

      // キャンセル
      act(() => {
        result.current.cancelDownload();
      });

      expect(result.current.isDownloading).toBe(false);
      expect(result.current.downloadType).toBe(null);
      expect(result.current.progress).toBe(null);
    });
  });
});

describe('getDownloadStats', () => {
  it('should calculate correct stats', () => {
    const processedImages = [
      createMockProcessedImage('1', 'photo1.jpg', '商品をくっきりと'),
      createMockProcessedImage('2', 'photo2.jpg', '明るくクリアに')
    ];

    // Each image has fileSize: 2048 bytes
    const stats = getDownloadStats(processedImages);

    expect(stats.imageCount).toBe(2);
    expect(stats.totalSize).toBe(4096); // 2048 * 2
    expect(stats.totalSizeMB).toBe(0); // Rounded down from 0.0039...
    expect(stats.averageSize).toBe(2048);
    expect(stats.canDownload).toBe(true);
    expect(stats.withinSizeLimit).toBe(true);
  });

  it('should handle empty array', () => {
    const stats = getDownloadStats([]);

    expect(stats.imageCount).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.totalSizeMB).toBe(0);
    expect(stats.averageSize).toBe(0);
  });
});