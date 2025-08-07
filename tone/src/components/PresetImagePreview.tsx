'use client';

import React, { useEffect, useRef, useState, useCallback, KeyboardEvent } from 'react';
import Image from 'next/image';
import { FilterPreset } from '../types/filter';
import { ProcessableImage } from '../types/processing';
import { applyFilters, loadImageToCanvas } from '../utils/imageFilters';
import { DEFAULT_BLUR_DATA_URL, getResponsiveImageSizes } from '../utils/imageOptimization';
import { 
  globalPreviewCache, 
  previewProcessingSemaphore, 
  calculatePreviewSize, 
  estimateDataUrlSize,
  PREVIEW_CONFIG,
  startMemoryMonitoring
} from '../utils/previewOptimization';
import styles from './PresetImagePreview.module.css';

interface PresetImagePreviewProps {
  uploadedImages: ProcessableImage[];
  selectedPreset: FilterPreset | null;
  className?: string;
}

/**
 * プリセット選択時の全画像リアルタイムプレビューコンポーネント
 * Requirements: 2.2, 8.1
 */
export const PresetImagePreview: React.FC<PresetImagePreviewProps> = ({
  uploadedImages,
  selectedPreset,
  className = ''
}) => {
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set());
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement }>({});
  const memoryMonitorRef = useRef<(() => void) | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // プレビュー画像を生成する関数
  const generatePreview = useCallback(async (
    image: ProcessableImage, 
    preset: FilterPreset
  ): Promise<string> => {
    // キャッシュから取得を試行
    const cachedUrl = globalPreviewCache.get(image.id, preset.id);
    if (cachedUrl) {
      return cachedUrl;
    }

    // セマフォを取得（並列処理数を制限）
    await previewProcessingSemaphore.acquire();

    try {
      // Canvas要素を作成または取得
      let canvas = canvasRefs.current[image.id];
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRefs.current[image.id] = canvas;
      }

      // 画像をCanvasに読み込み
      const originalCanvas = await loadImageToCanvas(image.file);
      
      // プレビュー用にサイズを計算（パフォーマンス最適化）
      const { width, height } = calculatePreviewSize(
        originalCanvas.width, 
        originalCanvas.height, 
        PREVIEW_CONFIG.MAX_PREVIEW_SIZE
      );
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context could not be obtained');
      }

      // リサイズして描画
      ctx.drawImage(originalCanvas, 0, 0, width, height);

      // フィルターを適用
      applyFilters(canvas, preset.filters);

      // Data URLを生成
      const previewUrl = canvas.toDataURL('image/jpeg', PREVIEW_CONFIG.JPEG_QUALITY);
      const urlSize = estimateDataUrlSize(previewUrl);

      // キャッシュに保存
      globalPreviewCache.set(image.id, preset.id, previewUrl, urlSize);

      return previewUrl;
    } catch (error) {
      console.error('Preview generation failed for image:', image.id, error);
      throw error;
    } finally {
      // セマフォを解放
      previewProcessingSemaphore.release();
    }
  }, []);

  // プリセット変更時に全画像のプレビューを生成
  useEffect(() => {
    if (!selectedPreset || uploadedImages.length === 0) {
      setPreviewUrls({});
      setProcessingImages(new Set());
      return;
    }

    const generateAllPreviews = async () => {
      const newProcessingImages = new Set<string>();
      const newPreviewUrls: { [key: string]: string } = {};
      
      // 既にキャッシュされている画像をチェック
      for (const image of uploadedImages) {
        const cachedUrl = globalPreviewCache.get(image.id, selectedPreset.id);
        if (cachedUrl) {
          newPreviewUrls[image.id] = cachedUrl;
        } else {
          newProcessingImages.add(image.id);
        }
      }

      // 状態を一度に更新
      setPreviewUrls(newPreviewUrls);
      setProcessingImages(newProcessingImages);

      // 処理が必要な画像がない場合は終了
      if (newProcessingImages.size === 0) {
        return;
      }

      // 並列処理でプレビューを生成
      const previewPromises = uploadedImages
        .filter(image => newProcessingImages.has(image.id))
        .map(async (image) => {
          try {
            const previewUrl = await generatePreview(image, selectedPreset);
            
            // プレビューURLを状態に追加
            setPreviewUrls(prev => ({
              ...prev,
              [image.id]: previewUrl
            }));
            
            return { imageId: image.id, success: true };
          } catch (error) {
            console.error(`Failed to generate preview for ${image.id}:`, error);
            return { imageId: image.id, success: false };
          } finally {
            setProcessingImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(image.id);
              return newSet;
            });
          }
        });

      await Promise.all(previewPromises);
    };

    generateAllPreviews();
  }, [selectedPreset, uploadedImages, generatePreview]);

  // 画像拡大機能
  const handleImageClick = useCallback((imageId: string) => {
    setExpandedImage(imageId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setExpandedImage(null);
  }, []);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCloseModal();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (expandedImage) {
        event.preventDefault();
        const currentIndex = uploadedImages.findIndex(img => img.id === expandedImage);
        let nextIndex;
        
        if (event.key === 'ArrowLeft') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : uploadedImages.length - 1;
        } else {
          nextIndex = currentIndex < uploadedImages.length - 1 ? currentIndex + 1 : 0;
        }
        
        setExpandedImage(uploadedImages[nextIndex].id);
        
        // スクリーンリーダー用のアナウンス
        const nextImage = uploadedImages[nextIndex];
        const announcement = `${nextIndex + 1}番目の画像: ${nextImage.metadata.name}`;
        // aria-live領域に通知
        const liveRegion = document.getElementById('modal-live-region');
        if (liveRegion) {
          liveRegion.textContent = announcement;
        }
      }
    } else if (event.key === 'Home' && expandedImage) {
      event.preventDefault();
      setExpandedImage(uploadedImages[0].id);
    } else if (event.key === 'End' && expandedImage) {
      event.preventDefault();
      setExpandedImage(uploadedImages[uploadedImages.length - 1].id);
    }
  }, [expandedImage, uploadedImages, handleCloseModal]);

  // モーダル外クリックでの閉じる処理
  const handleModalClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleCloseModal();
    }
  }, [handleCloseModal]);

  // ホバー効果の処理
  const handleImageHover = useCallback((imageId: string | null) => {
    setHoveredImage(imageId);
  }, []);

  // タッチデバイス用のインタラクション処理
  const handleTouchStart = useCallback((imageId: string) => {
    setHoveredImage(imageId);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // タッチ終了時に少し遅延してホバー状態を解除
    setTimeout(() => setHoveredImage(null), 300);
  }, []);

  // モーダルのフォーカス管理
  useEffect(() => {
    if (expandedImage && modalRef.current) {
      // モーダルが開いたときにフォーカスを設定
      modalRef.current.focus();
      
      // 背景のスクロールを無効化
      document.body.style.overflow = 'hidden';
      
      return () => {
        // モーダルが閉じたときに背景のスクロールを復元
        document.body.style.overflow = 'unset';
      };
    }
  }, [expandedImage]);

  // メモリ監視の開始
  useEffect(() => {
    memoryMonitorRef.current = startMemoryMonitoring(30000); // 30秒間隔
    
    return () => {
      if (memoryMonitorRef.current) {
        memoryMonitorRef.current();
      }
    };
  }, []);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      // Canvas要素をクリーンアップ
      Object.values(canvasRefs.current).forEach(canvas => {
        canvas.remove();
      });
      canvasRefs.current = {};
    };
  }, []);

  if (!selectedPreset) {
    return (
      <div className={`${styles.presetImagePreview} ${className}`}>
        <div className={styles.placeholder}>
          <p>プリセットを選択すると、全ての画像のプレビューが表示されます</p>
        </div>
      </div>
    );
  }

  if (uploadedImages.length === 0) {
    return (
      <div className={`${styles.presetImagePreview} ${className}`}>
        <div className={styles.placeholder}>
          <p>画像をアップロードしてください</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.presetImagePreview} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon} aria-hidden="true">
            {selectedPreset.icon}
          </span>
          {selectedPreset.name} - プレビュー
        </h3>
        <p className={styles.description}>
          {uploadedImages.length}枚の画像に「{selectedPreset.name}」を適用した結果
        </p>
        

      </div>

      <div 
        className={styles.imageGrid} 
        role="grid" 
        aria-label="画像プレビューグリッド"
        aria-rowcount={Math.ceil(uploadedImages.length / 2)}
        aria-colcount={2}
      >
        {uploadedImages.map((image, index) => {
          const isProcessing = processingImages.has(image.id);
          const previewUrl = previewUrls[image.id];
          const isHovered = hoveredImage === image.id;

          return (
            <div 
              key={image.id} 
              className={`${styles.imageItem} ${isHovered ? styles.hovered : ''}`}
              role="gridcell"
              aria-rowindex={Math.floor(index / 2) + 1}
              aria-colindex={(index % 2) + 1}
            >
              <div className={styles.imageComparison}>
                {/* 処理前 */}
                <div className={styles.beforeImage}>
                  <div className={styles.imageLabel}>処理前</div>
                  <div 
                    className={styles.imageWrapper}
                    onMouseEnter={() => handleImageHover(image.id)}
                    onMouseLeave={() => handleImageHover(null)}
                    onTouchStart={() => handleTouchStart(image.id)}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => handleImageClick(image.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleImageClick(image.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${image.metadata.name}の処理前画像を拡大表示`}
                    aria-describedby={`image-${image.id}-description`}
                  >
                    <Image
                      src={image.originalUrl}
                      alt={`${image.metadata.name} - 処理前`}
                      width={150}
                      height={150}
                      className={`${styles.image} ${styles.clickableImage}`}
                      priority={false}
                      placeholder="blur"
                      blurDataURL={DEFAULT_BLUR_DATA_URL}
                      sizes={getResponsiveImageSizes('thumbnail')}
                    />
                    {isHovered && (
                      <div className={styles.hoverOverlay}>
                        <span className={styles.expandIcon} aria-hidden="true">🔍</span>
                        <span className={styles.expandText}>クリックで拡大</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 矢印 */}
                <div className={styles.arrow} aria-hidden="true">
                  →
                </div>

                {/* 処理後 */}
                <div className={styles.afterImage}>
                  <div className={styles.imageLabel}>処理後</div>
                  <div className={styles.previewContainer}>
                    {isProcessing ? (
                      <div className={styles.loading} role="status" aria-live="polite">
                        <div className={styles.spinner} />
                        <span className={styles.loadingText}>処理中...</span>
                      </div>
                    ) : previewUrl ? (
                      <div 
                        className={styles.imageWrapper}
                        onMouseEnter={() => handleImageHover(image.id)}
                        onMouseLeave={() => handleImageHover(null)}
                        onTouchStart={() => handleTouchStart(image.id)}
                        onTouchEnd={handleTouchEnd}
                        onClick={() => handleImageClick(image.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleImageClick(image.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${image.metadata.name}の${selectedPreset.name}適用後画像を拡大表示`}
                        aria-describedby={`image-${image.id}-description`}
                      >
                        <Image
                          src={previewUrl}
                          alt={`${image.metadata.name} - ${selectedPreset.name}適用後`}
                          width={150}
                          height={150}
                          className={`${styles.image} ${styles.clickableImage}`}
                          priority={false}
                          placeholder="blur"
                          blurDataURL={DEFAULT_BLUR_DATA_URL}
                          sizes={getResponsiveImageSizes('thumbnail')}
                        />
                        {isHovered && (
                          <div className={styles.hoverOverlay}>
                            <span className={styles.expandIcon} aria-hidden="true">🔍</span>
                            <span className={styles.expandText}>クリックで拡大</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.error} role="alert">
                        <span>プレビュー生成に失敗しました</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div 
                className={styles.imageName} 
                title={image.metadata.name}
                id={`image-${image.id}-description`}
              >
                {image.metadata.name.length > 20 
                  ? `${image.metadata.name.substring(0, 20)}...` 
                  : image.metadata.name
                }
              </div>
              
              {/* スクリーンリーダー用の追加情報 */}
              <div className={styles.srOnly}>
                画像サイズ: {image.metadata.width} × {image.metadata.height}ピクセル, 
                ファイルサイズ: {Math.round(image.metadata.size / 1024)}KB
              </div>
            </div>
          );
        })}
      </div>

      {/* 拡大表示モーダル */}
      {expandedImage && (
        <div 
          className={styles.modal}
          onClick={handleModalClick}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          ref={modalRef}
        >
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 id="modal-title" className={styles.modalTitle}>
                {uploadedImages.find(img => img.id === expandedImage)?.metadata.name}
                <span className={styles.srOnly}>
                  - {uploadedImages.findIndex(img => img.id === expandedImage) + 1}番目の画像、
                  全{uploadedImages.length}枚中
                </span>
              </h3>
              <button
                className={styles.closeButton}
                onClick={handleCloseModal}
                aria-label="拡大表示を閉じる（Escキーでも閉じられます）"
                type="button"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.expandedComparison}>
                {/* 処理前の拡大画像 */}
                <div className={styles.expandedBefore}>
                  <h4 className={styles.expandedLabel}>処理前</h4>
                  <Image
                    src={uploadedImages.find(img => img.id === expandedImage)?.originalUrl || ''}
                    alt={`${uploadedImages.find(img => img.id === expandedImage)?.metadata.name} - 処理前（拡大）`}
                    width={400}
                    height={400}
                    className={styles.expandedImage}
                    priority={true}
                    placeholder="blur"
                    blurDataURL={DEFAULT_BLUR_DATA_URL}
                    sizes="(max-width: 768px) 90vw, 400px"
                  />
                </div>

                {/* 処理後の拡大画像 */}
                <div className={styles.expandedAfter}>
                  <h4 className={styles.expandedLabel}>
                    処理後 - {selectedPreset.name}
                  </h4>
                  {previewUrls[expandedImage] ? (
                    <Image
                      src={previewUrls[expandedImage]}
                      alt={`${uploadedImages.find(img => img.id === expandedImage)?.metadata.name} - ${selectedPreset.name}適用後（拡大）`}
                      width={400}
                      height={400}
                      className={styles.expandedImage}
                      priority={true}
                      placeholder="blur"
                      blurDataURL={DEFAULT_BLUR_DATA_URL}
                      sizes="(max-width: 768px) 90vw, 400px"
                    />
                  ) : (
                    <div className={styles.expandedPlaceholder}>
                      <span>プレビューを生成中...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ナビゲーション */}
              {uploadedImages.length > 1 && (
                <div className={styles.modalNavigation}>
                  <button
                    className={styles.navButton}
                    onClick={() => {
                      const currentIndex = uploadedImages.findIndex(img => img.id === expandedImage);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : uploadedImages.length - 1;
                      setExpandedImage(uploadedImages[prevIndex].id);
                    }}
                    aria-label="前の画像"
                    type="button"
                  >
                    ← 前
                  </button>
                  <span className={styles.imageCounter}>
                    {uploadedImages.findIndex(img => img.id === expandedImage) + 1} / {uploadedImages.length}
                  </span>
                  <button
                    className={styles.navButton}
                    onClick={() => {
                      const currentIndex = uploadedImages.findIndex(img => img.id === expandedImage);
                      const nextIndex = currentIndex < uploadedImages.length - 1 ? currentIndex + 1 : 0;
                      setExpandedImage(uploadedImages[nextIndex].id);
                    }}
                    aria-label="次の画像"
                    type="button"
                  >
                    次 →
                  </button>
                </div>
              )}

              <div className={styles.modalInstructions}>
                <p>
                  キーボード操作: 矢印キー（←→）で画像切り替え、Homeキーで最初の画像、
                  Endキーで最後の画像、Escキーで閉じる
                </p>
              </div>
              
              {/* スクリーンリーダー用のライブリージョン */}
              <div 
                id="modal-live-region" 
                aria-live="polite" 
                aria-atomic="true"
                className={styles.srOnly}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetImagePreview;