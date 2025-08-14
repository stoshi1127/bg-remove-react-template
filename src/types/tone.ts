/**
 * EasyTone関連の型定義
 */

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  name: string;
  type: string;
  lastModified: number;
}

export interface ProcessableImage {
  id: string;
  file: File;
  originalUrl: string;
  metadata: ImageMetadata;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ProcessedImage {
  id: string;
  originalImage: ProcessableImage;
  processedUrl: string;
  processedBlob: Blob;
  appliedPreset: string;
  processingTime: number;
  fileSize: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    sharpness: number;
    warmth: number;
  };
}

export interface ProcessingProgress {
  current: number;
  total: number;
  fileName: string;
  progress: number;
}

export interface DownloadProgress {
  current: number;
  total: number;
  fileName: string;
  progress: number;
}