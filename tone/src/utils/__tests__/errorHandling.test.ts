import {
  checkBrowserCapabilities,
  validateFileFormat,
  checkBrowserCompatibility,
  classifyProcessingError,
  attemptErrorRecovery,
  generateUserFriendlyMessage,
  ErrorStatistics,
  SUPPORTED_FILE_TYPES
} from '../errorHandling';

/**
 * エラーハンドリングユーティリティのテスト
 * Requirements: 3.3, 8.4
 */

// Mock navigator and window objects
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

const mockWindow = {
  location: {
    href: 'http://localhost:3000'
  }
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

// Mock document.createElement
global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return {
      getContext: jest.fn(() => ({
        // Mock 2D context
      }))
    };
  }
  return {};
});

describe('Browser Capabilities', () => {
  describe('checkBrowserCapabilities', () => {
    it('should detect basic browser capabilities', () => {
      const capabilities = checkBrowserCapabilities();
      
      expect(capabilities).toHaveProperty('webWorkers');
      expect(capabilities).toHaveProperty('canvas');
      expect(capabilities).toHaveProperty('fileAPI');
      expect(capabilities).toHaveProperty('webGL');
      expect(capabilities).toHaveProperty('imageData');
      expect(capabilities).toHaveProperty('offscreenCanvas');
    });

    it('should handle missing Worker support', () => {
      const originalWorker = global.Worker;
      delete (global as unknown as { Worker?: typeof Worker }).Worker;
      
      const capabilities = checkBrowserCapabilities();
      expect(capabilities.webWorkers).toBe(false);
      
      // Restore Worker
      (global as unknown as { Worker: typeof Worker }).Worker = originalWorker;
    });

    it('should handle missing File API support', () => {
      const originalFile = global.File;
      delete (global as unknown as { File?: typeof File }).File;
      
      const capabilities = checkBrowserCapabilities();
      expect(capabilities.fileAPI).toBe(false);
      
      // Restore File
      (global as unknown as { File: typeof File }).File = originalFile;
    });
  });

  describe('checkBrowserCompatibility', () => {
    it('should return null for compatible browsers', () => {
      // Mock all required capabilities as available
      jest.spyOn({ checkBrowserCapabilities }, 'checkBrowserCapabilities').mockReturnValue({
        webWorkers: true,
        canvas: true,
        fileAPI: true,
        webGL: true,
        imageData: true,
        offscreenCanvas: true
      });

      const error = checkBrowserCompatibility();
      expect(error).toBeNull();
    });

    it('should return error for missing required capabilities', () => {
      jest.spyOn(require('../errorHandling'), 'checkBrowserCapabilities').mockReturnValue({
        webWorkers: true,
        canvas: false, // Missing required capability
        fileAPI: true,
        webGL: true,
        imageData: true,
        offscreenCanvas: true
      });

      const error = checkBrowserCompatibility();
      expect(error).not.toBeNull();
      expect(error?.type).toBe('BROWSER_COMPATIBILITY');
      expect(error?.recoverable).toBe(false);
    });

    it('should return warning for missing Web Workers', () => {
      jest.spyOn(require('../errorHandling'), 'checkBrowserCapabilities').mockReturnValue({
        webWorkers: false, // Missing recommended capability
        canvas: true,
        fileAPI: true,
        webGL: true,
        imageData: true,
        offscreenCanvas: true
      });

      const error = checkBrowserCompatibility();
      expect(error).not.toBeNull();
      expect(error?.type).toBe('BROWSER_COMPATIBILITY');
      expect(error?.recoverable).toBe(true);
    });
  });
});

describe('File Validation', () => {
  describe('validateFileFormat', () => {
    it('should accept valid JPEG files', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const error = validateFileFormat(file);
      expect(error).toBeNull();
    });

    it('should accept valid PNG files', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      const error = validateFileFormat(file);
      expect(error).toBeNull();
    });

    it('should accept valid HEIC files', () => {
      const file = new File([''], 'test.heic', { type: 'image/heic' });
      const error = validateFileFormat(file);
      expect(error).toBeNull();
    });

    it('should reject unsupported file types', () => {
      const file = new File([''], 'test.gif', { type: 'image/gif' });
      const error = validateFileFormat(file);
      
      expect(error).not.toBeNull();
      expect(error?.type).toBe('FILE_FORMAT');
      expect(error?.recoverable).toBe(false);
    });

    it('should reject files without type', () => {
      const file = new File([''], 'test', { type: '' });
      const error = validateFileFormat(file);
      
      expect(error).not.toBeNull();
      expect(error?.type).toBe('FILE_FORMAT');
      expect(error?.recoverable).toBe(false);
    });

    it('should reject files that are too large', () => {
      const file = new File([''], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', {
        value: 150 * 1024 * 1024, // 150MB
        writable: false
      });
      
      const error = validateFileFormat(file);
      expect(error).not.toBeNull();
      expect(error?.type).toBe('FILE_FORMAT');
      expect(error?.recoverable).toBe(false);
    });

    it('should reject empty files', () => {
      const file = new File([''], 'empty.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', {
        value: 0,
        writable: false
      });
      
      const error = validateFileFormat(file);
      expect(error).not.toBeNull();
      expect(error?.type).toBe('FILE_FORMAT');
      expect(error?.recoverable).toBe(false);
    });

    it('should handle mismatched file extension and type', () => {
      const file = new File([''], 'test.png', { type: 'image/jpeg' });
      const error = validateFileFormat(file);
      
      expect(error).not.toBeNull();
      expect(error?.type).toBe('FILE_FORMAT');
      expect(error?.recoverable).toBe(true);
    });
  });
});

