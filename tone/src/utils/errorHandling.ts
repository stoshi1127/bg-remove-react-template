/**
 * 包括的なエラーハンドリングユーティリティ
 * Requirements: 3.3, 8.4
 */

export interface BrowserCapabilities {
  webWorkers: boolean;
  canvas: boolean;
  fileAPI: boolean;
  webGL: boolean;
  imageData: boolean;
  offscreenCanvas: boolean;
}

export interface ErrorContext {
  component: string;
  action: string;
  timestamp: number;
  userAgent: string;
  url: string;
  additionalInfo?: Record<string, unknown>;
}

export interface ProcessingError {
  type: 'FILE_FORMAT' | 'PROCESSING' | 'MEMORY' | 'BROWSER_COMPATIBILITY' | 'NETWORK' | 'UNKNOWN';
  message: string;
  originalError?: Error;
  context: ErrorContext;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: ProcessingError) => boolean;
  recover: (error: ProcessingError, retryCount: number) => Promise<boolean>;
  maxRetries: number;
}

/**
 * サポートされているファイル形式
 */
export const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic', '.heif'],
  'image/webp': ['.webp']
};

/**
 * ブラウザ機能をチェック
 */
export function checkBrowserCapabilities(): BrowserCapabilities {
  const capabilities: BrowserCapabilities = {
    webWorkers: false,
    canvas: false,
    fileAPI: false,
    webGL: false,
    imageData: false,
    offscreenCanvas: false
  };

  try {
    // Web Workers サポート
    capabilities.webWorkers = typeof Worker !== 'undefined';
  } catch (e) {
    capabilities.webWorkers = false;
  }

  try {
    // Canvas サポート
    const canvas = document.createElement('canvas');
    capabilities.canvas = !!(canvas.getContext && canvas.getContext('2d'));
  } catch (e) {
    capabilities.canvas = false;
  }

  try {
    // File API サポート
    capabilities.fileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob);
  } catch (e) {
    capabilities.fileAPI = false;
  }

  try {
    // WebGL サポート
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    capabilities.webGL = !!gl;
  } catch (e) {
    capabilities.webGL = false;
  }

  try {
    // ImageData サポート
    capabilities.imageData = typeof ImageData !== 'undefined';
  } catch (e) {
    capabilities.imageData = false;
  }

  try {
    // OffscreenCanvas サポート
    capabilities.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  } catch (e) {
    capabilities.offscreenCanvas = false;
  }

  return capabilities;
}

/**
 * ファイル形式エラーをチェック
 */
export function validateFileFormat(file: File): ProcessingError | null {
  const context: ErrorContext = {
    component: 'FileValidator',
    action: 'validateFormat',
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    additionalInfo: {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    }
  };

  // ファイルタイプチェック
  if (!file.type) {
    return {
      type: 'FILE_FORMAT',
      message: 'ファイル形式を判定できません。',
      context,
      recoverable: false,
      suggestedAction: 'サポートされている形式（JPG、PNG、HEIC）のファイルを選択してください。'
    };
  }

  // サポートされている形式かチェック
  const supportedTypes = Object.keys(SUPPORTED_FILE_TYPES);
  if (!supportedTypes.includes(file.type)) {
    return {
      type: 'FILE_FORMAT',
      message: `サポートされていないファイル形式です: ${file.type}`,
      context,
      recoverable: false,
      suggestedAction: `サポートされている形式（${supportedTypes.join(', ')}）のファイルを選択してください。`
    };
  }

  // ファイル拡張子チェック
  const fileExtension = file.name.toLowerCase().split('.').pop();
  if (fileExtension && file.type in SUPPORTED_FILE_TYPES) {
    const expectedExtensions = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES];
    const normalizedExtension = `.${fileExtension}`;
    
    if (!expectedExtensions.includes(normalizedExtension)) {
      return {
        type: 'FILE_FORMAT',
        message: `ファイル拡張子（${normalizedExtension}）がファイル形式（${file.type}）と一致しません。`,
        context,
        recoverable: true,
        suggestedAction: 'ファイル名を確認するか、正しい形式のファイルを選択してください。'
      };
    }
  }

  // ファイルサイズチェック（100MB制限）
  const maxFileSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxFileSize) {
    return {
      type: 'FILE_FORMAT',
      message: `ファイルサイズが大きすぎます: ${Math.round(file.size / 1024 / 1024)}MB`,
      context,
      recoverable: false,
      suggestedAction: `ファイルサイズを${Math.round(maxFileSize / 1024 / 1024)}MB以下に圧縮してください。`
    };
  }

  // 空ファイルチェック
  if (file.size === 0) {
    return {
      type: 'FILE_FORMAT',
      message: 'ファイルが空です。',
      context,
      recoverable: false,
      suggestedAction: '有効な画像ファイルを選択してください。'
    };
  }

  return null;
}

