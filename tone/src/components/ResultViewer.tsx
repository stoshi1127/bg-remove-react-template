import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { ProcessableImage, ProcessedImage } from '../types/processing';
import { useDownload } from '../hooks/useDownload';
import dynamic from 'next/dynamic';

// Lazy load RecommendedServices for better performance
const RecommendedServices = dynamic(() => import('./RecommendedServices'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />,
  ssr: false
});
import { DEFAULT_BLUR_DATA_URL, getResponsiveImageSizes } from '../utils/imageOptimization';
import styles from './ResultViewer.module.css';

/**
 * ResultViewerコンポーネントのProps
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2
 */
export interface ResultViewerProps {
  originalImages: ProcessableImage[];
  processedImages: ProcessedImage[];
  onDownloadSingle?: (imageId: string) => void;
  onDownloadAll?: () => void;
}

/**
 * 拡大プレビューの状態
 */
interface PreviewState {
  isOpen: boolean;
  imageId: string | null;
  showOriginal: boolean;
  currentIndex: number;
}

/**
 * ResultViewer - 処理前後の比較表示コンポーネント
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2
 */
const ResultViewer: React.FC<ResultViewerProps> = ({
  originalImages,
  processedImages,
  onDownloadSingle,
  onDownloadAll
}) => {
  // ダウンロード機能のフック
  const {
    isDownloading,
    downloadType,
    progress,
    error: downloadError,
    downloadSingle,
    downloadAll,
    clearError
  } = useDownload();
  const [previewState, setPreviewState] = useState<PreviewState>({
    isOpen: false,
    imageId: null,
    showOriginal: false,
    currentIndex: 0
  });

  /**
   * 拡大プレビューを開く
   * Requirements: 4.2
   */
  const openPreview = useCallback((imageId: string) => {
    const index = processedImages.findIndex(img => img.id === imageId);
    setPreviewState({
      isOpen: true,
      imageId,
      showOriginal: false,
      currentIndex: index >= 0 ? index : 0
    });
  }, [processedImages]);

  /**
   * 拡大プレビューを閉じる
   */
  const closePreview = useCallback(() => {
    setPreviewState({
      isOpen: false,
      imageId: null,
      showOriginal: false,
      currentIndex: 0
    });
  }, []);

  /**
   * プレビューでの表示切り替え
   */
  const togglePreviewImage = useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      showOriginal: !prev.showOriginal
    }));
  }, []);

  /**
   * 前の画像に移動
   * Requirements: 4.1, 4.2
   */
  const goToPreviousImage = useCallback(() => {
    if (processedImages.length === 0) return;
    
    setPreviewState(prev => {
      const newIndex = prev.currentIndex > 0 ? prev.currentIndex - 1 : processedImages.length - 1;
      const newImageId = processedImages[newIndex]?.id || null;
      return {
        ...prev,
        currentIndex: newIndex,
        imageId: newImageId,
        showOriginal: false // Reset to processed image when navigating
      };
    });
  }, [processedImages]);

  /**
   * 次の画像に移動
   * Requirements: 4.1, 4.2
   */
  const goToNextImage = useCallback(() => {
    if (processedImages.length === 0) return;
    
    setPreviewState(prev => {
      const newIndex = prev.currentIndex < processedImages.length - 1 ? prev.currentIndex + 1 : 0;
      const newImageId = processedImages[newIndex]?.id || null;
      return {
        ...prev,
        currentIndex: newIndex,
        imageId: newImageId,
        showOriginal: false // Reset to processed image when navigating
      };
    });
  }, [processedImages]);

  /**
   * キーボードナビゲーション
   * Requirements: 4.1, 4.2
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!previewState.isOpen) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        goToPreviousImage();
        break;
      case 'ArrowRight':
        event.preventDefault();
        goToNextImage();
        break;
      case 'Escape':
        event.preventDefault();
        closePreview();
        break;
      case ' ':
        event.preventDefault();
        togglePreviewImage();
        break;
    }
  }, [previewState.isOpen, goToPreviousImage, goToNextImage, closePreview, togglePreviewImage]);

  // キーボードイベントリスナーの設定
  React.useEffect(() => {
    if (previewState.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [previewState.isOpen, handleKeyDown]);

  /**
   * 個別ダウンロード
   * Requirements: 5.1, 5.3
   */
  const handleDownloadSingle = useCallback(async (imageId: string) => {
    const processedImage = processedImages.find(img => img.id === imageId);
    if (!processedImage) return;

    try {
      await downloadSingle(processedImage);
      // 外部のコールバックも呼び出す（互換性のため）
      onDownloadSingle?.(imageId);
    } catch (error) {
      console.error('個別ダウンロードエラー:', error);
    }
  }, [processedImages, downloadSingle, onDownloadSingle]);

  /**
   * 一括ダウンロード
   * Requirements: 5.2, 5.4
   */
  const handleDownloadAll = useCallback(async () => {
    if (processedImages.length === 0) return;

    try {
      await downloadAll(processedImages);
      // 外部のコールバックも呼び出す（互換性のため）
      onDownloadAll?.();
    } catch (error) {
      console.error('一括ダウンロードエラー:', error);
    }
  }, [processedImages, downloadAll, onDownloadAll]);

  // プレビュー用の画像データを取得
  const getPreviewImage = useCallback(() => {
    if (!previewState.imageId) return null;
    
    const processedImage = processedImages.find(img => img.id === previewState.imageId);
    const originalImage = originalImages.find(img => img.id === previewState.imageId);
    
    return { processedImage, originalImage };
  }, [previewState.imageId, processedImages, originalImages]);

  const previewImage = getPreviewImage();

  return (
    <div className={styles.container}>
      {/* ダウンロードエラー表示 */}
      {downloadError && (
        <div className={styles.errorBanner}>
          <span className={styles.errorMessage}>{downloadError}</span>
          <button
            className={styles.errorCloseButton}
            onClick={clearError}
            type="button"
            aria-label="エラーを閉じる"
          >
            ×
          </button>
        </div>
      )}

      {/* ダウンロード進行状況 */}
      {isDownloading && downloadType === 'batch' && progress && (
        <div className={styles.progressBanner}>
          <div className={styles.progressInfo}>
            <span>ZIPファイルを作成中... ({progress.current}/{progress.total})</span>
            <span className={styles.progressFileName}>{progress.fileName}</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <span className={styles.progressPercent}>{progress.progress}%</span>
        </div>
      )}

      {/* ヘッダー */}
      <div className={styles.header}>
        <h2 id="results-title" className={styles.title}>処理結果</h2>
        <div className={styles.actions}>
          <span 
            className={styles.count}
            role="status"
            aria-live="polite"
          >
            {processedImages.length}枚の画像を処理しました
          </span>
          {processedImages.length > 0 && (
            <button
              className={styles.downloadAllButton}
              onClick={handleDownloadAll}
              disabled={isDownloading}
              type="button"
              aria-describedby="download-all-description"
            >
              {isDownloading && downloadType === 'batch' ? 'ダウンロード中...' : 'すべてダウンロード'}
              <span id="download-all-description" className="sr-only">
                処理済みの全ての画像をZIPファイルでダウンロード
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 画像一覧 */}
      <div 
        className={styles.imageGrid}
        role="grid"
        aria-labelledby="results-title"
      >
        {processedImages.map((processedImage, index) => {
          const originalImage = originalImages.find(img => img.id === processedImage.id);
          if (!originalImage) return null;

          return (
            <div 
              key={processedImage.id} 
              className={styles.imageCard}
              role="gridcell"
              aria-label={`画像 ${index + 1}: ${originalImage.file.name}`}
            >
              {/* Before/After比較表示 */}
              <div className={styles.comparison}>
                <div className={styles.imageContainer}>
                  <div className={styles.imageLabel} aria-hidden="true">処理前</div>
                  <Image
                    src={originalImage.originalUrl}
                    alt={`処理前: ${originalImage.file.name}`}
                    width={400}
                    height={300}
                    className={styles.image}
                    onClick={() => openPreview(processedImage.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPreview(processedImage.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`処理前の画像を拡大表示: ${originalImage.file.name}`}
                    priority={false}
                    placeholder="blur"
                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                    sizes={getResponsiveImageSizes('preview')}
                  />
                </div>
                <div className={styles.imageContainer}>
                  <div className={styles.imageLabel} aria-hidden="true">処理後</div>
                  <Image
                    src={processedImage.processedUrl}
                    alt={`処理後: ${originalImage.file.name}`}
                    width={400}
                    height={300}
                    className={styles.image}
                    onClick={() => openPreview(processedImage.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPreview(processedImage.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`処理後の画像を拡大表示: ${originalImage.file.name}`}
                    priority={false}
                    placeholder="blur"
                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                    sizes={getResponsiveImageSizes('preview')}
                  />
                </div>
              </div>

              {/* 画像情報 */}
              <div className={styles.imageInfo}>
                <div className={styles.fileName}>{originalImage.file.name}</div>
                <div className={styles.presetName}>
                  適用プリセット: {processedImage.appliedPreset}
                </div>
                <div className={styles.metadata}>
                  処理時間: {processedImage.processingTime}ms | 
                  ファイルサイズ: {Math.round(processedImage.fileSize / 1024)}KB
                </div>
              </div>

              {/* アクション */}
              <div className={styles.imageActions}>
                <button
                  className={styles.previewButton}
                  onClick={() => openPreview(processedImage.id)}
                  type="button"
                  aria-label={`${originalImage.file.name}を拡大表示`}
                >
                  拡大表示
                </button>
                <button
                  className={styles.downloadButton}
                  onClick={() => handleDownloadSingle(processedImage.id)}
                  disabled={isDownloading && downloadType === 'single'}
                  type="button"
                  aria-label={`${originalImage.file.name}をダウンロード`}
                >
                  {isDownloading && downloadType === 'single' ? 'ダウンロード中...' : 'ダウンロード'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 拡大プレビューモーダル */}
      {previewState.isOpen && previewImage && (
        <div 
          className={styles.modal} 
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div 
            className={styles.modalContent} 
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleSection}>
                <h3 id="modal-title" className={styles.modalTitle}>
                  {previewImage.originalImage?.file.name}
                </h3>
                <div 
                  id="modal-description"
                  className={styles.imageCounter}
                  aria-live="polite"
                >
                  {previewState.currentIndex + 1} / {processedImages.length}
                </div>
                <div className={styles.presetInfo}>
                  適用プリセット: {previewImage.processedImage?.appliedPreset}
                </div>
              </div>
              <button
                className={styles.closeButton}
                onClick={closePreview}
                type="button"
                aria-label="プレビューモーダルを閉じる"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* ナビゲーションコントロール */}
              {processedImages.length > 1 && (
                <div className={styles.navigationControls}>
                  <button
                    className={styles.navButton}
                    onClick={goToPreviousImage}
                    type="button"
                    aria-label="前の画像"
                    disabled={processedImages.length <= 1}
                  >
                    ‹
                  </button>
                  <button
                    className={styles.navButton}
                    onClick={goToNextImage}
                    type="button"
                    aria-label="次の画像"
                    disabled={processedImages.length <= 1}
                  >
                    ›
                  </button>
                </div>
              )}

              {/* 表示切り替えボタン */}
              <div className={styles.toggleButtons}>
                <button
                  className={`${styles.toggleButton} ${!previewState.showOriginal ? styles.active : ''}`}
                  onClick={() => setPreviewState(prev => ({ ...prev, showOriginal: false }))}
                  type="button"
                >
                  処理後
                </button>
                <button
                  className={`${styles.toggleButton} ${previewState.showOriginal ? styles.active : ''}`}
                  onClick={() => setPreviewState(prev => ({ ...prev, showOriginal: true }))}
                  type="button"
                >
                  処理前
                </button>
              </div>

              {/* 拡大画像表示 */}
              <div className={styles.previewImageContainer}>
                {/* 左側ナビゲーション */}
                {processedImages.length > 1 && (
                  <button
                    className={`${styles.imageNavButton} ${styles.prevButton}`}
                    onClick={goToPreviousImage}
                    type="button"
                    aria-label="前の画像"
                  >
                    ‹
                  </button>
                )}

                <Image
                  src={(previewState.showOriginal 
                    ? previewImage.originalImage?.originalUrl 
                    : previewImage.processedImage?.processedUrl) || ''}
                  alt={previewState.showOriginal ? '処理前の画像' : '処理後の画像'}
                  width={800}
                  height={600}
                  className={styles.previewImage}
                  priority={true}
                  placeholder="blur"
                  blurDataURL={DEFAULT_BLUR_DATA_URL}
                  sizes={getResponsiveImageSizes('fullsize')}
                />

                {/* 右側ナビゲーション */}
                {processedImages.length > 1 && (
                  <button
                    className={`${styles.imageNavButton} ${styles.nextButton}`}
                    onClick={goToNextImage}
                    type="button"
                    aria-label="次の画像"
                  >
                    ›
                  </button>
                )}
              </div>

              {/* 画像情報 */}
              <div className={styles.previewInfo}>
                <div className={styles.previewMetadata}>
                  <span>処理時間: {previewImage.processedImage?.processingTime}ms</span>
                  <span>ファイルサイズ: {Math.round((previewImage.processedImage?.fileSize || 0) / 1024)}KB</span>
                  <span>元画像サイズ: {Math.round((previewImage.originalImage?.file.size || 0) / 1024)}KB</span>
                </div>
              </div>

              {/* キーボードショートカットヒント */}
              <div className={styles.keyboardHints}>
                <span>← → : 画像切り替え</span>
                <span>Space : 処理前後切り替え</span>
                <span>Esc : 閉じる</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.toggleViewButton}
                onClick={togglePreviewImage}
                type="button"
              >
                {previewState.showOriginal ? '処理後を表示' : '処理前を表示'}
              </button>
              {previewImage.processedImage && (
                <button
                  className={styles.downloadButton}
                  onClick={() => handleDownloadSingle(previewImage.processedImage!.id)}
                  disabled={isDownloading && downloadType === 'single'}
                  type="button"
                >
                  {isDownloading && downloadType === 'single' ? 'ダウンロード中...' : 'ダウンロード'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 結果が空の場合 */}
      {processedImages.length === 0 && (
        <div className={styles.emptyState}>
          <p>処理済みの画像がありません</p>
        </div>
      )}

      {/* 推奨サービス */}
      {processedImages.length > 0 && (
        <RecommendedServices />
      )}
    </div>
  );
};

export default ResultViewer;