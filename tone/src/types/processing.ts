import { FilterPreset } from './filter';

/**
 * 処理可能な画像の型定義
 * Requirements: 3.1, 3.2, 3.3
 */
export interface ProcessableImage {
  id: string;
  file: File;
  originalUrl: string;
  metadata: ImageMetadata;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * 処理済み画像の型定義
 * Requirements: 3.1, 3.4
 */
export interface ProcessedImage {
  id: string;
  originalImage: ProcessableImage;
  processedUrl: string;
  processedBlob: Blob;
  appliedPreset: string;
  processingTime: number;
  fileSize: number;
}

/**
 * 画像メタデータの型定義
 */
export interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  format: string;
  lastModified: number;
}

/**
 * 処理進行状況の型定義
 * Requirements: 3.2, 8.3
 */
export interface ProcessingProgress {
  totalImages: number;
  processedImages: number;
  currentImage: string | null;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  errors: ProcessingError[];
}

/**
 * 処理エラーの型定義
 * Requirements: 3.3
 */
export interface ProcessingError {
  imageId: string;
  imageName: string;
  error: string;
  timestamp: number;
}

/**
 * 一括処理の結果型定義
 * Requirements: 3.1, 3.4
 */
export interface BatchProcessingResult {
  processedImages: ProcessedImage[];
  errors: ProcessingError[];
  totalProcessingTime: number;
  successCount: number;
  errorCount: number;
}