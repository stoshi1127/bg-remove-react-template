"use client";

/**
 * EasyToneメインアプリケーションコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { WorkflowStep } from '../types/workflow';
import { ProcessableImage, ProcessedImage, BatchProcessingResult } from '../types/processing';
import { FilterPreset } from '../types/filter';
import { getPresetById } from '../constants/presets';
import WorkflowContainer from './WorkflowContainer';
import ImageUploader from './ImageUploader';
import PresetSelectorWithPreview from './PresetSelectorWithPreview';
import ImageProcessor from './ImageProcessor';
import ResultViewer from './ResultViewer';
import { ErrorBoundary } from './ErrorBoundary';
import { useErrorHandler } from '../hooks/useErrorHandler';
import Notification from './Notification';
import ServiceIntegrationStatus from './ServiceIntegrationStatus';
import RecommendedServices from './RecommendedServices';
import styles from './EasyToneApp.module.css';

const EasyToneApp: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<ProcessableImage[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // エラーハンドリング
  const [errorState, errorActions] = useErrorHandler({
    enableAutoRecovery: true,
    onError: (error) => {
      console.error('Application error:', error);
    }
  });

  // アクセシビリティ: フォーカス管理
  const stepContentRef = React.useRef<HTMLDivElement>(null);

  // ステップが変わった時にフォーカスを移動
  React.useEffect(() => {
    if (stepContentRef.current) {
      stepContentRef.current.focus();
    }
  }, []);

  // ブラウザ互換性チェック
  useEffect(() => {
    const compatibilityError = errorActions.checkCompatibility();
    if (compatibilityError) {
      console.warn('Browser compatibility issue detected:', compatibilityError);
    }
  }, [errorActions]);

  const handleImagesUploaded = (images: ProcessableImage[]) => {
    setUploadedImages(images);
    // エラー状態をクリア（新しい画像がアップロードされた場合）
    errorActions.clearErrors();
  };

  const handlePresetSelected = (preset: FilterPreset) => {
    setSelectedPreset(preset);
    // エラー状態をクリア（新しいプリセットが選択された場合）
    errorActions.clearErrors();
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  const handleProcessingComplete = (results: ProcessedImage[]) => {
    setProcessedImages(results);
    setIsProcessing(false);
    // 処理が完了したらダウンロードステップに進む準備ができる
  };

  const handleProcessingError = (error: Error) => {
    errorActions.handleError(error, {
      component: 'EasyToneApp',
      action: 'imageProcessing'
    });
    setIsProcessing(false);
  };

  const handleReset = () => {
    setUploadedImages([]);
    setSelectedPreset(null);
    setProcessedImages([]);
    setIsProcessing(false);
    errorActions.clearErrors();
  };

  const handleRetry = async () => {
    if (errorState.lastError && errorState.lastError.recoverable) {
      const success = await errorActions.retryLastError();
      if (success) {
        // リトライが成功した場合、処理を再開
        if (selectedPreset && uploadedImages.length > 0 && processedImages.length === 0) {
          setIsProcessing(true);
        }
      }
    }
  };

  const renderStepContent = (
    currentStep: WorkflowStep,
    completeStep: (step: WorkflowStep) => void
  ) => {
    switch (currentStep) {
      case 'upload':
        return (
          <div 
            className={styles.stepContent}
            ref={stepContentRef}
            tabIndex={-1}
            role="region"
            aria-labelledby="step-upload-title"
            aria-describedby="step-upload-description"
          >
            <div className={styles.stepHeader}>
              <h2 id="step-upload-title" className={styles.stepTitle}>画像をアップロード</h2>
              <p id="step-upload-description" className={styles.stepDescription}>
                処理したい画像を選択してください。JPG、PNG、HEIC形式に対応しています。
              </p>
            </div>
            <ImageUploader
              onImagesSelected={(processableImages) => {
                // ImageUploaderは既にProcessableImage[]を返すので、そのまま使用
                handleImagesUploaded(processableImages);
                completeStep('upload');
              }}
            />
            {uploadedImages.length > 0 && (
              <div 
                className={styles.uploadedImagesInfo}
                role="status"
                aria-live="polite"
                aria-label="アップロード完了通知"
              >
                <p>{uploadedImages.length}枚の画像がアップロードされました</p>
              </div>
            )}
          </div>
        );

      case 'preset':
        return (
          <div 
            className={styles.stepContent}
            role="region"
            aria-labelledby="step-preset-title"
            aria-describedby="step-preset-description"
          >
            <div className={styles.stepHeader}>
              <h2 id="step-preset-title" className={styles.stepTitle}>プリセットを選択</h2>
              <p id="step-preset-description" className={styles.stepDescription}>
                お好みのフィルターを選んでください。選択したプリセットが全ての画像に適用されます。
              </p>
            </div>
            <PresetSelectorWithPreview
              previewImage={uploadedImages[0]?.file}
              onPresetSelect={(presetId) => {
                // プリセットIDから実際のプリセットオブジェクトを取得
                const preset = getPresetById(presetId);
                if (preset) {
                  handlePresetSelected(preset);
                  completeStep('preset');
                }
              }}
              selectedPreset={selectedPreset?.id || null}
            />
            {selectedPreset && (
              <div 
                className={styles.selectedPresetInfo}
                role="status"
                aria-live="polite"
                aria-label="プリセット選択完了通知"
              >
                <p>選択されたプリセット: <strong>{selectedPreset.name}</strong></p>
              </div>
            )}
          </div>
        );

      case 'download':
        return (
          <div 
            className={styles.stepContent}
            role="region"
            aria-labelledby="step-download-title"
            aria-describedby="step-download-description"
            aria-live="polite"
          >
            <div className={styles.stepHeader}>
              <h2 id="step-download-title" className={styles.stepTitle}>
                {isProcessing ? '処理中...' : '結果とダウンロード'}
              </h2>
              <p id="step-download-description" className={styles.stepDescription}>
                {isProcessing
                  ? '画像を処理しています。しばらくお待ちください。'
                  : '処理が完了しました。結果を確認してダウンロードしてください。'}
              </p>
            </div>
            
            {selectedPreset && processedImages.length === 0 && (
              <ImageProcessor
                images={uploadedImages}
                selectedPreset={selectedPreset}
                onProcessingStart={handleProcessingStart}
                onProcessingComplete={(results: BatchProcessingResult) => {
                  handleProcessingComplete(results.processedImages);
                  completeStep('download');
                }}
                onProcessingError={(errorMessage: string) => {
                  handleProcessingError(new Error(errorMessage));
                }}
              />
            )}

            {processedImages.length > 0 && (
              <>
                <ResultViewer
                  originalImages={uploadedImages}
                  processedImages={processedImages}
                />
                
                {/* QuickToolsサービス統合 */}
                <div className={styles.serviceIntegration}>
                  <ServiceIntegrationStatus className={styles.integrationStatus} />
                  
                  <RecommendedServices
                    className={styles.recommendedServices}
                    processedImages={processedImages.map(img => ({
                      id: img.id,
                      url: img.processedUrl,
                      name: img.originalImage.file.name,
                      metadata: img.originalImage.metadata
                    }))}
                    onServiceSelect={(serviceId) => {
                      console.log(`Navigating to service: ${serviceId}`);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('Application-level error:', error);
      }}
    >
      <div className={styles.easyToneApp}>
        {/* エラー通知 */}
        {errorState.errors.length > 0 && (
          <div className={styles.errorNotifications}>
            {errorState.errors.slice(-3).map((error, index) => (
              <div key={`${error.type}-${error.context.timestamp}-${index}`} className={styles.errorContainer}>
                <Notification
                  type="error"
                  message={error.message}
                  onClose={() => errorActions.clearError(errorState.errors.length - 3 + index)}
                  autoClose={error.type !== 'BROWSER_COMPATIBILITY'}
                />
                {error.recoverable && errorState.lastError === error && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className={styles.retryButton}
                    disabled={errorState.isRecovering}
                    aria-label="エラーからの回復を試行"
                  >
                    {errorState.isRecovering ? '回復中...' : '再試行'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        <WorkflowContainer className={styles.workflowContainer}>
          {({ currentStep, completeStep, resetWorkflow, validateStepData }) => {
            const enhancedCompleteStep = (step: WorkflowStep) => {
              // データ検証を行ってからステップを完了
              let isValid = false;
              switch (step) {
                case 'upload':
                  isValid = validateStepData(step, uploadedImages);
                  break;
                case 'preset':
                  isValid = validateStepData(step, selectedPreset);
                  break;
                case 'download':
                  isValid = validateStepData(step, processedImages);
                  break;
              }
              
              if (isValid) {
                completeStep(step);
              } else {
                console.warn(`Step ${step} validation failed`);
              }
            };

            return (
              <>
                {renderStepContent(currentStep, enhancedCompleteStep)}
                
                {(uploadedImages.length > 0 || processedImages.length > 0) && (
                  <div className={styles.resetContainer}>
                    <button
                      type="button"
                      onClick={() => {
                        handleReset();
                        resetWorkflow();
                        errorActions.clearErrors();
                      }}
                      className={styles.resetButton}
                      aria-label="すべてをリセットして最初からやり直す"
                    >
                      リセット
                    </button>
                  </div>
                )}
              </>
            );
          }}
        </WorkflowContainer>
      </div>
    </ErrorBoundary>
  );
};

export default EasyToneApp;