describe('Error Classification', () => {
  describe('classifyProcessingError', () => {
    const mockContext = {
      component: 'TestComponent',
      action: 'testAction',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    it('should classify memory errors', () => {
      const error = new Error('Out of memory');
      const classified = classifyProcessingError(error, mockContext);
      
      expect(classified.type).toBe('MEMORY');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify canvas errors', () => {
      const error = new Error('Canvas context could not be obtained');
      const classified = classifyProcessingError(error, mockContext);
      
      expect(classified.type).toBe('PROCESSING');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify file loading errors', () => {
      const error = new Error('Failed to load image');
      const classified = classifyProcessingError(error, mockContext);
      
      expect(classified.type).toBe('FILE_FORMAT');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify network errors', () => {
      const error = new Error('Network connection failed');
      const classified = classifyProcessingError(error, mockContext);
      
      expect(classified.type).toBe('NETWORK');
      expect(classified.recoverable).toBe(true);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Something unexpected happened');
      const classified = classifyProcessingError(error, mockContext);
      
      expect(classified.type).toBe('UNKNOWN');
      expect(classified.recoverable).toBe(true);
    });
  });
});

describe('Error Recovery', () => {
  describe('attemptErrorRecovery', () => {
    it('should not attempt recovery for non-recoverable errors', async () => {
      const error = {
        type: 'FILE_FORMAT' as const,
        message: 'Unsupported file format',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: false
      };

      const result = await attemptErrorRecovery(error, 0);
      expect(result).toBe(false);
    });

    it('should attempt recovery for recoverable processing errors', async () => {
      const error = {
        type: 'PROCESSING' as const,
        message: 'Processing failed',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: true
      };

      const result = await attemptErrorRecovery(error, 0);
      expect(typeof result).toBe('boolean');
    });

    it('should respect max retry limits', async () => {
      const error = {
        type: 'PROCESSING' as const,
        message: 'Processing failed',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: true
      };

      const result = await attemptErrorRecovery(error, 10); // High retry count
      expect(result).toBe(false);
    });
  });
});

describe('Error Messages', () => {
  describe('generateUserFriendlyMessage', () => {
    it('should generate message with suggestion', () => {
      const error = {
        type: 'FILE_FORMAT' as const,
        message: 'Unsupported file format',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: false,
        suggestedAction: 'Please use a supported format'
      };

      const message = generateUserFriendlyMessage(error);
      expect(message).toContain('Unsupported file format');
      expect(message).toContain('Please use a supported format');
    });

    it('should generate message without suggestion', () => {
      const error = {
        type: 'UNKNOWN' as const,
        message: 'Something went wrong',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: true
      };

      const message = generateUserFriendlyMessage(error);
      expect(message).toBe('Something went wrong');
    });
  });
});

describe('Error Statistics', () => {
  describe('ErrorStatistics', () => {
    let stats: ErrorStatistics;

    beforeEach(() => {
      stats = ErrorStatistics.getInstance();
      stats.reset();
    });

    it('should record errors correctly', () => {
      const error1 = {
        type: 'FILE_FORMAT' as const,
        message: 'Error 1',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: false
      };

      const error2 = {
        type: 'PROCESSING' as const,
        message: 'Error 2',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: true
      };

      stats.recordError(error1);
      stats.recordError(error2);
      stats.recordError(error1); // Same type again

      const statistics = stats.getStatistics();
      expect(statistics.totalErrors).toBe(3);
      expect(statistics.errorsByType.FILE_FORMAT).toBe(2);
      expect(statistics.errorsByType.PROCESSING).toBe(1);
      expect(statistics.mostCommonError).toBe('FILE_FORMAT');
    });

    it('should reset statistics correctly', () => {
      const error = {
        type: 'MEMORY' as const,
        message: 'Memory error',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        recoverable: true
      };

      stats.recordError(error);
      expect(stats.getStatistics().totalErrors).toBe(1);

      stats.reset();
      expect(stats.getStatistics().totalErrors).toBe(0);
    });

    it('should return singleton instance', () => {
      const stats1 = ErrorStatistics.getInstance();
      const stats2 = ErrorStatistics.getInstance();
      expect(stats1).toBe(stats2);
    });
  });
});