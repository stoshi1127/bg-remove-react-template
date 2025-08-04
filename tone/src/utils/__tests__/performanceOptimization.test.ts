import {
  getMemoryUsage,
  shouldOptimizeImage,
  calculateOptimalDimensions,
  calculateOptimalConcurrency,
  calculateOptimalBatchSize,
  createProcessingChunks,
  DEFAULT_OPTIMIZATION_CONFIG
} from '../performanceOptimization';

/**
 * パフォーマンス最適化ユーティリティのテスト
 * Requirements: 8.1, 8.2, 8.4
 */

describe('Performance Optimization Utils', () => {
  describe('getMemoryUsage', () => {
    it('should return memory usage information', () => {
      const memoryInfo = getMemoryUsage();
      
      expect(memoryInfo).toHaveProperty('usedJSHeapSize');
      expect(memoryInfo).toHaveProperty('totalJSHeapSize');
      expect(memoryInfo).toHaveProperty('jsHeapSizeLimit');
      expect(memoryInfo).toHaveProperty('memoryPressure');
      expect(['low', 'medium', 'high']).toContain(memoryInfo.memoryPressure);
    });

    it('should handle browsers without memory API', () => {
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;
      
      const memoryInfo = getMemoryUsage();
      
      expect(memoryInfo.usedJSHeapSize).toBe(0);
      expect(memoryInfo.totalJSHeapSize).toBe(0);
      expect(memoryInfo.jsHeapSizeLimit).toBe(0);
      expect(memoryInfo.memoryPressure).toBe('low');
      
      // Restore original memory object
      (performance as any).memory = originalMemory;
    });
  });

  describe('shouldOptimizeImage', () => {
    it('should return true for large files', () => {
      const largeFile = new File([''], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      Object.defineProperty(largeFile, 'size', { 
        value: 60 * 1024 * 1024, // 60MB
        writable: false 
      });
      
      expect(shouldOptimizeImage(largeFile)).toBe(true);
    });

    it('should return false for small files', () => {
      const smallFile = new File([''], 'small.jpg', { 
        type: 'image/jpeg' 
      });
      Object.defineProperty(smallFile, 'size', { 
        value: 1024 * 1024, // 1MB
        writable: false 
      });
      
      expect(shouldOptimizeImage(smallFile)).toBe(false);
    });

    it('should use custom config', () => {
      const file = new File([''], 'test.jpg', { 
        type: 'image/jpeg' 
      });
      Object.defineProperty(file, 'size', { 
        value: 5 * 1024 * 1024, // 5MB
        writable: false 
      });
      
      const customConfig = {
        ...DEFAULT_OPTIMIZATION_CONFIG,
        maxFileSize: 3 * 1024 * 1024 // 3MB
      };
      
      expect(shouldOptimizeImage(file, customConfig)).toBe(true);
    });
  });

  describe('calculateOptimalDimensions', () => {
    it('should not resize images within limits', () => {
      const result = calculateOptimalDimensions(1920, 1080);
      
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.shouldResize).toBe(false);
    });

    it('should resize large images maintaining aspect ratio', () => {
      const result = calculateOptimalDimensions(8000, 6000);
      
      expect(result.shouldResize).toBe(true);
      expect(result.width).toBeLessThanOrEqual(4096);
      expect(result.height).toBeLessThanOrEqual(4096);
      
      // Check aspect ratio is maintained
      const originalRatio = 8000 / 6000;
      const newRatio = result.width / result.height;
      expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.01);
    });

    it('should handle portrait orientation', () => {
      const result = calculateOptimalDimensions(3000, 8000);
      
      expect(result.shouldResize).toBe(true);
      expect(result.width).toBeLessThanOrEqual(4096);
      expect(result.height).toBeLessThanOrEqual(4096);
      
      // Should maintain portrait orientation
      expect(result.height).toBeGreaterThan(result.width);
    });

    it('should use custom config limits', () => {
      const customConfig = {
        ...DEFAULT_OPTIMIZATION_CONFIG,
        maxWidth: 2048,
        maxHeight: 2048
      };
      
      const result = calculateOptimalDimensions(4000, 3000, customConfig);
      
      expect(result.shouldResize).toBe(true);
      expect(result.width).toBeLessThanOrEqual(2048);
      expect(result.height).toBeLessThanOrEqual(2048);
    });
  });

  describe('calculateOptimalConcurrency', () => {
    it('should return a reasonable concurrency value', () => {
      const concurrency = calculateOptimalConcurrency();
      
      expect(concurrency).toBeGreaterThan(0);
      expect(concurrency).toBeLessThanOrEqual(8);
    });

    it('should consider hardware concurrency', () => {
      const originalConcurrency = navigator.hardwareConcurrency;
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true
      });
      
      const concurrency = calculateOptimalConcurrency();
      expect(concurrency).toBeGreaterThan(0);
      expect(concurrency).toBeLessThanOrEqual(2);
      
      // Restore original value
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: originalConcurrency,
        configurable: true
      });
    });
  });

  describe('calculateOptimalBatchSize', () => {
    it('should return reasonable batch size', () => {
      const batchSize = calculateOptimalBatchSize(20, 5 * 1024 * 1024);
      
      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBeLessThanOrEqual(20);
      expect(batchSize).toBeLessThanOrEqual(10); // Max batch size limit
    });

    it('should handle small image counts', () => {
      const batchSize = calculateOptimalBatchSize(3, 1024 * 1024);
      
      expect(batchSize).toBe(3);
    });

    it('should consider average file size', () => {
      const largeBatchSize = calculateOptimalBatchSize(100, 100 * 1024); // Small files
      const smallBatchSize = calculateOptimalBatchSize(100, 50 * 1024 * 1024); // Large files
      
      expect(largeBatchSize).toBeGreaterThanOrEqual(smallBatchSize);
    });
  });

  describe('createProcessingChunks', () => {
    it('should create correct number of chunks', () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const chunks = createProcessingChunks(items, 3);
      
      expect(chunks).toHaveLength(4); // [0,1,2], [3,4,5], [6,7,8], [9]
      expect(chunks[0]).toEqual([0, 1, 2]);
      expect(chunks[1]).toEqual([3, 4, 5]);
      expect(chunks[2]).toEqual([6, 7, 8]);
      expect(chunks[3]).toEqual([9]);
    });

    it('should handle exact divisions', () => {
      const items = Array.from({ length: 9 }, (_, i) => i);
      const chunks = createProcessingChunks(items, 3);
      
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([0, 1, 2]);
      expect(chunks[1]).toEqual([3, 4, 5]);
      expect(chunks[2]).toEqual([6, 7, 8]);
    });

    it('should handle empty arrays', () => {
      const chunks = createProcessingChunks([], 3);
      
      expect(chunks).toHaveLength(0);
    });

    it('should handle chunk size larger than array', () => {
      const items = [1, 2, 3];
      const chunks = createProcessingChunks(items, 5);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });
  });
});

describe('Performance Metrics', () => {
  it('should calculate processing metrics correctly', () => {
    const { calculateProcessingMetrics } = require('../performanceOptimization');
    
    const startTime = 1000;
    const endTime = 2000;
    const memoryBefore = {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
      memoryPressure: 'low' as const
    };
    const memoryAfter = {
      usedJSHeapSize: 1200000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
      memoryPressure: 'low' as const
    };
    const originalFileSize = 5000000;
    const processedFileSize = 3000000;
    
    const metrics = calculateProcessingMetrics(
      startTime,
      endTime,
      memoryBefore,
      memoryAfter,
      originalFileSize,
      processedFileSize
    );
    
    expect(metrics.processingTime).toBe(1000);
    expect(metrics.compressionRatio).toBe(0.6);
    expect(metrics.memoryBefore).toBe(memoryBefore);
    expect(metrics.memoryAfter).toBe(memoryAfter);
  });
});

describe('Memory Management', () => {
  it('should handle memory cleanup gracefully', () => {
    const { performMemoryCleanup } = require('../performanceOptimization');
    
    // Should not throw error even if gc is not available
    expect(() => performMemoryCleanup()).not.toThrow();
  });
});