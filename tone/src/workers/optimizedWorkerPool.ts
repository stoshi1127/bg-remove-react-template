import { FilterConfig } from '../types/filter';
import { WorkerMessage, WorkerResponse, ProcessingTask, ProcessedImageResult, WorkerPool } from './workerTypes';
import { 
  loadOptimizedImageToCanvas, 
  canvasToOptimizedBlob,
  getMemoryUsage,
  calculateOptimalConcurrency,
  performMemoryCleanup,
  calculateProcessingMetrics,
  DEFAULT_OPTIMIZATION_CONFIG,
  ImageOptimizationConfig,
  ProcessingMetrics
} from '../utils/performanceOptimization';

/**
 * 最適化されたWeb Worker プール管理クラス
 * Requirements: 8.1, 8.2, 8.4
 */
export class OptimizedImageProcessingWorkerPool {
  private pool: WorkerPool;
  private maxWorkers: number;
  private pendingTasks: Map<string, ProcessingTask>;
  private optimizationConfig: ImageOptimizationConfig;
  private processingMetrics: Map<string, ProcessingMetrics>;
  private memoryCleanupInterval: NodeJS.Timeout | null;

  constructor(
    maxWorkers?: number,
    optimizationConfig: ImageOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
  ) {
    this.maxWorkers = maxWorkers || calculateOptimalConcurrency();
    this.optimizationConfig = optimizationConfig;
    this.pendingTasks = new Map();
    this.processingMetrics = new Map();
    this.memoryCleanupInterval = null;
    
    this.pool = {
      workers: [],
      availableWorkers: [],
      busyWorkers: new Set(),
      taskQueue: []
    };

    this.initializeWorkers();
    this.startMemoryMonitoring();
  }

