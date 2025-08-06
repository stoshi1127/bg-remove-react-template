import { useState, useCallback, useRef } from 'react';
import {
  ProcessingError,
  ErrorContext,
  validateFileFormat,
  checkBrowserCompatibility,
  classifyProcessingError,
  attemptErrorRecovery,
  logError,
  generateUserFriendlyMessage,
  ErrorStatistics
} from '../utils/errorHandling';

/**
 * エラーハンドリング用カスタムフック
 * Requirements: 3.3, 8.4
 */

export interface UseErrorHandlerOptions {
  maxRetries?: number;
  enableAutoRecovery?: boolean;
  onError?: (error: ProcessingError) => void;
  onRecovery?: (error: ProcessingError, success: boolean) => void;
}

export interface ErrorHandlerState {
  errors: ProcessingError[];
  isRecovering: boolean;
  lastError: ProcessingError | null;
  errorCount: number;
}

export interface ErrorHandlerActions {
  handleError: (error: Error | ProcessingError, context?: Partial<ErrorContext>) => Promise<boolean>;
  validateFile: (file: File) => ProcessingError | null;
  checkCompatibility: () => ProcessingError | null;
  clearErrors: () => void;
  clearError: (errorIndex: number) => void;
  retryLastError: () => Promise<boolean>;
  getErrorStatistics: () => ReturnType<ErrorStatistics['getStatistics']>;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): [ErrorHandlerState, ErrorHandlerActions] {
  const {
    maxRetries = 3,
    enableAutoRecovery = true,
    onError,
    onRecovery
  } = options;

  const [state, setState] = useState<ErrorHandlerState>({
    errors: [],
    isRecovering: false,
    lastError: null,
    errorCount: 0
  });

  const retryCountsRef = useRef<Map<string, number>>(new Map());
  const errorStatsRef = useRef(ErrorStatistics.getInstance());

  /**
   * エラーを処理し、必要に応じて回復を試行
   */
  const handleError = useCallback(async (
    error: Error | ProcessingError,
    contextOverride?: Partial<ErrorContext>
  ): Promise<boolean> => {
    let processingError: ProcessingError;

    // ProcessingErrorかどうかチェック
    if ('type' in error && 'context' in error) {
      processingError = error as ProcessingError;
    } else {
      // 通常のErrorをProcessingErrorに変換
      const context: ErrorContext = {
        component: 'useErrorHandler',
        action: 'handleError',
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        ...contextOverride
      };
      processingError = classifyProcessingError(error as Error, context);
    }

    // エラーをログに記録
    logError(processingError);
    
    // 統計に記録
    errorStatsRef.current.recordError(processingError);

    // 状態を更新
    setState(prevState => ({
      ...prevState,
      errors: [...prevState.errors, processingError],
      lastError: processingError,
      errorCount: prevState.errorCount + 1
    }));

    // 外部のエラーハンドラーを呼び出し
    if (onError) {
      onError(processingError);
    }

    // 自動回復が有効で、エラーが回復可能な場合
    if (enableAutoRecovery && processingError.recoverable) {
      return await attemptRecovery(processingError);
    }

    return false;
  }, [enableAutoRecovery, onError]);

  /**
   * エラー回復を試行
   */
  const attemptRecovery = useCallback(async (error: ProcessingError): Promise<boolean> => {
    const errorKey = `${error.type}-${error.context.component}-${error.context.action}`;
    const currentRetryCount = retryCountsRef.current.get(errorKey) || 0;

    if (currentRetryCount >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) reached for error:`, error.type);
      return false;
    }

    setState(prevState => ({ ...prevState, isRecovering: true }));

    try {
      const recoverySuccess = await attemptErrorRecovery(error, currentRetryCount);
      
      // リトライ回数を更新
      retryCountsRef.current.set(errorKey, currentRetryCount + 1);

      // 回復コールバックを呼び出し
      if (onRecovery) {
        onRecovery(error, recoverySuccess);
      }

      if (recoverySuccess) {
        // 回復成功時はエラーを削除
        setState(prevState => ({
          ...prevState,
          errors: prevState.errors.filter(e => e !== error),
          isRecovering: false
        }));
        
        // 成功時はリトライ回数をリセット
        retryCountsRef.current.delete(errorKey);
      } else {
        setState(prevState => ({ ...prevState, isRecovering: false }));
      }

      return recoverySuccess;
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      setState(prevState => ({ ...prevState, isRecovering: false }));
      return false;
    }
  }, [maxRetries, onRecovery]);

  /**
   * ファイル形式を検証
   */
  const validateFile = useCallback((file: File): ProcessingError | null => {
    const validationError = validateFileFormat(file);
    
    if (validationError) {
      // エラーを状態に追加（ログは既にvalidateFileFormat内で記録済み）
      setState(prevState => ({
        ...prevState,
        errors: [...prevState.errors, validationError],
        lastError: validationError,
        errorCount: prevState.errorCount + 1
      }));
      
      errorStatsRef.current.recordError(validationError);
      
      if (onError) {
        onError(validationError);
      }
    }
    
    return validationError;
  }, [onError]);

  /**
   * ブラウザ互換性をチェック
   */
  const checkCompatibility = useCallback((): ProcessingError | null => {
    const compatibilityError = checkBrowserCompatibility();
    
    if (compatibilityError) {
      setState(prevState => ({
        ...prevState,
        errors: [...prevState.errors, compatibilityError],
        lastError: compatibilityError,
        errorCount: prevState.errorCount + 1
      }));
      
      errorStatsRef.current.recordError(compatibilityError);
      
      if (onError) {
        onError(compatibilityError);
      }
    }
    
    return compatibilityError;
  }, [onError]);

  /**
   * すべてのエラーをクリア
   */
  const clearErrors = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      errors: [],
      lastError: null
    }));
    
    // リトライ回数もリセット
    retryCountsRef.current.clear();
  }, []);

  /**
   * 特定のエラーをクリア
   */
  const clearError = useCallback((errorIndex: number) => {
    setState(prevState => {
      const newErrors = [...prevState.errors];
      newErrors.splice(errorIndex, 1);
      
      return {
        ...prevState,
        errors: newErrors,
        lastError: newErrors.length > 0 ? newErrors[newErrors.length - 1] : null
      };
    });
  }, []);

  /**
   * 最後のエラーの回復を再試行
   */
  const retryLastError = useCallback(async (): Promise<boolean> => {
    if (!state.lastError || !state.lastError.recoverable) {
      return false;
    }

    return await attemptRecovery(state.lastError);
  }, [state.lastError, attemptRecovery]);

  /**
   * エラー統計を取得
   */
  const getErrorStatistics = useCallback(() => {
    return errorStatsRef.current.getStatistics();
  }, []);

  const actions: ErrorHandlerActions = {
    handleError,
    validateFile,
    checkCompatibility,
    clearErrors,
    clearError,
    retryLastError,
    getErrorStatistics
  };

  return [state, actions];
}

/**
 * エラーメッセージ表示用のヘルパーフック
 */
export function useErrorMessages() {
  const [state, actions] = useErrorHandler();

  const getDisplayMessages = useCallback(() => {
    return state.errors.map(error => ({
      id: `${error.type}-${error.context.timestamp}`,
      message: generateUserFriendlyMessage(error),
      type: error.type,
      recoverable: error.recoverable,
      timestamp: error.context.timestamp
    }));
  }, [state.errors]);

  return {
    ...state,
    ...actions,
    displayMessages: getDisplayMessages()
  };
}

export default useErrorHandler;