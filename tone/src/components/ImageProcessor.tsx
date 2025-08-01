'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FilterPreset } from '../types/filter';
import { 
  ProcessableImage, 
  ProcessedImage, 
  ProcessingProgress, 
  ProcessingError,
  BatchProcessingResult 
} from '../types/processing';
import { ImageProcessingWorkerPool } from '../workers/workerPool';
import { ProcessedImageResult } from '../workers/workerTypes';
import styles from './ImageProcessor.module.css';

/**
 * ImageProcessor コンポーネントのプロパティ
 * Requirements: 3.1, 3.2, 3.3, 8.3
 */
interface ImageProcessorProps {
  images: ProcessableImage[];
  selectedPreset: FilterPreset;
  onProcessingStart?: () => void;
  onProcessingProgress?: (progress: ProcessingProgress) => void;
  onProcessingComplete?: (result: BatchProcessingResult) => void;
  onProcessingError?: (error: string) => void;
}

/**
 * 一括処理機能とプログレス表示を提供するコンポーネント
 * Requirements: 3.1, 3.2, 3.3, 8.3
 */
export const ImageProcessor: React.FC<ImageProcessorProps> = ({
  images,
  selectedPreset,
  onProcessingStart,
  onProcessingProgress,
  onProcessingComplete,
  onProcessingError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    totalImages: 0,
    processedImages: 0,
    currentImage: null,
    progress: 0,
    errors: []
  });
  
  const workerPoolRef = useRef<ImageProcessingWorkerPool | null>(null);
  const startTimeRef = useRef<number>(0);
  const processedImagesRef = useRef<ProcessedImage[]>([]);
  const errorsRef = useRef<ProcessingError[]>([]);

  // Worker pool の初期化
  useEffect(() => {
    workerPoolRef.current = new ImageProcessingWorkerPool();
    
    return () => {
      if (workerPoolRef.current) {
        workerPoolRef.current.destroy();
      }
    };
  }, []);

  /**
   * 処理進行状況を更新
   */
  const updateProgress = useCallback((
    processedCount: number,
    currentImageName: string | null,
    errors: ProcessingError[] = []
  ) => {
    const totalImages = images.length;
    const progressPercentage = totalImages > 0 ? (processedCount / totalImages) * 100 : 0;
    
    // 推定残り時間を計算
    let estimatedTimeRemaining: number | undefined;
    if (processedCount > 0 && startTimeRef.current > 0) {
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      const averageTimePerImage = elapsedTime / processedCount;
      const remainingImages = totalImages - processedCount;
      estimatedTimeRemaining = Math.ceil(averageTimePerImage * remainingImages);
    }

    const newProgress: ProcessingProgress = {
      totalImages,
      processedImages: processedCount,
      currentImage: currentImageName,
      progress: progressPercentage,
      estimatedTimeRemaining,
      errors: [...errors]
    };

    setProgress(newProgress);
    onProcessingProgress?.(newProgress);
  }, [images.length, onProcessingProgress]);

  /**
   * 個別画像の処理
   */
  const processImage = useCallback(async (
    image: ProcessableImage,
    index: number
  ): Promise<ProcessedImage | null> => {
    if (!workerPoolRef.current) {
      throw new Error('Worker pool not initialized');
    }

    try {
      // 現在処理中の画像を更新
      updateProgress(index, image.file.name, errorsRef.current);

      const result: ProcessedImageResult = await workerPoolRef.current.processImage(
        image.file,
        selectedPreset.filters
      );

      // 処理済み画像のURLを生成
      const processedUrl = URL.createObjectURL(result.processedBlob);

      const processedImage: ProcessedImage = {
        id: image.id,
        originalImage: { ...image, status: 'completed' },
        processedUrl,
        processedBlob: result.processedBlob,
        appliedPreset: selectedPreset.id,
        processingTime: result.processingTime,
        fileSize: result.processedBlob.size
      };

      processedImagesRef.current.push(processedImage);
      return processedImage;

    } catch (error) {
      const processingError: ProcessingError = {
        imageId: image.id,
        imageName: image.file.name,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now()
      };

      errorsRef.current.push(processingError);
      console.error(`Failed to process image ${image.file.name}:`, error);
      return null;
    }
  }, [selectedPreset, updateProgress]);

  /**
   * 一括処理を開始
   */
  const startBatchProcessing = useCallback(async () => {
    if (!workerPoolRef.current || images.length === 0) {
      return;
    }

    setIsProcessing(true);
    startTimeRef.current = Date.now();
    processedImagesRef.current = [];
    errorsRef.current = [];
    
    onProcessingStart?.();

    try {
      // 並列処理で画像を処理
      const processingPromises = images.map((image, index) => 
        processImage(image, index)
      );

      // すべての処理が完了するまで待機（エラーがあっても継続）
      const results = await Promise.allSettled(processingPromises);
      
      // 最終的な進行状況を更新
      updateProgress(images.length, null, errorsRef.current);

      // 結果をまとめる
      const totalProcessingTime = Date.now() - startTimeRef.current;
      const batchResult: BatchProcessingResult = {
        processedImages: processedImagesRef.current,
        errors: errorsRef.current,
        totalProcessingTime,
        successCount: processedImagesRef.current.length,
        errorCount: errorsRef.current.length
      };

      onProcessingComplete?.(batchResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch processing failed';
      console.error('Batch processing error:', error);
      onProcessingError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [images, processImage, updateProgress, onProcessingStart, onProcessingComplete, onProcessingError]);

  /**
   * 処理をキャンセル
   */
  const cancelProcessing = useCallback(() => {
    if (workerPoolRef.current) {
      workerPoolRef.current.destroy();
      workerPoolRef.current = new ImageProcessingWorkerPool();
    }
    setIsProcessing(false);
    setProgress({
      totalImages: 0,
      processedImages: 0,
      currentImage: null,
      progress: 0,
      errors: []
    });
  }, []);

  return (
    <div 
      className={styles.imageProcessor}
      role="region"
      aria-labelledby="processor-title"
      aria-describedby="processor-description"
    >
      <div className={styles.header}>
        <h3 id="processor-title">画像処理</h3>
        <div className={styles.presetInfo}>
          <span className={styles.presetIcon} aria-hidden="true">{selectedPreset.icon}</span>
          <span className={styles.presetName}>{selectedPreset.name}</span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>対象画像:</span>
          <span className={styles.statValue}>{images.length}枚</span>
        </div>
        {isProcessing && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>処理済み:</span>
            <span className={styles.statValue}>
              {progress.processedImages}/{progress.totalImages}枚
            </span>
          </div>
        )}
      </div>

      {isProcessing && (
        <div 
          className={styles.progressSection}
          role="status"
          aria-live="polite"
          aria-label="処理進行状況"
        >
          <div 
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={Math.round(progress.progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`処理進行状況: ${Math.round(progress.progress)}%`}
          >
            <div 
              className={styles.progressFill}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {Math.round(progress.progress)}% 完了
          </div>
          
          {progress.currentImage && (
            <div 
              className={styles.currentImage}
              aria-live="polite"
            >
              処理中: {progress.currentImage}
            </div>
          )}
          
          {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
            <div className={styles.timeRemaining}>
              推定残り時間: {progress.estimatedTimeRemaining}秒
            </div>
          )}
        </div>
      )}

      {progress.errors.length > 0 && (
        <div 
          className={styles.errorSection}
          role="alert"
          aria-live="assertive"
        >
          <h4>処理エラー ({progress.errors.length}件)</h4>
          <div className={styles.errorList}>
            {progress.errors.map((error, index) => (
              <div key={index} className={styles.errorItem}>
                <span className={styles.errorImage}>{error.imageName}</span>
                <span className={styles.errorMessage}>{error.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.controls}>
        {!isProcessing ? (
          <button
            className={styles.startButton}
            onClick={startBatchProcessing}
            disabled={images.length === 0}
            aria-describedby="processor-description"
          >
            処理を開始
          </button>
        ) : (
          <button
            className={styles.cancelButton}
            onClick={cancelProcessing}
            aria-label="現在の画像処理をキャンセル"
          >
            処理をキャンセル
          </button>
        )}
      </div>
      
      <div id="processor-description" className="sr-only">
        {images.length}枚の画像に{selectedPreset.name}プリセットを適用して処理します
      </div>
    </div>
  );
};

export default ImageProcessor;