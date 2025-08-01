import { useState, useCallback, useRef } from 'react';
import { 
  ProcessableImage, 
  ProcessedImage, 
  BatchProcessingResult,
  ProcessingProgress,
  ProcessingError 
} from '../types/processing';
import { FilterPreset } from '../types/filter';

/**
 * 処理結果管理のためのカスタムフック
 * Requirements: 3.1, 3.4
 */
export interface ProcessingResultsState {
  // 処理済み画像の管理
  processedImages: ProcessedImage[];
  originalImages: ProcessableImage[];
  
  // 処理状態の管理
  isProcessing: boolean;
  progress: ProcessingProgress;
  
  // 結果データ
  batchResult: BatchProcessingResult | null;
  
  // エラー管理
  errors: ProcessingError[];
}

/**
 * 処理結果管理のアクション
 */
export interface ProcessingResultsActions {
  // 処理開始
  startProcessing: (images: ProcessableImage[], preset: FilterPreset) => void;
  
  // 進行状況更新
  updateProgress: (progress: ProcessingProgress) => void;
  
  // 個別画像の処理完了
  addProcessedImage: (processedImage: ProcessedImage) => void;
  
  // 処理完了
  completeProcessing: (result: BatchProcessingResult) => void;
  
  // エラー追加
  addError: (error: ProcessingError) => void;
  
  // 状態リセット
  resetResults: () => void;
  
  // 処理済み画像の削除
  removeProcessedImage: (imageId: string) => void;
  
  // 処理済み画像の更新
  updateProcessedImage: (imageId: string, updates: Partial<ProcessedImage>) => void;
}

/**
 * 初期状態
 */
const initialState: ProcessingResultsState = {
  processedImages: [],
  originalImages: [],
  isProcessing: false,
  progress: {
    totalImages: 0,
    processedImages: 0,
    currentImage: null,
    progress: 0,
    errors: []
  },
  batchResult: null,
  errors: []
};

/**
 * 処理結果管理のカスタムフック
 * Requirements: 3.1, 3.4
 */
