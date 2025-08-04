import { OptimizedImageProcessingWorkerPool } from '../optimizedWorkerPool';
import { FilterConfig } from '../../types/filter';
import { DEFAULT_OPTIMIZATION_CONFIG } from '../../utils/performanceOptimization';

/**
 * 最適化されたWorkerプールのテスト
 * Requirements: 8.1, 8.2, 8.4
 */

// Mock performance.memory for testing
const mockMemory = {
  usedJSHeapSize: 10000000,
  totalJSHeapSize: 20000000,
  jsHeapSizeLimit: 100000000
};

Object.defineProperty(performance, 'memory', {
  value: mockMemory,
  configurable: true
});

// Mock navigator.hardwareConcurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
  value: 4,
  configurable: true
});

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  constructor(scriptURL: string) {
    // Simulate worker creation
  }
  
  postMessage(message: any) {
    // Simulate async processing
    setTimeout(() => {
      if (this.onmessage) {
        const response = {
          data: {
            id: message.id,
            type: 'PROCESS_COMPLETE',
            payload: {
              imageData: new ImageData(100, 100),
              processingTime: 100
            }
          }
        };
        this.onmessage(response as MessageEvent);
      }
    }, 10);
  }
  
  terminate() {
    // Cleanup
  }
}

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Worker constructor
(global as any).Worker = MockWorker;

// Mock Canvas and ImageData
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

(global as any).ImageData = MockImageData;

// Mock Canvas
const mockCanvas = {
  width: 100,
  height: 100,
  getContext: jest.fn(() => ({
    getImageData: jest.fn(() => new MockImageData(100, 100)),
    putImageData: jest.fn()
  })),
  toBlob: jest.fn((callback) => {
    const blob = new Blob(['mock'], { type: 'image/jpeg' });
    callback(blob);
  })
};

global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  return {};
});

