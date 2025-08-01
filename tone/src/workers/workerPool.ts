import { FilterConfig } from '../types/filter';
import { loadImageToCanvas, canvasToBlob } from '../utils/imageFilters';
import { WorkerMessage, WorkerResponse, ProcessingTask, ProcessedImageResult, WorkerPool } from './workerTypes';

/**
 * Web Worker プール管理クラス
 * Requirements: 3.1, 3.2, 8.1, 8.2
 */
export class ImageProcessingWorkerPool {
  private pool: WorkerPool;
  private maxWorkers: number;
  private pendingTasks: Map<string, ProcessingTask>;

  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // 最大8ワーカーに制限
    this.pendingTasks = new Map();
    this.pool = {
      workers: [],
      availableWorkers: [],
      busyWorkers: new Set(),
      taskQueue: []
    };

    this.initializeWorkers();
  }

  /**
   * ワーカープールを初期化
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        // Web Workerを作成（インライン形式）
        const workerBlob = new Blob([this.getWorkerScript()], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        const worker = new Worker(workerUrl);

        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);

        this.pool.workers.push(worker);
        this.pool.availableWorkers.push(worker);

        // URLを解放
        URL.revokeObjectURL(workerUrl);
      } catch (error) {
        console.warn('Failed to create worker:', error);
      }
    }
  }

  /**
   * Worker スクリプトを文字列として取得
   */
  private getWorkerScript(): string {
    return `
      // Filter functions (inline implementation for worker)
      function applyBrightness(imageData, brightness) {
        const data = imageData.data;
        const adjustment = (brightness / 100) * 255;
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] + adjustment));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment));
        }
      }

      function applyContrast(imageData, contrast) {
        const data = imageData.data;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
      }

      function applySaturation(imageData, saturation) {
        const data = imageData.data;
        const factor = (saturation + 100) / 100;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          data[i] = Math.max(0, Math.min(255, gray + factor * (r - gray)));
          data[i + 1] = Math.max(0, Math.min(255, gray + factor * (g - gray)));
          data[i + 2] = Math.max(0, Math.min(255, gray + factor * (b - gray)));
        }
      }

      function rgbToHsl(r, g, b) {
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
        return [h * 360, s * 100, l * 100];
      }

      function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }

      function applyHue(imageData, hue) {
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
          const newHue = (h + hue + 360) % 360;
          const [r, g, b] = hslToRgb(newHue, s, l);
          
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }

      function applySharpness(imageData, sharpness, width, height) {
        if (sharpness === 0) return;
        
        const data = imageData.data;
        const originalData = new Uint8ClampedArray(data);
        const factor = sharpness / 100;
        
        const kernel = [0, -factor, 0, -factor, 1 + 4 * factor, -factor, 0, -factor, 0];
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                  const kernelIdx = (ky + 1) * 3 + (kx + 1);
                  sum += originalData[idx] * kernel[kernelIdx];
                }
              }
              const idx = (y * width + x) * 4 + c;
              data[idx] = Math.max(0, Math.min(255, sum));
            }
          }
        }
      }

      function applyWarmth(imageData, warmth) {
        const data = imageData.data;
        const factor = warmth / 100;
        
        for (let i = 0; i < data.length; i += 4) {
          if (factor > 0) {
            data[i] = Math.max(0, Math.min(255, data[i] + factor * 30));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - factor * 20));
          } else {
            data[i] = Math.max(0, Math.min(255, data[i] + factor * 20));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] - factor * 30));
          }
        }
      }

      function processImageInWorker(imageData, filterConfig, width, height) {
        const processedData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );

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

      self.onmessage = function(event) {
        const { id, type, payload } = event.data;

        if (type === 'PROCESS_IMAGE') {
          try {
            const { imageData, filterConfig, width, height } = payload;
            const processedImageData = processImageInWorker(imageData, filterConfig, width, height);

            self.postMessage({
              id,
              type: 'PROCESS_COMPLETE',
              payload: { imageData: processedImageData }
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
   * Worker からのメッセージを処理
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
      // ImageDataをCanvasに変換してBlobを生成
      this.convertImageDataToBlob(payload.imageData)
        .then(blob => {
          const result: ProcessedImageResult = {
            id,
            processedBlob: blob,
            processingTime: Date.now() - parseInt(id.split('-')[1]) // 簡易的な処理時間計算
          };
          task.resolve(result);
        })
        .catch(error => {
          task.reject(new Error(`Failed to convert processed image: ${error.message}`));
        });
    } else if (type === 'PROCESS_ERROR') {
      task.reject(new Error(payload.error || 'Processing failed'));
    }

    this.pendingTasks.delete(id);
    this.processNextTask();
  }

  /**
   * Worker エラーを処理
   */
  private handleWorkerError(event: ErrorEvent): void {
    console.error('Worker error:', event.error);
    const worker = event.target as Worker;
    this.releaseWorker(worker);
    this.processNextTask();
  }

  /**
   * ImageDataをBlobに変換
   */
  private async convertImageDataToBlob(imageData: ImageData): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    return canvasToBlob(canvas);
  }

  /**
   * 画像を処理キューに追加
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

      this.pool.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * 複数の画像を並列処理
   */
  public async processImages(files: File[], filterConfig: FilterConfig): Promise<ProcessedImageResult[]> {
    const promises = files.map(file => this.processImage(file, filterConfig));
    return Promise.all(promises);
  }

  /**
   * 次のタスクを処理
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
      // ファイルをCanvasに読み込み
      const canvas = await loadImageToCanvas(task.file);
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
    } catch (error) {
      this.releaseWorker(worker);
      this.pendingTasks.delete(task.id);
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
    this.pool.workers.forEach(worker => {
      worker.terminate();
    });
    this.pool.workers = [];
    this.pool.availableWorkers = [];
    this.pool.busyWorkers.clear();
    this.pool.taskQueue = [];
    this.pendingTasks.clear();
  }

  /**
   * プールの状態を取得
   */
  public getStatus() {
    return {
      totalWorkers: this.pool.workers.length,
      availableWorkers: this.pool.availableWorkers.length,
      busyWorkers: this.pool.busyWorkers.size,
      queuedTasks: this.pool.taskQueue.length,
      pendingTasks: this.pendingTasks.size
    };
  }
}