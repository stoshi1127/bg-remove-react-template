import { FilterConfig } from '../types/filter';
import {
  applyBrightness,
  applyContrast,
  applySaturation,
  applyHue,
  applySharpness,
  applyWarmth
} from '../utils/imageFilters';

/**
 * 画像処理用Web Worker
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

// Web Worker内でのImageData実装（Node.js環境対応）
if (typeof ImageData === 'undefined') {
  (globalThis as unknown as { ImageData: typeof ImageData }).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(data: Uint8ClampedArray, width: number, height?: number) {
      this.data = data;
      this.width = width;
      this.height = height || data.length / (width * 4);
    }
  };
}

/**
 * 画像データにフィルターを適用（Worker内での処理）
 */
function processImageInWorker(imageData: ImageData, filterConfig: FilterConfig, width: number, height: number): ImageData {
  // ImageDataをコピーして処理
  const processedData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Apply filters in order
  if (filterConfig.brightness !== 0) {
    applyBrightness(processedData, filterConfig.brightness);
  }
  
  if (filterConfig.contrast !== 0) {
    applyContrast(processedData, filterConfig.contrast);
  }
  
  if (filterConfig.saturation !== 0) {
    applySaturation(processedData, filterConfig.saturation);
  }
  
  if (filterConfig.hue !== 0) {
    applyHue(processedData, filterConfig.hue);
  }
  
  if (filterConfig.sharpness !== 0) {
    applySharpness(processedData, filterConfig.sharpness, width, height);
  }
  
  if (filterConfig.warmth !== 0) {
    applyWarmth(processedData, filterConfig.warmth);
  }

  return processedData;
}

// Worker メッセージハンドラー
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { id, type, payload } = event.data;

  if (type === 'PROCESS_IMAGE') {
    try {
      const { imageData, filterConfig, width, height } = payload;
      
      const startTime = performance.now();
      const processedImageData = processImageInWorker(imageData, filterConfig, width, height);
      const endTime = performance.now();

      const response: WorkerResponse = {
        id,
        type: 'PROCESS_COMPLETE',
        payload: {
          imageData: processedImageData
        }
      };

      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        id,
        type: 'PROCESS_ERROR',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };

      self.postMessage(response);
    }
  }
};

// TypeScript用のexport（実際のWorkerでは使用されない）
export {};