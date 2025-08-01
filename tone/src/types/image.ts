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
 * 処理可能な画像の型定義
 */
export interface ProcessableImage {
  id: string;
  file: File;
  originalUrl: string;
  metadata: ImageMetadata;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

/**
 * 処理済み画像の型定義
 */
export interface ProcessedImage {
  id: string;
  originalImage: ProcessableImage;
  processedUrl: string;
  appliedPreset: string;
  processingTime: number;
  fileSize: number;
}