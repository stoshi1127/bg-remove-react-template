import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, useErrorMessages } from '../useErrorHandler';
import * as errorHandling from '../../utils/errorHandling';

/**
 * エラーハンドリングフックのテスト
 * Requirements: 3.3, 8.4
 */

// Mock the error handling utilities
jest.mock('../../utils/errorHandling');

const mockErrorHandling = errorHandling as jest.Mocked<typeof errorHandling>;

// Mock navigator and window
Object.defineProperty(global, 'navigator', {
  value: { userAgent: 'test-agent' },
  writable: true
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000' },
  writable: true
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockErrorHandling.validateFileFormat.mockReturnValue(null);
    mockErrorHandling.checkBrowserCompatibility.mockReturnValue(null);
    mockErrorHandling.classifyProcessingError.mockReturnValue({
      type: 'PROCESSING',
      message: 'Test error',
      context: {
        component: 'TestComponent',
        action: 'testAction',
        timestamp: Date.now(),
        userAgent: 'test-agent',
        url: 'http://localhost:3000'
      },
      recoverable: true
    });
    mockErrorHandling.attemptErrorRecovery.mockResolvedValue(true);
    mockErrorHandling.logError.mockImplementation(() => {});
    
    // Mock ErrorStatistics
    const mockStats = {
      recordError: jest.fn(),
      getStatistics: jest.fn(() => ({
        totalErrors: 0,
        errorsByType: {},
        mostCommonError: null
      })),
      reset: jest.fn()
    };
    mockErrorHandling.ErrorStatistics.getInstance = jest.fn(() => mockStats);
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useErrorHandler());
      const [state] = result.current;

      expect(state.errors).toEqual([]);
      expect(state.isRecovering).toBe(false);
      expect(state.lastError).toBeNull();
      expect(state.errorCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle JavaScript errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const testError = new Error('Test error');
      
      await act(async () => {
        await actions.handleError(testError);
      });

      const [state] = result.current;
      expect(state.errors).toHaveLength(1);
      expect(state.errorCount).toBe(1);
      expect(state.lastError).not.toBeNull();
      expect(mockErrorHandling.classifyProcessingError).toHaveBeenCalledWith(testError, expect.any(Object));
      expect(mockErrorHandling.logError).toHaveBeenCalled();
    });

    it('should handle ProcessingError objects', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const processingError = {
        type: 'FILE_FORMAT' as const,
        message: 'Invalid file format',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: false
      };
      
      await act(async () => {
        await actions.handleError(processingError);
      });

      const [state] = result.current;
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toBe(processingError);
      expect(mockErrorHandling.classifyProcessingError).not.toHaveBeenCalled();
    });

    it('should call onError callback', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));
      const [, actions] = result.current;

      const testError = new Error('Test error');
      
      await act(async () => {
        await actions.handleError(testError);
      });

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'PROCESSING',
        message: 'Test error'
      }));
    });
  });

  describe('Auto Recovery', () => {
    it('should attempt auto recovery for recoverable errors', async () => {
      const { result } = renderHook(() => useErrorHandler({ enableAutoRecovery: true }));
      const [, actions] = result.current;

      const testError = new Error('Recoverable error');
      
      await act(async () => {
        const recovered = await actions.handleError(testError);
        expect(recovered).toBe(true);
      });

      expect(mockErrorHandling.attemptErrorRecovery).toHaveBeenCalled();
    });

    it('should not attempt auto recovery when disabled', async () => {
      const { result } = renderHook(() => useErrorHandler({ enableAutoRecovery: false }));
      const [, actions] = result.current;

      const testError = new Error('Test error');
      
      await act(async () => {
        const recovered = await actions.handleError(testError);
        expect(recovered).toBe(false);
      });

      expect(mockErrorHandling.attemptErrorRecovery).not.toHaveBeenCalled();
    });

    it('should call onRecovery callback', async () => {
      const onRecovery = jest.fn();
      const { result } = renderHook(() => useErrorHandler({ 
        enableAutoRecovery: true,
        onRecovery 
      }));
      const [, actions] = result.current;

      const testError = new Error('Test error');
      
      await act(async () => {
        await actions.handleError(testError);
      });

      expect(onRecovery).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PROCESSING' }),
        true
      );
    });
  });

  describe('File Validation', () => {
    it('should validate files successfully', () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      
      act(() => {
        const error = actions.validateFile(file);
        expect(error).toBeNull();
      });

      expect(mockErrorHandling.validateFileFormat).toHaveBeenCalledWith(file);
    });

    it('should handle file validation errors', () => {
      const validationError = {
        type: 'FILE_FORMAT' as const,
        message: 'Invalid file',
        context: {
          component: 'FileValidator',
          action: 'validateFormat',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: false
      };

      mockErrorHandling.validateFileFormat.mockReturnValue(validationError);

      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      const file = new File([''], 'test.txt', { type: 'text/plain' });
      
      act(() => {
        const error = actions.validateFile(file);
        expect(error).toBe(validationError);
      });

      const [state] = result.current;
      expect(state.errors).toContain(validationError);
    });
  });

  describe('Browser Compatibility', () => {
    it('should check browser compatibility successfully', () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      act(() => {
        const error = actions.checkCompatibility();
        expect(error).toBeNull();
      });

      expect(mockErrorHandling.checkBrowserCompatibility).toHaveBeenCalled();
    });

    it('should handle compatibility errors', () => {
      const compatibilityError = {
        type: 'BROWSER_COMPATIBILITY' as const,
        message: 'Browser not supported',
        context: {
          component: 'BrowserCompatibilityChecker',
          action: 'checkCompatibility',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: false
      };

      mockErrorHandling.checkBrowserCompatibility.mockReturnValue(compatibilityError);

      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      act(() => {
        const error = actions.checkCompatibility();
        expect(error).toBe(compatibilityError);
      });

      const [state] = result.current;
      expect(state.errors).toContain(compatibilityError);
    });
  });

  describe('Error Management', () => {
    it('should clear all errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      // Add some errors first
      await act(async () => {
        await actions.handleError(new Error('Error 1'));
        await actions.handleError(new Error('Error 2'));
      });

      let [state] = result.current;
      expect(state.errors).toHaveLength(2);

      // Clear all errors
      act(() => {
        actions.clearErrors();
      });

      [state] = result.current;
      expect(state.errors).toHaveLength(0);
      expect(state.lastError).toBeNull();
    });

    it('should clear specific error', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      // Add some errors first
      await act(async () => {
        await actions.handleError(new Error('Error 1'));
        await actions.handleError(new Error('Error 2'));
      });

      let [state] = result.current;
      expect(state.errors).toHaveLength(2);

      // Clear first error
      act(() => {
        actions.clearError(0);
      });

      [state] = result.current;
      expect(state.errors).toHaveLength(1);
    });

    it('should retry last error', async () => {
      const { result } = renderHook(() => useErrorHandler({ enableAutoRecovery: false }));
      const [, actions] = result.current;

      // Add an error first
      await act(async () => {
        await actions.handleError(new Error('Test error'));
      });

      // Retry the last error
      await act(async () => {
        const recovered = await actions.retryLastError();
        expect(recovered).toBe(true);
      });

      expect(mockErrorHandling.attemptErrorRecovery).toHaveBeenCalled();
    });

    it('should not retry non-recoverable errors', async () => {
      mockErrorHandling.classifyProcessingError.mockReturnValue({
        type: 'FILE_FORMAT',
        message: 'Non-recoverable error',
        context: {
          component: 'TestComponent',
          action: 'testAction',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: false
      });

      const { result } = renderHook(() => useErrorHandler({ enableAutoRecovery: false }));
      const [, actions] = result.current;

      // Add a non-recoverable error
      await act(async () => {
        await actions.handleError(new Error('Non-recoverable error'));
      });

      // Try to retry
      await act(async () => {
        const recovered = await actions.retryLastError();
        expect(recovered).toBe(false);
      });

      expect(mockErrorHandling.attemptErrorRecovery).not.toHaveBeenCalled();
    });
  });

  describe('Error Statistics', () => {
    it('should provide error statistics', () => {
      const mockStats = {
        totalErrors: 5,
        errorsByType: { PROCESSING: 3, FILE_FORMAT: 2 },
        mostCommonError: 'PROCESSING'
      };

      const mockStatsInstance = {
        recordError: jest.fn(),
        getStatistics: jest.fn(() => mockStats),
        reset: jest.fn()
      };

      mockErrorHandling.ErrorStatistics.getInstance = jest.fn(() => mockStatsInstance);

      const { result } = renderHook(() => useErrorHandler());
      const [, actions] = result.current;

      act(() => {
        const stats = actions.getErrorStatistics();
        expect(stats).toBe(mockStats);
      });
    });
  });
});

describe('useErrorMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockErrorHandling.generateUserFriendlyMessage.mockImplementation((error) => 
      `User friendly: ${error.message}`
    );
  });

  it('should provide display messages', async () => {
    const { result } = renderHook(() => useErrorMessages());
    const actions = result.current;

    // Add an error
    await act(async () => {
      await actions.handleError(new Error('Test error'));
    });

    const displayMessages = result.current.displayMessages;
    expect(displayMessages).toHaveLength(1);
    expect(displayMessages[0]).toHaveProperty('id');
    expect(displayMessages[0]).toHaveProperty('message');
    expect(displayMessages[0]).toHaveProperty('type');
    expect(displayMessages[0]).toHaveProperty('recoverable');
    expect(displayMessages[0]).toHaveProperty('timestamp');
    expect(displayMessages[0].message).toContain('User friendly');
  });
});