/**
 * ブラウザ互換性エラーをチェック
 */
export function checkBrowserCompatibility(): ProcessingError | null {
  const capabilities = checkBrowserCapabilities();
  const context: ErrorContext = {
    component: 'BrowserCompatibilityChecker',
    action: 'checkCompatibility',
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    additionalInfo: { capabilities }
  };

  // 必須機能のチェック
  const requiredCapabilities: (keyof BrowserCapabilities)[] = [
    'canvas',
    'fileAPI',
    'imageData'
  ];

  const missingCapabilities = requiredCapabilities.filter(
    capability => !capabilities[capability]
  );

  if (missingCapabilities.length > 0) {
    return {
      type: 'BROWSER_COMPATIBILITY',
      message: `お使いのブラウザは必要な機能をサポートしていません: ${missingCapabilities.join(', ')}`,
      context,
      recoverable: false,
      suggestedAction: '最新のブラウザ（Chrome、Firefox、Safari、Edge）をご利用ください。'
    };
  }

  // Web Workers の警告（必須ではないが推奨）
  if (!capabilities.webWorkers) {
    return {
      type: 'BROWSER_COMPATIBILITY',
      message: 'Web Workersがサポートされていないため、処理速度が低下する可能性があります。',
      context,
      recoverable: true,
      suggestedAction: '最新のブラウザにアップデートすることをお勧めします。'
    };
  }

  return null;
}

/**
 * 処理エラーを分類
 */
export function classifyProcessingError(error: Error, context: ErrorContext): ProcessingError {
  const errorMessage = error.message.toLowerCase();

  // メモリエラー
  if (errorMessage.includes('memory') || errorMessage.includes('heap') || 
      errorMessage.includes('out of memory')) {
    return {
      type: 'MEMORY',
      message: 'メモリ不足により処理を完了できませんでした。',
      originalError: error,
      context,
      recoverable: true,
      suggestedAction: '他のタブやアプリケーションを閉じて、再度お試しください。'
    };
  }

  // Canvas関連エラー
  if (errorMessage.includes('canvas') || errorMessage.includes('context')) {
    return {
      type: 'PROCESSING',
      message: '画像処理中にエラーが発生しました。',
      originalError: error,
      context,
      recoverable: true,
      suggestedAction: 'ページを再読み込みして、再度お試しください。'
    };
  }

  // ファイル読み込みエラー
  if (errorMessage.includes('load') || errorMessage.includes('read') || 
      errorMessage.includes('decode')) {
    return {
      type: 'FILE_FORMAT',
      message: 'ファイルの読み込みに失敗しました。',
      originalError: error,
      context,
      recoverable: true,
      suggestedAction: 'ファイルが破損していないか確認し、再度お試しください。'
    };
  }

  // ネットワークエラー
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
      errorMessage.includes('connection')) {
    return {
      type: 'NETWORK',
      message: 'ネットワークエラーが発生しました。',
      originalError: error,
      context,
      recoverable: true,
      suggestedAction: 'インターネット接続を確認し、再度お試しください。'
    };
  }

  // その他のエラー
  return {
    type: 'UNKNOWN',
    message: '予期しないエラーが発生しました。',
    originalError: error,
    context,
    recoverable: true,
    suggestedAction: 'ページを再読み込みして、再度お試しください。'
  };
}

/**
 * エラー回復戦略
 */