  /**
   * ワーカープールを初期化
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createSingleWorker();
    }
  }

  /**
   * 単一のWorkerを作成
   */
  private createSingleWorker(): void {
    try {
      const workerBlob = new Blob([this.getOptimizedWorkerScript()], { 
        type: 'application/javascript' 
      });
      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);

      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = this.handleWorkerError.bind(this);

      this.pool.workers.push(worker);
      this.pool.availableWorkers.push(worker);

      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.warn('Failed to create optimized worker:', error);
    }
  }

  /**
   * 最適化されたWorker スクリプトを取得
   */
  private getOptimizedWorkerScript(): string {
    return `
      // メモリ効率的なフィルター実装
      function applyBrightnessOptimized(imageData, brightness) {
        const data = imageData.data;
        const adjustment = (brightness / 100) * 255;
        const length = data.length;
        
        // ループアンローリングで高速化
        for (let i = 0; i < length; i += 16) {
          // 4ピクセル分を一度に処理
          for (let j = 0; j < 16 && i + j < length; j += 4) {
            const idx = i + j;
            data[idx] = Math.max(0, Math.min(255, data[idx] + adjustment));
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + adjustment));
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + adjustment));
          }
        }
      }

      function applyContrastOptimized(imageData, contrast) {
        const data = imageData.data;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const length = data.length;
        
        for (let i = 0; i < length; i += 4) {
          data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
      }

      function applySaturationOptimized(imageData, saturation) {
        const data = imageData.data;
        const factor = (saturation + 100) / 100;
        const length = data.length;
        
        // 輝度計算の定数を事前計算
        const rWeight = 0.299;
        const gWeight = 0.587;
        const bWeight = 0.114;
        
        for (let i = 0; i < length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const gray = rWeight * r + gWeight * g + bWeight * b;
          
          data[i] = Math.max(0, Math.min(255, gray + factor * (r - gray)));
          data[i + 1] = Math.max(0, Math.min(255, gray + factor * (g - gray)));
          data[i + 2] = Math.max(0, Math.min(255, gray + factor * (b - gray)));
        }
      }

      // HSL変換の最適化版
      const hslCache = new Map();
      
      function rgbToHslOptimized(r, g, b) {
        const key = (r << 16) | (g << 8) | b;
        if (hslCache.has(key)) {
          return hslCache.get(key);
        }
        
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
        }
        
        const result = [h * 360, s * 100, l * 100];
        hslCache.set(key, result);
        return result;
      }

      function hslToRgbOptimized(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }

      function applyHueOptimized(imageData, hue) {
        const data = imageData.data;
        const length = data.length;
        
        for (let i = 0; i < length; i += 4) {
          const [h, s, l] = rgbToHslOptimized(data[i], data[i + 1], data[i + 2]);
          const newHue = (h + hue + 360) % 360;
          const [r, g, b] = hslToRgbOptimized(newHue, s, l);
          
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }

      function applySharpnessOptimized(imageData, sharpness, width, height) {
        if (sharpness === 0) return;
        
        const data = imageData.data;
        const originalData = new Uint8ClampedArray(data);
        const factor = sharpness / 100;
        
        // 最適化されたカーネル処理
        const kernel = [0, -factor, 0, -factor, 1 + 4 * factor, -factor, 0, -factor, 0];
        
        // エッジ処理を避けて内部のピクセルのみ処理
        for (let y = 1; y < height - 1; y++) {
          const rowStart = y * width * 4;
          for (let x = 1; x < width - 1; x++) {
            const pixelStart = rowStart + x * 4;
            
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              let kernelIndex = 0;
              
              // 3x3カーネルの展開
              for (let ky = -1; ky <= 1; ky++) {
                const rowOffset = ky * width * 4;
                for (let kx = -1; kx <= 1; kx++) {
                  const pixelOffset = kx * 4;
                  const idx = pixelStart + rowOffset + pixelOffset + c;
                  sum += originalData[idx] * kernel[kernelIndex++];
                }
              }
              
              data[pixelStart + c] = Math.max(0, Math.min(255, sum));
            }
          }
        }
      }

      function applyWarmthOptimized(imageData, warmth) {
        const data = imageData.data;
        const factor = warmth / 100;
        const length = data.length;
        
        if (factor > 0) {
          const redAdjust = factor * 30;
          const blueAdjust = factor * 20;
          
          for (let i = 0; i < length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] + redAdjust));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - blueAdjust));
          }
        } else {
          const redAdjust = factor * 20;
          const blueAdjust = factor * 30;
          
          for (let i = 0; i < length; i += 4) {
            data[i] = Math.max(0, Math.min(255, data[i] + redAdjust));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - blueAdjust));
          }
        }
      }

      function processImageOptimized(imageData, filterConfig, width, height) {
        const startTime = performance.now();
        
        // ImageDataのクローンを効率的に作成
        const processedData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );

        // フィルターを順番に適用（最適化版）
        if (filterConfig.brightness !== 0) {
          applyBrightnessOptimized(processedData, filterConfig.brightness);
        }
        if (filterConfig.contrast !== 0) {
          applyContrastOptimized(processedData, filterConfig.contrast);
        }
        if (filterConfig.saturation !== 0) {
          applySaturationOptimized(processedData, filterConfig.saturation);
        }
        if (filterConfig.hue !== 0) {
          applyHueOptimized(processedData, filterConfig.hue);
        }
        if (filterConfig.sharpness !== 0) {
          applySharpnessOptimized(processedData, filterConfig.sharpness, width, height);
        }
        if (filterConfig.warmth !== 0) {
          applyWarmthOptimized(processedData, filterConfig.warmth);
        }

        const endTime = performance.now();
        
        return {
          imageData: processedData,
          processingTime: endTime - startTime
        };
      }

      self.onmessage = function(event) {
        const { id, type, payload } = event.data;

        if (type === 'PROCESS_IMAGE') {
          try {
            const { imageData, filterConfig, width, height } = payload;
            const result = processImageOptimized(imageData, filterConfig, width, height);

            self.postMessage({
              id,
              type: 'PROCESS_COMPLETE',
              payload: {
                imageData: result.imageData,
                processingTime: result.processingTime
              }
            });
          } catch (error) {
            self.postMessage({
              id,
              type: 'PROCESS_ERROR',
              payload: { error: error.message || 'Unknown error occurred' }
            });
          }
        }
      };
    `;
  }

  /**
   * メモリ監視を開始
   */
  private startMemoryMonitoring(): void {
    this.memoryCleanupInterval = setInterval(() => {
      const memoryInfo = getMemoryUsage();
      
      if (memoryInfo.memoryPressure === 'high') {
        console.warn('High memory pressure detected, performing cleanup');
        performMemoryCleanup();
        
        // 必要に応じてワーカー数を動的に調整
        this.adjustWorkerCount();
      }
    }, 5000); // 5秒ごとにチェック
  }

  /**
   * メモリプレッシャーに基づいてワーカー数を調整
   */
  private adjustWorkerCount(): void {
    const optimalConcurrency = calculateOptimalConcurrency();
    
    if (optimalConcurrency < this.pool.workers.length) {
      // ワーカー数を減らす
      const excessWorkers = this.pool.workers.length - optimalConcurrency;
      
      for (let i = 0; i < excessWorkers; i++) {
        const worker = this.pool.availableWorkers.pop();
        if (worker) {
          worker.terminate();
          const workerIndex = this.pool.workers.indexOf(worker);
          if (workerIndex > -1) {
            this.pool.workers.splice(workerIndex, 1);
          }
        }
      }
      
      this.maxWorkers = optimalConcurrency;
      console.log(`Reduced worker count to ${this.maxWorkers} due to memory pressure`);
    }
  }

  /**
   * Worker からのメッセージを処理（最適化版）
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, type, payload } = event.data;
    const task = this.pendingTasks.get(id);

    if (!task) {
      console.warn('Received response for unknown task:', id);
      return;
    }

    const worker = event.target as Worker;
    this.releaseWorker(worker);

    if (type === 'PROCESS_COMPLETE' && payload.imageData) {
      const endTime = performance.now();
      const metrics = this.processingMetrics.get(id);
      
      if (metrics) {
        metrics.endTime = endTime;
        metrics.processingTime = endTime - metrics.startTime;
      }

      // 最適化されたBlob変換
      this.convertImageDataToOptimizedBlob(payload.imageData, task.file.size)
        .then(blob => {
          const result: ProcessedImageResult = {
            id,
            processedBlob: blob,
            processingTime: (payload as { processingTime?: number }).processingTime || 0
          };
          
          if (metrics) {
            metrics.processedFileSize = blob.size;
            metrics.compressionRatio = blob.size / task.file.size;
          }
          
          task.resolve(result);
        })
        .catch(error => {
          task.reject(new Error(`Failed to convert processed image: ${error.message}`));
        });
    } else if (type === 'PROCESS_ERROR') {
      task.reject(new Error(payload.error || 'Processing failed'));
    }

    this.pendingTasks.delete(id);
    this.processingMetrics.delete(id);
    this.processNextTask();
  }

  /**
   * Worker エラーを処理
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // エラーが発生したWorkerを特定して削除
    const worker = error.target as Worker;
    const workerIndex = this.pool.workers.indexOf(worker);
    
    if (workerIndex !== -1) {
      this.pool.workers.splice(workerIndex, 1);
      const availableIndex = this.pool.availableWorkers.indexOf(worker);
      if (availableIndex !== -1) {
        this.pool.availableWorkers.splice(availableIndex, 1);
      }
      
      // 新しいWorkerを作成して置き換え
      this.createSingleWorker();
    }
  }

  /**
   * ImageDataを最適化されたBlobに変換
   */
  private async convertImageDataToOptimizedBlob(
    imageData: ImageData, 
    originalFileSize: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    const blob = await canvasToOptimizedBlob(canvas, originalFileSize, this.optimizationConfig);
    
    // メモリクリーンアップ
    canvas.width = 0;
    canvas.height = 0;
    
    return blob;
  }

  /**
   * 画像を処理キューに追加（最適化版）
   */
  public async processImage(file: File, filterConfig: FilterConfig): Promise<ProcessedImageResult> {
    return new Promise((resolve, reject) => {
      const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const task: ProcessingTask = {
        id,
        file,
        filterConfig,
        resolve,
        reject
      };

      // メトリクス記録開始
      const startTime = performance.now();
      const memoryBefore = getMemoryUsage();
      
      this.processingMetrics.set(id, {
        startTime,
        endTime: 0,
        processingTime: 0,
        memoryBefore,
        memoryAfter: memoryBefore, // 後で更新
        originalFileSize: file.size,
        processedFileSize: 0,
        compressionRatio: 0
      });

      this.pool.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * 次のタスクを処理（最適化版）
   */
  private async processNextTask(): Promise<void> {
    if (this.pool.taskQueue.length === 0 || this.pool.availableWorkers.length === 0) {
      return;
    }

    const task = this.pool.taskQueue.shift();
    const worker = this.pool.availableWorkers.shift();

    if (!task || !worker) {
      return;
    }

    this.pool.busyWorkers.add(worker);
    this.pendingTasks.set(task.id, task);

    try {
      // 最適化された画像読み込み
      const canvas = await loadOptimizedImageToCanvas(task.file, this.optimizationConfig);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const message: WorkerMessage = {
        id: task.id,
        type: 'PROCESS_IMAGE',
        payload: {
          imageData,
          filterConfig: task.filterConfig,
          width: canvas.width,
          height: canvas.height
        }
      };

      worker.postMessage(message);
      
      // Canvasメモリクリーンアップ
      canvas.width = 0;
      canvas.height = 0;
      
    } catch (error) {
      this.releaseWorker(worker);
      this.pendingTasks.delete(task.id);
      this.processingMetrics.delete(task.id);
      task.reject(error instanceof Error ? error : new Error('Failed to process image'));
      this.processNextTask();
    }
  }

  /**
   * ワーカーを解放
   */
  private releaseWorker(worker: Worker): void {
    this.pool.busyWorkers.delete(worker);
    if (!this.pool.availableWorkers.includes(worker)) {
      this.pool.availableWorkers.push(worker);
    }
  }

  /**
   * プールを破棄
   */
  public destroy(): void {
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
    
    this.pool.workers.forEach(worker => {
      worker.terminate();
    });
    
    this.pool.workers = [];
    this.pool.availableWorkers = [];
    this.pool.busyWorkers.clear();
    this.pool.taskQueue = [];
    this.pendingTasks.clear();
    this.processingMetrics.clear();
    
    performMemoryCleanup();
  }

  /**
   * 詳細なプール状態を取得
   */
  public getDetailedStatus() {
    const memoryInfo = getMemoryUsage();
    
    return {
      totalWorkers: this.pool.workers.length,
      availableWorkers: this.pool.availableWorkers.length,
      busyWorkers: this.pool.busyWorkers.size,
      queuedTasks: this.pool.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
      memoryUsage: memoryInfo,
      optimizationConfig: this.optimizationConfig
    };
  }

  /**
   * 処理メトリクスを取得
   */
  public getProcessingMetrics(): ProcessingMetrics[] {
    return Array.from(this.processingMetrics.values());
  }
}