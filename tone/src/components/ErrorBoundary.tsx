'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ProcessingError, ErrorContext, classifyProcessingError, logError, generateUserFriendlyMessage } from '../utils/errorHandling';
import styles from './ErrorBoundary.module.css';

/**
 * エラーバウンダリーのプロパティ
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: ProcessingError, retry: () => void) => ReactNode;
  onError?: (error: ProcessingError) => void;
}

/**
 * エラーバウンダリーの状態
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: ProcessingError | null;
  errorId: string | null;
}

/**
 * React エラーバウンダリーコンポーネント
 * Requirements: 3.3, 8.4
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // エラーが発生したことを示すstate更新
    return {
      hasError: true,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context: ErrorContext = {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      additionalInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    };

    const processingError = classifyProcessingError(error, context);
    
    // エラーをログに記録
    logError(processingError);
    
    // 状態を更新
    this.setState({ error: processingError });
    
    // 親コンポーネントにエラーを通知
    if (this.props.onError) {
      this.props.onError(processingError);
    }
  }

  /**
   * エラーからの回復を試行
   */
  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorId: null
      });
    }
  };

  /**
   * エラー状態をリセット
   */
  resetError = () => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // カスタムフォールバックが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // デフォルトのエラー表示
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          canRetry={this.retryCount < this.maxRetries}
          onRetry={this.handleRetry}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * デフォルトのエラーフォールバックコンポーネント
 */
interface DefaultErrorFallbackProps {
  error: ProcessingError;
  errorId: string | null;
  canRetry: boolean;
  onRetry: () => void;
  onReset: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorId,
  canRetry,
  onRetry,
  onReset
}) => {
  const userMessage = generateUserFriendlyMessage(error);
  
  return (
    <div 
      className={styles.errorBoundary}
      role="alert"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div className={styles.errorIcon}>
        ⚠️
      </div>
      
      <h2 id="error-title" className={styles.errorTitle}>
        エラーが発生しました
      </h2>
      
      <div id="error-description" className={styles.errorDescription}>
        <p className={styles.errorMessage}>
          {userMessage}
        </p>
        
        {error.type === 'BROWSER_COMPATIBILITY' && (
          <div className={styles.browserInfo}>
            <h3>ブラウザ情報</h3>
            <p>お使いのブラウザ: {navigator.userAgent}</p>
            <p>推奨ブラウザ: Chrome、Firefox、Safari、Edge の最新版</p>
          </div>
        )}
        
        {error.type === 'MEMORY' && (
          <div className={styles.memoryInfo}>
            <h3>メモリ使用量を減らすためのヒント</h3>
            <ul>
              <li>他のタブやアプリケーションを閉じる</li>
              <li>画像のサイズを小さくする</li>
              <li>一度に処理する画像の数を減らす</li>
            </ul>
          </div>
        )}
      </div>
      
      <div className={styles.errorActions}>
        {canRetry && error.recoverable && (
          <button
            className={styles.retryButton}
            onClick={onRetry}
            aria-label="エラーから回復を試行"
          >
            再試行
          </button>
        )}
        
        <button
          className={styles.resetButton}
          onClick={onReset}
          aria-label="アプリケーションをリセット"
        >
          リセット
        </button>
        
        <button
          className={styles.reloadButton}
          onClick={() => typeof window !== 'undefined' && window.location.reload()}
          aria-label="ページを再読み込み"
        >
          ページを再読み込み
        </button>
      </div>
      
      {errorId && (
        <div className={styles.errorDetails}>
          <details>
            <summary>技術的な詳細</summary>
            <div className={styles.technicalInfo}>
              <p><strong>エラーID:</strong> {errorId}</p>
              <p><strong>エラータイプ:</strong> {error.type}</p>
              <p><strong>発生時刻:</strong> {new Date(error.context.timestamp).toLocaleString()}</p>
              <p><strong>コンポーネント:</strong> {error.context.component}</p>
              <p><strong>アクション:</strong> {error.context.action}</p>
              {error.originalError && (
                <>
                  <p><strong>元のエラー:</strong> {error.originalError.name}</p>
                  <p><strong>メッセージ:</strong> {error.originalError.message}</p>
                </>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

/**
 * 関数型コンポーネント用のエラーバウンダリーフック
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundary;