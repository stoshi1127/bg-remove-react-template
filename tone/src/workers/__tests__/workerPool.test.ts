import { ImageProcessingWorkerPool } from '../workerPool';
import { FilterConfig } from '../../types/filter';

// Mock Canvas API and related functions
const mockCanvas = {
  width: 100,
  height: 100,
  getContext: jest.fn(),
  toBlob: jest.fn()
} as unknown as HTMLCanvasElement;

const mockContext = {
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  drawImage: jest.fn()
} as unknown as CanvasRenderingContext2D;

// Mock ImageData constructor
global.ImageData = class ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height || data.length / (width * 4);
  }
} as any;

const mockImageData = new ImageData(new Uint8ClampedArray(100 * 100 * 4), 100, 100);

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 100;
  height = 100;
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as any;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-worker-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement
global.document.createElement = jest.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  return {} as any;
});

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  constructor(public url: string) {}
  
  postMessage(data: any) {
    // Simulate async processing
    setTimeout(() => {
      if (this.onmessage) {
        const response = {
          data: {
            id: data.id,
            type: 'PROCESS_COMPLETE',
            payload: {
              imageData: mockImageData
            }
          }
        };
        this.onmessage(response as MessageEvent);
      }
    }, 10);
  }
  
  terminate() {
    // Mock terminate
  }
}

global.Worker = MockWorker as any;

// Mock navigator.hardwareConcurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 4
});

