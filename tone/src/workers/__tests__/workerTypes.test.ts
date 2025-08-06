import { 
  WorkerMessage, 
  WorkerResponse, 
  ProcessingTask, 
  ProcessedImageResult, 
  WorkerPool 
} from '../workerTypes';
import { FilterConfig } from '../../types/filter';

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
} as unknown as typeof ImageData;

describe('Worker Types', () => {
  describe('WorkerMessage', () => {
    it('should have correct structure for PROCESS_IMAGE message', () => {
      const mockImageData = new ImageData(new Uint8ClampedArray(4), 1, 1);
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 5,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };

      const message: WorkerMessage = {
        id: 'test-id',
        type: 'PROCESS_IMAGE',
        payload: {
          imageData: mockImageData,
          filterConfig,
          width: 100,
          height: 100
        }
      };

      expect(message.id).toBe('test-id');
      expect(message.type).toBe('PROCESS_IMAGE');
      expect(message.payload.imageData).toBe(mockImageData);
      expect(message.payload.filterConfig).toEqual(filterConfig);
      expect(message.payload.width).toBe(100);
      expect(message.payload.height).toBe(100);
    });
  });

  describe('WorkerResponse', () => {
    it('should have correct structure for PROCESS_COMPLETE response', () => {
      const mockImageData = new ImageData(new Uint8ClampedArray(4), 1, 1);
      
      const response: WorkerResponse = {
        id: 'test-id',
        type: 'PROCESS_COMPLETE',
        payload: {
          imageData: mockImageData
        }
      };

      expect(response.id).toBe('test-id');
      expect(response.type).toBe('PROCESS_COMPLETE');
      expect(response.payload.imageData).toBe(mockImageData);
      expect(response.payload.error).toBeUndefined();
    });

    it('should have correct structure for PROCESS_ERROR response', () => {
      const response: WorkerResponse = {
        id: 'test-id',
        type: 'PROCESS_ERROR',
        payload: {
          error: 'Processing failed'
        }
      };

      expect(response.id).toBe('test-id');
      expect(response.type).toBe('PROCESS_ERROR');
      expect(response.payload.error).toBe('Processing failed');
      expect(response.payload.imageData).toBeUndefined();
    });
  });

  describe('ProcessingTask', () => {
    it('should have correct structure', () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const filterConfig: FilterConfig = {
        brightness: 10,
        contrast: 0,
        saturation: 0,
        hue: 0,
        sharpness: 0,
        warmth: 0
      };
      const mockResolve = jest.fn();
      const mockReject = jest.fn();

      const task: ProcessingTask = {
        id: 'task-id',
        file: mockFile,
        filterConfig,
        resolve: mockResolve,
        reject: mockReject
      };

      expect(task.id).toBe('task-id');
      expect(task.file).toBe(mockFile);
      expect(task.filterConfig).toEqual(filterConfig);
      expect(task.resolve).toBe(mockResolve);
      expect(task.reject).toBe(mockReject);
    });
  });

  describe('ProcessedImageResult', () => {
    it('should have correct structure', () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      
      const result: ProcessedImageResult = {
        id: 'result-id',
        processedBlob: mockBlob,
        processingTime: 1500
      };

      expect(result.id).toBe('result-id');
      expect(result.processedBlob).toBe(mockBlob);
      expect(result.processingTime).toBe(1500);
    });
  });

  describe('WorkerPool', () => {
    it('should have correct structure', () => {
      const mockWorker1 = {} as Worker;
      const mockWorker2 = {} as Worker;
      const mockTask: ProcessingTask = {
        id: 'task-id',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        filterConfig: {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hue: 0,
          sharpness: 0,
          warmth: 0
        },
        resolve: jest.fn(),
        reject: jest.fn()
      };

      const pool: WorkerPool = {
        workers: [mockWorker1, mockWorker2],
        availableWorkers: [mockWorker1],
        busyWorkers: new Set([mockWorker2]),
        taskQueue: [mockTask]
      };

      expect(pool.workers).toHaveLength(2);
      expect(pool.availableWorkers).toHaveLength(1);
      expect(pool.busyWorkers.size).toBe(1);
      expect(pool.taskQueue).toHaveLength(1);
      expect(pool.busyWorkers.has(mockWorker2)).toBe(true);
      expect(pool.taskQueue[0]).toBe(mockTask);
    });
  });
});