describe('OptimizedImageProcessingWorkerPool', () => {
  let workerPool: OptimizedImageProcessingWorkerPool;
  
  beforeEach(() => {
    jest.clearAllMocks();
    workerPool = new OptimizedImageProcessingWorkerPool(2);
  });
  
  afterEach(() => {
    if (workerPool) {
      workerPool.destroy();
    }
  });

  describe('Initialization', () => {
    it('should create worker pool with specified number of workers', () => {
      const status = workerPool.getDetailedStatus();
      expect(status.totalWorkers).toBe(2);
      expect(status.availableWorkers).toBe(2);
      expect(status.busyWorkers).toBe(0);
    });

    it('should use optimal concurrency when no worker count specified', () => {
      const autoPool = new OptimizedImageProcessingWorkerPool();
      const status = autoPool.getDetailedStatus();
      
      expect(status.totalWorkers).toBeGreaterThan(0);
      expect(status.totalWorkers).toBeLessThanOrEqual(8);
      
      autoPool.destroy();
    });

    it('should initialize with custom optimization config', () => {
      const customConfig = {
        ...DEFAULT_OPTIMIZATION_CONFIG,
        maxWidth: 2048,
        maxHeight: 2048
      };
      
      const customPool = new OptimizedImageProcessingWorkerPool(2, customConfig);
      const status = customPool.getDetailedStatus();
      
      expect(status.optimizationConfig.maxWidth).toBe(2048);
      expect(status.optimizationConfig.maxHeight).toBe(2048);
      
      customPool.destroy();
    });
  });

  describe('Memory Management', () => {
    it('should provide memory usage information', () => {
      const status = workerPool.getDetailedStatus();
      
      expect(status.memoryUsage).toHaveProperty('usedJSHeapSize');
      expect(status.memoryUsage).toHaveProperty('totalJSHeapSize');
      expect(status.memoryUsage).toHaveProperty('jsHeapSizeLimit');
      expect(status.memoryUsage).toHaveProperty('memoryPressure');
    });

    it('should handle memory cleanup', () => {
      // Test that destroy method cleans up resources
      const initialStatus = workerPool.getDetailedStatus();
      expect(initialStatus.totalWorkers).toBe(2);
      
      workerPool.destroy();
      
      const finalStatus = workerPool.getDetailedStatus();
      expect(finalStatus.totalWorkers).toBe(0);
      expect(finalStatus.availableWorkers).toBe(0);
      expect(finalStatus.busyWorkers).toBe(0);
    });
  });

  describe('Image Processing', () => {
    it('should process single image successfully', async () => {
      const mockFile = new File(['mock image data'], 'test.jpg', { 
        type: 'image/jpeg' 
      });
      
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 5,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      const result = await workerPool.processImage(mockFile, filterConfig);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('processedBlob');
      expect(result).toHaveProperty('processingTime');
      expect(result.processedBlob).toBeInstanceOf(Blob);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock worker to simulate error
      const errorWorkerPool = new OptimizedImageProcessingWorkerPool(1);
      
      // Override worker creation to simulate error
      const originalWorkers = (errorWorkerPool as any).pool.workers;
      originalWorkers[0].postMessage = function(message: any) {
        setTimeout(() => {
          if (this.onmessage) {
            const errorResponse = {
              data: {
                id: message.id,
                type: 'PROCESS_ERROR',
                payload: {
                  error: 'Simulated processing error'
                }
              }
            };
            this.onmessage(errorResponse as MessageEvent);
          }
        }, 10);
      };

      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      await expect(errorWorkerPool.processImage(mockFile, filterConfig))
        .rejects.toThrow('Simulated processing error');
      
      errorWorkerPool.destroy();
    });
  });

  describe('Performance Metrics', () => {
    it('should track processing metrics', async () => {
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      await workerPool.processImage(mockFile, filterConfig);
      
      const metrics = workerPool.getProcessingMetrics();
      expect(metrics).toHaveLength(0); // Metrics are cleaned up after processing
    });

    it('should provide detailed status information', () => {
      const status = workerPool.getDetailedStatus();
      
      expect(status).toHaveProperty('totalWorkers');
      expect(status).toHaveProperty('availableWorkers');
      expect(status).toHaveProperty('busyWorkers');
      expect(status).toHaveProperty('queuedTasks');
      expect(status).toHaveProperty('pendingTasks');
      expect(status).toHaveProperty('memoryUsage');
      expect(status).toHaveProperty('optimizationConfig');
    });
  });

  describe('Worker Pool Management', () => {
    it('should queue tasks when all workers are busy', async () => {
      const mockFile1 = new File(['mock1'], 'test1.jpg', { type: 'image/jpeg' });
      const mockFile2 = new File(['mock2'], 'test2.jpg', { type: 'image/jpeg' });
      const mockFile3 = new File(['mock3'], 'test3.jpg', { type: 'image/jpeg' });
      
      const filterConfig: FilterConfig = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      // Start processing multiple images
      const promises = [
        workerPool.processImage(mockFile1, filterConfig),
        workerPool.processImage(mockFile2, filterConfig),
        workerPool.processImage(mockFile3, filterConfig)
      ];

      // Check that tasks are queued
      const statusDuringProcessing = workerPool.getDetailedStatus();
      expect(statusDuringProcessing.queuedTasks + statusDuringProcessing.pendingTasks)
        .toBeGreaterThanOrEqual(1);

      // Wait for all to complete
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      
      // Check that queue is empty after processing
      const finalStatus = workerPool.getDetailedStatus();
      expect(finalStatus.queuedTasks).toBe(0);
      expect(finalStatus.pendingTasks).toBe(0);
    });

    it('should handle worker termination gracefully', () => {
      const initialStatus = workerPool.getDetailedStatus();
      expect(initialStatus.totalWorkers).toBe(2);
      
      // Simulate worker termination
      workerPool.destroy();
      
      const finalStatus = workerPool.getDetailedStatus();
      expect(finalStatus.totalWorkers).toBe(0);
    });
  });

  describe('Optimization Features', () => {
    it('should use optimized worker script', () => {
      // Test that the worker script contains optimization keywords
      const workerScript = (workerPool as any).getOptimizedWorkerScript();
      
      expect(workerScript).toContain('applyBrightnessOptimized');
      expect(workerScript).toContain('applyContrastOptimized');
      expect(workerScript).toContain('applySaturationOptimized');
      expect(workerScript).toContain('processImageOptimized');
    });

    it('should handle large image optimization', async () => {
      const largeFile = new File(['large image data'], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      
      // Mock large file size
      Object.defineProperty(largeFile, 'size', {
        value: 60 * 1024 * 1024, // 60MB
        writable: false
      });
      
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      const result = await workerPool.processImage(largeFile, filterConfig);
      
      expect(result).toHaveProperty('processedBlob');
      expect(result.processedBlob.size).toBeLessThan(largeFile.size);
    });
  });
});