describe('ImageProcessingWorkerPool', () => {
  let workerPool: ImageProcessingWorkerPool;
  
  beforeEach(() => {
    jest.clearAllMocks();
    (mockCanvas.getContext as jest.Mock).mockReturnValue(mockContext);
    (mockContext.getImageData as jest.Mock).mockReturnValue(mockImageData);
    (mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
      callback(new Blob(['test'], { type: 'image/jpeg' }));
    });
  });

  afterEach(() => {
    if (workerPool) {
      workerPool.destroy();
    }
  });

  describe('Constructor', () => {
    it('should create worker pool with default number of workers', () => {
      workerPool = new ImageProcessingWorkerPool();
      const status = workerPool.getStatus();
      
      expect(status.totalWorkers).toBe(4); // navigator.hardwareConcurrency
      expect(status.availableWorkers).toBe(4);
      expect(status.busyWorkers).toBe(0);
      expect(status.queuedTasks).toBe(0);
    });

    it('should create worker pool with specified number of workers', () => {
      workerPool = new ImageProcessingWorkerPool(2);
      const status = workerPool.getStatus();
      
      expect(status.totalWorkers).toBe(2);
      expect(status.availableWorkers).toBe(2);
    });

    it('should limit maximum workers to 8', () => {
      workerPool = new ImageProcessingWorkerPool(16);
      const status = workerPool.getStatus();
      
      expect(status.totalWorkers).toBe(8);
    });

    it('should create workers and revoke blob URLs', () => {
      workerPool = new ImageProcessingWorkerPool(2);
      
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  describe('processImage', () => {
    beforeEach(() => {
      workerPool = new ImageProcessingWorkerPool(2);
    });

    it('should process single image successfully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
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

    it('should handle processing errors', async () => {
      // Mock worker to return error
      const originalWorker = global.Worker;
      global.Worker = class extends MockWorker {
        postMessage(data: any) {
          setTimeout(() => {
            if (this.onmessage) {
              const response = {
                data: {
                  id: data.id,
                  type: 'PROCESS_ERROR',
                  payload: {
                    error: 'Processing failed'
                  }
                }
              };
              this.onmessage(response as MessageEvent);
            }
          }, 10);
        }
      } as any;

      workerPool.destroy();
      workerPool = new ImageProcessingWorkerPool(1);

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      await expect(workerPool.processImage(mockFile, filterConfig))
        .rejects.toThrow('Processing failed');

      global.Worker = originalWorker;
    });

    it('should handle canvas context errors', async () => {
      (mockCanvas.getContext as jest.Mock).mockReturnValue(null);

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      await expect(workerPool.processImage(mockFile, filterConfig))
        .rejects.toThrow('Canvas context could not be obtained');
    });
  });

  describe('processImages', () => {
    beforeEach(() => {
      workerPool = new ImageProcessingWorkerPool(2);
    });

    it('should process multiple images in parallel', async () => {
      const mockFiles = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
        new File(['test3'], 'test3.jpg', { type: 'image/jpeg' })
      ];
      
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 5,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      const results = await workerPool.processImages(mockFiles, filterConfig);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('processedBlob');
        expect(result).toHaveProperty('processingTime');
        expect(result.processedBlob).toBeInstanceOf(Blob);
      });
    }, 10000);

    it('should handle mixed success and failure', async () => {
      // Mock worker to fail on second message
      let messageCount = 0;
      const originalWorker = global.Worker;
      global.Worker = class extends MockWorker {
        postMessage(data: any) {
          messageCount++;
          setTimeout(() => {
            if (this.onmessage) {
              const response = messageCount === 2 ? {
                data: {
                  id: data.id,
                  type: 'PROCESS_ERROR',
                  payload: { error: 'Processing failed' }
                }
              } : {
                data: {
                  id: data.id,
                  type: 'PROCESS_COMPLETE',
                  payload: { imageData: mockImageData }
                }
              };
              this.onmessage(response as MessageEvent);
            }
          }, 10);
        }
      } as any;

      workerPool.destroy();
      workerPool = new ImageProcessingWorkerPool(2);

      const mockFiles = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ];
      
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      await expect(workerPool.processImages(mockFiles, filterConfig))
        .rejects.toThrow('Processing failed');

      global.Worker = originalWorker;
    });
  });

  describe('Worker Management', () => {
    beforeEach(() => {
      workerPool = new ImageProcessingWorkerPool(2);
    });

    it('should track worker status correctly', () => {
      const initialStatus = workerPool.getStatus();
      expect(initialStatus.totalWorkers).toBe(2);
      expect(initialStatus.availableWorkers).toBe(2);
      expect(initialStatus.busyWorkers).toBe(0);
      expect(initialStatus.queuedTasks).toBe(0);
      expect(initialStatus.pendingTasks).toBe(0);
    });

    it('should queue tasks when all workers are busy', async () => {
      // Create more tasks than workers
      const mockFiles = Array.from({ length: 4 }, (_, i) => 
        new File([`test${i}`], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      // Start processing (don't await yet)
      const promises = mockFiles.map(file => workerPool.processImage(file, filterConfig));

      // Check status while processing
      await new Promise(resolve => setTimeout(resolve, 5)); // Small delay
      const status = workerPool.getStatus();
      
      expect(status.busyWorkers + status.queuedTasks + status.pendingTasks).toBeGreaterThan(0);

      // Wait for all to complete
      const results = await Promise.all(promises);
      expect(results).toHaveLength(4);
    }, 10000);
  });

  describe('destroy', () => {
    it('should terminate all workers and clear state', () => {
      workerPool = new ImageProcessingWorkerPool(2);
      
      const terminateSpy = jest.spyOn(MockWorker.prototype, 'terminate');
      
      workerPool.destroy();
      
      expect(terminateSpy).toHaveBeenCalledTimes(2);
      
      const status = workerPool.getStatus();
      expect(status.totalWorkers).toBe(0);
      expect(status.availableWorkers).toBe(0);
      expect(status.busyWorkers).toBe(0);
      expect(status.queuedTasks).toBe(0);
      expect(status.pendingTasks).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      workerPool = new ImageProcessingWorkerPool(1);
    });

    it('should handle worker errors gracefully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      // Simulate worker error
      const workers = (workerPool as any).pool.workers;
      const worker = workers[0];
      
      // Start processing
      const promise = workerPool.processImage(mockFile, filterConfig);
      
      // Trigger worker error
      setTimeout(() => {
        if (worker.onerror) {
          worker.onerror(new ErrorEvent('error', { error: new Error('Worker crashed') }));
        }
      }, 5);

      // Should continue processing with remaining workers
      const status = workerPool.getStatus();
      expect(status.totalWorkers).toBe(1);
    });

    it('should handle blob conversion errors', async () => {
      (mockCanvas.toBlob as jest.Mock).mockImplementation((callback) => {
        callback(null); // Simulate blob conversion failure
      });

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      await expect(workerPool.processImage(mockFile, filterConfig))
        .rejects.toThrow('Failed to convert processed image');
    });
  });
});