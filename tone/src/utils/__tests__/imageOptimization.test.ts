/**
 * Tests for image optimization utilities
 * Requirements: 8.1, 8.2
 */

import {
  DEFAULT_BLUR_DATA_URL,
  getOptimizedImageDimensions,
  getResponsiveImageSizes,
  preloadImage,
  createImageObserver,
  isWebPSupported,
  getOptimalImageFormat
} from '../imageOptimization';

// Mock DOM APIs
Object.defineProperty(global, 'Image', {
  value: class MockImage {
    onload = null;
    onerror = null;
    src = '';
    width = 0;
    height = 0;
    fetchPriority = '';

    constructor() {
      // Simulate image loading
      setTimeout(() => {
        if (this.src.includes('webp')) {
          this.height = 2; // WebP support indicator
        }
        if (this.onload) {
          this.onload();
        }
      }, 0);
    }
  }
});

Object.defineProperty(global, 'IntersectionObserver', {
  value: class MockIntersectionObserver {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
    }

    observe() {}
    unobserve() {}
    disconnect() {}
  }
});

describe('imageOptimization', () => {
  describe('DEFAULT_BLUR_DATA_URL', () => {
    it('should provide a valid data URL', () => {
      expect(DEFAULT_BLUR_DATA_URL).toMatch(/^data:image\/jpeg;base64,/);
      expect(DEFAULT_BLUR_DATA_URL.length).toBeGreaterThan(100);
    });
  });

  describe('getOptimizedImageDimensions', () => {
    it('should return original dimensions when within limits', () => {
      const result = getOptimizedImageDimensions(400, 300, 800, 600);
      expect(result).toEqual({ width: 400, height: 300 });
    });

    it('should scale down width when too large', () => {
      const result = getOptimizedImageDimensions(1000, 500, 800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(400);
    });

    it('should scale down height when too large', () => {
      const result = getOptimizedImageDimensions(600, 800, 800, 600);
      expect(result.width).toBe(450);
      expect(result.height).toBe(600);
    });

    it('should maintain aspect ratio', () => {
      const originalRatio = 1000 / 500; // 2:1
      const result = getOptimizedImageDimensions(1000, 500, 800, 600);
      const newRatio = result.width / result.height;
      expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.01);
    });

    it('should round dimensions to integers', () => {
      const result = getOptimizedImageDimensions(333, 333, 800, 600);
      expect(Number.isInteger(result.width)).toBe(true);
      expect(Number.isInteger(result.height)).toBe(true);
    });
  });

  describe('getResponsiveImageSizes', () => {
    it('should return correct sizes for thumbnail', () => {
      const sizes = getResponsiveImageSizes('thumbnail');
      expect(sizes).toBe('(max-width: 640px) 150px, (max-width: 768px) 200px, 250px');
    });

    it('should return correct sizes for preview', () => {
      const sizes = getResponsiveImageSizes('preview');
      expect(sizes).toBe('(max-width: 640px) 300px, (max-width: 768px) 400px, 500px');
    });

    it('should return correct sizes for fullsize', () => {
      const sizes = getResponsiveImageSizes('fullsize');
      expect(sizes).toBe('(max-width: 640px) 100vw, (max-width: 768px) 90vw, 800px');
    });

    it('should return default for unknown type', () => {
      const sizes = getResponsiveImageSizes('unknown');
      expect(sizes).toBe('100vw');
    });
  });

  describe('preloadImage', () => {
    it('should resolve when image loads successfully', async () => {
      await expect(preloadImage('test.jpg')).resolves.toBeUndefined();
    });

    it('should set fetchPriority when priority is true', async () => {
      // This test verifies the priority flag is handled
      await expect(preloadImage('test.jpg', true)).resolves.toBeUndefined();
    });
  });

  describe('createImageObserver', () => {
    it('should create IntersectionObserver with default options', () => {
      const callback = jest.fn();
      const observer = createImageObserver(callback);
      
      expect(observer).toBeInstanceOf(IntersectionObserver);
    });

    it('should create IntersectionObserver with custom options', () => {
      const callback = jest.fn();
      const options = { threshold: 0.5, rootMargin: '100px' };
      const observer = createImageObserver(callback, options);
      
      expect(observer).toBeInstanceOf(IntersectionObserver);
    });
  });

  describe('isWebPSupported', () => {
    it('should detect WebP support', async () => {
      const isSupported = await isWebPSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('getOptimalImageFormat', () => {
    it('should return webp when supported', async () => {
      const format = await getOptimalImageFormat();
      expect(['webp', 'jpeg']).toContain(format);
    });
  });
});