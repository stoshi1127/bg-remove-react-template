import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';
import * as errorHandling from '../../utils/errorHandling';

/**
 * ErrorBoundaryコンポーネントのテスト
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

Object.defineProperty(global, 'window', {
  value: { location: { href: 'http://localhost:3000', reload: jest.fn() } },
  writable: true
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockErrorHandling.classifyProcessingError.mockReturnValue({
      type: 'PROCESSING',
      message: 'Test processing error',
      context: {
        component: 'ErrorBoundary',
        action: 'componentDidCatch',
        timestamp: Date.now(),
        userAgent: 'test-agent',
        url: 'http://localhost:3000',
        additionalInfo: {
          componentStack: 'test stack',
          errorBoundary: true
        }
      },
      recoverable: true,
      suggestedAction: 'Please try again'
    });
    
    mockErrorHandling.logError.mockImplementation(() => {});
    mockErrorHandling.generateUserFriendlyMessage.mockImplementation((error) => 
      `${error.message}\n\n${error.suggestedAction || ''}`
    );

    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText(/Test processing error/)).toBeInTheDocument();
      expect(mockErrorHandling.classifyProcessingError).toHaveBeenCalled();
      expect(mockErrorHandling.logError).toHaveBeenCalled();
    });

    it('should call onError callback when provided', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'PROCESSING',
        message: 'Test processing error'
      }));
    });

    it('should display browser compatibility information for browser errors', () => {
      mockErrorHandling.classifyProcessingError.mockReturnValue({
        type: 'BROWSER_COMPATIBILITY',
        message: 'Browser not supported',
        context: {
          component: 'ErrorBoundary',
          action: 'componentDidCatch',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: false
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('ブラウザ情報')).toBeInTheDocument();
      expect(screen.getByText(/お使いのブラウザ:/)).toBeInTheDocument();
    });

    it('should display memory information for memory errors', () => {
      mockErrorHandling.classifyProcessingError.mockReturnValue({
        type: 'MEMORY',
        message: 'Out of memory',
        context: {
          component: 'ErrorBoundary',
          action: 'componentDidCatch',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('メモリ使用量を減らすためのヒント')).toBeInTheDocument();
      expect(screen.getByText(/他のタブやアプリケーションを閉じる/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should show retry button for recoverable errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    it('should not show retry button for non-recoverable errors', () => {
      mockErrorHandling.classifyProcessingError.mockReturnValue({
        type: 'BROWSER_COMPATIBILITY',
        message: 'Browser not supported',
        context: {
          component: 'ErrorBoundary',
          action: 'componentDidCatch',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: false
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('再試行')).not.toBeInTheDocument();
    });

    it('should retry when retry button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

      fireEvent.click(screen.getByText('再試行'));

      // After retry, the component should render normally
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should reset when reset button is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

      fireEvent.click(screen.getByText('リセット'));

      // After reset, the component should render normally
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should reload page when reload button is clicked', () => {
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { ...window.location, reload: mockReload },
        writable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('ページを再読み込み'));

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Technical Details', () => {
    it('should show technical details when expanded', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText('技術的な詳細');
      fireEvent.click(detailsElement);

      expect(screen.getByText(/エラーID:/)).toBeInTheDocument();
      expect(screen.getByText(/エラータイプ:/)).toBeInTheDocument();
      expect(screen.getByText(/発生時刻:/)).toBeInTheDocument();
    });

    it('should show original error information when available', () => {
      mockErrorHandling.classifyProcessingError.mockReturnValue({
        type: 'PROCESSING',
        message: 'Test processing error',
        originalError: new Error('Original error message'),
        context: {
          component: 'ErrorBoundary',
          action: 'componentDidCatch',
          timestamp: Date.now(),
          userAgent: 'test-agent',
          url: 'http://localhost:3000'
        },
        recoverable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText('技術的な詳細');
      fireEvent.click(detailsElement);

      expect(screen.getByText(/元のエラー:/)).toBeInTheDocument();
      expect(screen.getByText(/Original error message/)).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should use custom fallback when provided', () => {
      const customFallback = (error: Error, retry: () => void) => (
        <div>
          <p>Custom error: {error.message}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Custom error:/)).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });
  });

  describe('Retry Limits', () => {
    it('should limit the number of retries', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Retry multiple times
      for (let i = 0; i < 4; i++) {
        if (screen.queryByText('再試行')) {
          fireEvent.click(screen.getByText('再試行'));
          rerender(
            <ErrorBoundary>
              <ThrowError shouldThrow={true} />
            </ErrorBoundary>
          );
        }
      }

      // After max retries, retry button should not be available
      expect(screen.queryByText('再試行')).not.toBeInTheDocument();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent: React.FC = () => <div>Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const ErrorComponent: React.FC = () => {
      throw new Error('Wrapped component error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });

  it('should pass error boundary props to wrapper', () => {
    const onError = jest.fn();
    const TestComponent: React.FC = () => {
      throw new Error('Test error');
    };
    const WrappedComponent = withErrorBoundary(TestComponent, { onError });

    render(<WrappedComponent />);

    expect(onError).toHaveBeenCalled();
  });

  it('should set correct display name', () => {
    const TestComponent: React.FC = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';
    
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});