export const useProcessingResults = (): [ProcessingResultsState, ProcessingResultsActions] => {
  const [state, setState] = useState<ProcessingResultsState>(initialState);
  const appliedPresetRef = useRef<FilterPreset | null>(null);

  /**
   * 処理開始
   */
  const startProcessing = useCallback((images: ProcessableImage[], preset: FilterPreset) => {
    appliedPresetRef.current = preset;
    setState(prevState => ({
      ...prevState,
      originalImages: [...images],
      processedImages: [],
      isProcessing: true,
      progress: {
        totalImages: images.length,
        processedImages: 0,
        currentImage: null,
        progress: 0,
        errors: []
      },
      batchResult: null,
      errors: []
    }));
  }, []);

  /**
   * 進行状況更新
   */
  const updateProgress = useCallback((progress: ProcessingProgress) => {
    setState(prevState => ({
      ...prevState,
      progress: {
        ...progress,
        errors: [...progress.errors]
      },
      errors: [...progress.errors]
    }));
  }, []);

  /**
   * 個別画像の処理完了
   */
  const addProcessedImage = useCallback((processedImage: ProcessedImage) => {
    setState(prevState => {
      // 重複チェック
      const existingIndex = prevState.processedImages.findIndex(
        img => img.id === processedImage.id
      );

      let updatedProcessedImages: ProcessedImage[];
      if (existingIndex >= 0) {
        // 既存の画像を更新
        updatedProcessedImages = [...prevState.processedImages];
        updatedProcessedImages[existingIndex] = processedImage;
      } else {
        // 新しい画像を追加
        updatedProcessedImages = [...prevState.processedImages, processedImage];
      }

      // 元画像の状態も更新
      const updatedOriginalImages = prevState.originalImages.map(img => 
        img.id === processedImage.id 
          ? { ...img, status: 'completed' as const }
          : img
      );

      return {
        ...prevState,
        processedImages: updatedProcessedImages,
        originalImages: updatedOriginalImages
      };
    });
  }, []);

  /**
   * 処理完了
   */
  const completeProcessing = useCallback((result: BatchProcessingResult) => {
    setState(prevState => ({
      ...prevState,
      isProcessing: false,
      batchResult: result,
      progress: {
        ...prevState.progress,
        progress: 100,
        currentImage: null
      }
    }));
  }, []);

  /**
   * エラー追加
   */
  const addError = useCallback((error: ProcessingError) => {
    setState(prevState => {
      const updatedErrors = [...prevState.errors, error];
      
      // 元画像の状態も更新
      const updatedOriginalImages = prevState.originalImages.map(img => 
        img.id === error.imageId 
          ? { ...img, status: 'error' as const, error: error.error }
          : img
      );

      return {
        ...prevState,
        errors: updatedErrors,
        originalImages: updatedOriginalImages,
        progress: {
          ...prevState.progress,
          errors: updatedErrors
        }
      };
    });
  }, []);

  /**
   * 状態リセット
   */
  const resetResults = useCallback(() => {
    // 既存のBlobURLをクリーンアップ
    state.processedImages.forEach(img => {
      if (img.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.processedUrl);
      }
    });

    state.originalImages.forEach(img => {
      if (img.originalUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.originalUrl);
      }
    });

    appliedPresetRef.current = null;
    setState(initialState);
  }, [state.processedImages, state.originalImages]);

  /**
   * 処理済み画像の削除
   */
  const removeProcessedImage = useCallback((imageId: string) => {
    setState(prevState => {
      const imageToRemove = prevState.processedImages.find(img => img.id === imageId);
      
      // BlobURLをクリーンアップ
      if (imageToRemove && imageToRemove.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.processedUrl);
      }

      const updatedProcessedImages = prevState.processedImages.filter(
        img => img.id !== imageId
      );

      const updatedOriginalImages = prevState.originalImages.filter(
        img => img.id !== imageId
      );

      // バッチ結果も更新
      let updatedBatchResult = prevState.batchResult;
      if (updatedBatchResult) {
        updatedBatchResult = {
          ...updatedBatchResult,
          processedImages: updatedBatchResult.processedImages.filter(
            img => img.id !== imageId
          ),
          successCount: Math.max(0, updatedBatchResult.successCount - 1)
        };
      }

      return {
        ...prevState,
        processedImages: updatedProcessedImages,
        originalImages: updatedOriginalImages,
        batchResult: updatedBatchResult
      };
    });
  }, []);

  /**
   * 処理済み画像の更新
   */
  const updateProcessedImage = useCallback((imageId: string, updates: Partial<ProcessedImage>) => {
    setState(prevState => {
      const updatedProcessedImages = prevState.processedImages.map(img =>
        img.id === imageId ? { ...img, ...updates } : img
      );

      // バッチ結果も更新
      let updatedBatchResult = prevState.batchResult;
      if (updatedBatchResult) {
        updatedBatchResult = {
          ...updatedBatchResult,
          processedImages: updatedBatchResult.processedImages.map(img =>
            img.id === imageId ? { ...img, ...updates } : img
          )
        };
      }

      return {
        ...prevState,
        processedImages: updatedProcessedImages,
        batchResult: updatedBatchResult
      };
    });
  }, []);

  const actions: ProcessingResultsActions = {
    startProcessing,
    updateProgress,
    addProcessedImage,
    completeProcessing,
    addError,
    resetResults,
    removeProcessedImage,
    updateProcessedImage
  };

  return [state, actions];
};

/**
 * 処理結果の統計情報を取得するヘルパー関数
 */
export const getProcessingStats = (state: ProcessingResultsState) => {
  const { processedImages, originalImages, errors } = state;
  
  return {
    totalImages: originalImages.length,
    successfulImages: processedImages.length,
    failedImages: errors.length,
    pendingImages: originalImages.length - processedImages.length - errors.length,
    successRate: originalImages.length > 0 
      ? Math.round((processedImages.length / originalImages.length) * 100) 
      : 0,
    totalFileSize: processedImages.reduce((sum, img) => sum + img.fileSize, 0),
    averageProcessingTime: processedImages.length > 0
      ? Math.round(processedImages.reduce((sum, img) => sum + img.processingTime, 0) / processedImages.length)
      : 0
  };
};

/**
 * 処理結果をエクスポート用データに変換するヘルパー関数
 */
export const exportProcessingResults = (state: ProcessingResultsState) => {
  const stats = getProcessingStats(state);
  
  return {
    summary: {
      timestamp: new Date().toISOString(),
      totalImages: stats.totalImages,
      successfulImages: stats.successfulImages,
      failedImages: stats.failedImages,
      successRate: stats.successRate,
      totalProcessingTime: state.batchResult?.totalProcessingTime || 0
    },
    processedImages: state.processedImages.map(img => ({
      id: img.id,
      originalFileName: img.originalImage.file.name,
      appliedPreset: img.appliedPreset,
      processingTime: img.processingTime,
      fileSize: img.fileSize,
      originalFileSize: img.originalImage.file.size
    })),
    errors: state.errors.map(error => ({
      imageName: error.imageName,
      error: error.error,
      timestamp: new Date(error.timestamp).toISOString()
    }))
  };
};