/**
 * EasyToneメインアプリケーションコンポーネント
 */

import React, { useState } from 'react';
import { WorkflowStep } from '../types/workflow';
import { ProcessableImage, ProcessedImage } from '../types/processing';
import { FilterPreset } from '../types/filter';
import WorkflowContainer from './WorkflowContainer';
import ImageUploader from './ImageUploader';
import PresetSelectorWithPreview from './PresetSelectorWithPreview';
import ImageProcessor from './ImageProcessor';
import ResultViewer from './ResultViewer';
import styles from './EasyToneApp.module.css';

const EasyToneApp: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<ProcessableImage[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // アクセシビリティ: フォーカス管理
  const stepContentRef = React.useRef<HTMLDivElement>(null);

  // ステップが変わった時にフォーカスを移動
  React.useEffect(() => {
    if (stepContentRef.current) {
      stepContentRef.current.focus();
    }
  }, []);

  const handleImagesUploaded = (images: ProcessableImage[]) => {
    setUploadedImages(images);
    // 画像がアップロードされたらプリセット選択ステップに進む準備ができる
  };

  const handlePresetSelected = (preset: FilterPreset) => {
    setSelectedPreset(preset);
    // プリセットが選択されたら処理ステップに進む準備ができる
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
    console.error('Processing error:', error);
    setIsProcessing(false);
    // エラーハンドリング - 必要に応じてユーザーに通知
  };

  const handleReset = () => {
    setUploadedImages([]);
    setSelectedPreset(null);
    setProcessedImages([]);
    setIsProcessing(false);
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
              onImagesSelected={(files) => {
                const processableImages: ProcessableImage[] = files.map((file, index) => ({
                  id: `image-${Date.now()}-${index}`,
                  file,
                  originalUrl: URL.createObjectURL(file),
                  metadata: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                  },
                  status: 'pending',
                }));
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
              previewImage={uploadedImages[0]?.originalUrl}
              onPresetSelect={(preset) => {
                handlePresetSelected(preset);
                completeStep('preset');
              }}
              selectedPreset={selectedPreset}
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
            
            {isProcessing && selectedPreset && (
              <ImageProcessor
                images={uploadedImages}
                selectedPreset={selectedPreset}
                onProcessingStart={handleProcessingStart}
                onProcessingComplete={(results) => {
                  handleProcessingComplete(results);
                  completeStep('download');
                }}
                onProcessingError={handleProcessingError}
              />
            )}

            {!isProcessing && processedImages.length > 0 && (
              <ResultViewer
                originalImages={uploadedImages}
                processedImages={processedImages}
              />
            )}

            {!isProcessing && processedImages.length === 0 && selectedPreset && (
              <div className={styles.startProcessing}>
                <button
                  type="button"
                  onClick={() => setIsProcessing(true)}
                  className={styles.startButton}
                >
                  処理を開始
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <WorkflowContainer className={styles.easyToneApp}>
      {({ currentStep, completeStep, resetWorkflow }) => (
        <>
          {renderStepContent(currentStep, completeStep)}
          
          {(uploadedImages.length > 0 || processedImages.length > 0) && (
            <div className={styles.resetContainer}>
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  resetWorkflow();
                }}
                className={styles.resetButton}
                aria-label="すべてをリセットして最初からやり直す"
              >
                リセット
              </button>
            </div>
          )}
        </>
      )}
    </WorkflowContainer>
  );
};

export default EasyToneApp;