export const errorRecoveryStrategies: Record<ProcessingError['type'], ErrorRecoveryStrategy> = {
  FILE_FORMAT: {
    canRecover: (error) => error.recoverable,
    recover: async (error, retryCount) => {
      // ファイル形式エラーは基本的に回復不可能
      return false;
    },
    maxRetries: 0
  },

  PROCESSING: {
    canRecover: (error) => error.recoverable,
    recover: async (error, retryCount) => {
      // 処理エラーは少し待ってからリトライ
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      return retryCount < 3;
    },
    maxRetries: 3
  },

  MEMORY: {
    canRecover: (error) => error.recoverable,
    recover: async (error, retryCount) => {
      // メモリエラーはガベージコレクションを促進してリトライ
      if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
        (window as unknown as { gc: () => void }).gc();
      }
      
      // より長い待機時間
      await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      return retryCount < 2;
    },
    maxRetries: 2
  },

  BROWSER_COMPATIBILITY: {
    canRecover: (error) => false,
    recover: async (error, retryCount) => {
      // ブラウザ互換性エラーは回復不可能
      return false;
    },
    maxRetries: 0
  },

  NETWORK: {
    canRecover: (error) => error.recoverable,
    recover: async (error, retryCount) => {
      // ネットワークエラーは指数バックオフでリトライ
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryCount < 3;
    },
    maxRetries: 3
  },

  UNKNOWN: {
    canRecover: (error) => error.recoverable,
    recover: async (error, retryCount) => {
      // 不明なエラーは短いリトライ
      await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      return retryCount < 2;
    },
    maxRetries: 2
  }
};

/**
 * エラーを回復を試行
 */
export async function attemptErrorRecovery(
  error: ProcessingError,
  retryCount: number = 0
): Promise<boolean> {
  const strategy = errorRecoveryStrategies[error.type];
  
  if (!strategy.canRecover(error) || retryCount >= strategy.maxRetries) {
    return false;
  }

  try {
    return await strategy.recover(error, retryCount);
  } catch (recoveryError) {
    console.error('Error recovery failed:', recoveryError);
    return false;
  }
}

/**
 * エラーログを記録
 */
export function logError(error: ProcessingError): void {
  const logData = {
    type: error.type,
    message: error.message,
    context: error.context,
    recoverable: error.recoverable,
    suggestedAction: error.suggestedAction,
    originalError: error.originalError ? {
      name: error.originalError.name,
      message: error.originalError.message,
      stack: error.originalError.stack
    } : undefined
  };

  // コンソールにログ出力
  console.error('Processing Error:', logData);

  // 本番環境では外部ログサービスに送信することも可能
  if (process.env.NODE_ENV === 'production') {
    // 例: 外部ログサービスへの送信
    // sendToLogService(logData);
  }
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 */
export function generateUserFriendlyMessage(error: ProcessingError): string {
  const baseMessage = error.message;
  const suggestion = error.suggestedAction;
  
  if (suggestion) {
    return `${baseMessage}\n\n${suggestion}`;
  }
  
  return baseMessage;
}

/**
 * エラー統計を収集
 */
export class ErrorStatistics {
  private static instance: ErrorStatistics;
  private errorCounts: Map<ProcessingError['type'], number> = new Map();
  private totalErrors: number = 0;

  static getInstance(): ErrorStatistics {
    if (!ErrorStatistics.instance) {
      ErrorStatistics.instance = new ErrorStatistics();
    }
    return ErrorStatistics.instance;
  }

  recordError(error: ProcessingError): void {
    this.totalErrors++;
    const currentCount = this.errorCounts.get(error.type) || 0;
    this.errorCounts.set(error.type, currentCount + 1);
  }

  getStatistics() {
    return {
      totalErrors: this.totalErrors,
      errorsByType: Object.fromEntries(this.errorCounts),
      mostCommonError: this.getMostCommonError()
    };
  }

  private getMostCommonError(): ProcessingError['type'] | null {
    let maxCount = 0;
    let mostCommon: ProcessingError['type'] | null = null;

    for (const [type, count] of this.errorCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = type;
      }
    }

    return mostCommon;
  }

  reset(): void {
    this.errorCounts.clear();
    this.totalErrors = 0;
  }
}