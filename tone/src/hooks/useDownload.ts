import { useState, useCallback } from 'react';
import { ProcessedImage } from '../types/processing';
import {
  downloadSingleImage,
  downloadAllImagesAsZipWithProgress,
  DownloadProgress,
  canDownload,
  checkFileSizeLimit
} from '../utils/downloadUtils';

/**
 * ダウンロード状態の管理
 */
export interface DownloadState {
  isDownloading: boolean;
  downloadType: 'single' | 'batch' | null;
  progress: DownloadProgress | null;
  error: string | null;
}

/**
 * ダウンロード機能のカスタムフック
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export const useDownload = () => {
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    downloadType: null,
    progress: null,
    error: null
  });

  /**
   * 個別画像のダウンロード
   * Requirements: 5.1, 5.3
   */
  const downloadSingle = useCallback(async (processedImage: ProcessedImage) => {
    if (!canDownload()) {
      setState(prev => ({ ...prev, error: 'ダウンロード機能がサポートされていません' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isDownloading: true,
      downloadType: 'single',
      error: null,
      progress: null
    }));

    try {
      await downloadSingleImage(processedImage);
      
      setState(prev => ({
        ...prev,
        isDownloading: false,
        downloadType: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isDownloading: false,
        downloadType: null,
        error: error instanceof Error ? error.message : '個別ダウンロードに失敗しました'
      }));
    }
  }, []);

  /**
   * 一括ダウンロード（ZIP）
   * Requirements: 5.2, 5.4
   */
  const downloadAll = useCallback(async (
    processedImages: ProcessedImage[],
    zipFileName?: string
  ) => {
    if (!canDownload()) {
      setState(prev => ({ ...prev, error: 'ダウンロード機能がサポートされていません' }));
      return;
    }

    if (processedImages.length === 0) {
      setState(prev => ({ ...prev, error: 'ダウンロードする画像がありません' }));
      return;
    }

    // ファイルサイズ制限チェック（100MB）
    if (!checkFileSizeLimit(processedImages, 100)) {
      setState(prev => ({ 
        ...prev, 
        error: 'ファイルサイズが大きすぎます（100MB以下にしてください）' 
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isDownloading: true,
      downloadType: 'batch',
      error: null,
      progress: null
    }));

    try {
      await downloadAllImagesAsZipWithProgress(
        processedImages,
        (progress) => {
          setState(prev => ({
            ...prev,
            progress
          }));
        },
        zipFileName
      );
      
      setState(prev => ({
        ...prev,
        isDownloading: false,
        downloadType: null,
        progress: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isDownloading: false,
        downloadType: null,
        progress: null,
        error: error instanceof Error ? error.message : '一括ダウンロードに失敗しました'
      }));
    }
  }, []);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * ダウンロードをキャンセル（実際のキャンセルは困難なため、状態のみリセット）
   */
  const cancelDownload = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDownloading: false,
      downloadType: null,
      progress: null
    }));
  }, []);

  return {
    // 状態
    isDownloading: state.isDownloading,
    downloadType: state.downloadType,
    progress: state.progress,
    error: state.error,
    
    // アクション
    downloadSingle,
    downloadAll,
    clearError,
    cancelDownload
  };
};

/**
 * ダウンロード統計情報の取得
 */
export const getDownloadStats = (processedImages: ProcessedImage[]) => {
  const totalSize = processedImages.reduce((sum, img) => sum + img.fileSize, 0);
  const totalSizeMB = Math.round((totalSize / (1024 * 1024)) * 100) / 100;
  
  return {
    imageCount: processedImages.length,
    totalSize,
    totalSizeMB,
    averageSize: processedImages.length > 0 ? Math.round(totalSize / processedImages.length) : 0,
    canDownload: canDownload(),
    withinSizeLimit: checkFileSizeLimit(processedImages)
  };
};