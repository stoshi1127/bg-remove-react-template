import { FilterConfig } from '../types/filter';

/**
 * Web Worker メッセージの型定義
 * Requirements: 3.1, 3.2, 8.1, 8.2
 */

export interface WorkerMessage {
  id: string;
  type: 'PROCESS_IMAGE';
  payload: {
    imageData: ImageData;
    filterConfig: FilterConfig;
    width: number;
    height: number;
  };
}

export interface WorkerResponse {
  id: string;
  type: 'PROCESS_COMPLETE' | 'PROCESS_ERROR';
  payload: {
    imageData?: ImageData;
    error?: string;
  };
}

export interface ProcessingTask {
  id: string;
  file: File;
  filterConfig: FilterConfig;
  resolve: (result: ProcessedImageResult) => void;
  reject: (error: Error) => void;
}

export interface ProcessedImageResult {
  id: string;
  processedBlob: Blob;
  processingTime: number;
}

export interface WorkerPool {
  workers: Worker[];
  availableWorkers: Worker[];
  busyWorkers: Set<Worker>;
  taskQueue: ProcessingTask[];
}