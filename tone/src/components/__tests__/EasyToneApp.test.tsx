/**
 * EasyToneAppコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EasyToneApp from '../EasyToneApp';

// 依存コンポーネントをモック
jest.mock('../WorkflowContainer', () => {
  return function MockWorkflowContainer({ children }: { children: (props: unknown) => React.ReactNode }) {
    const mockWorkflowProps = {
      currentStep: 'upload',
      completedSteps: [],
      completeStep: jest.fn(),
      goToStep: jest.fn(),
      nextStep: jest.fn(),
      previousStep: jest.fn(),
      resetWorkflow: jest.fn(),
      canProceedToStep: jest.fn(),
    };

    return (
      <div data-testid="workflow-container">
        {children(mockWorkflowProps)}
      </div>
    );
  };
});

jest.mock('../ImageUploader', () => {
  return function MockImageUploader({ onImagesSelected }: { onImagesSelected: (images: unknown[]) => void }) {
    return (
      <div data-testid="image-uploader">
        <button
          onClick={() => {
            const mockFiles = [
              new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
              new File(['test'], 'test2.jpg', { type: 'image/jpeg' }),
            ];
            onImagesSelected(mockFiles);
          }}
        >
          Upload Images
        </button>
      </div>
    );
  };
});

jest.mock('../PresetSelectorWithPreview', () => {
  return function MockPresetSelectorWithPreview({ onPresetSelect }: { onPresetSelect: (presetId: string) => void }) {
    const mockPreset = {
      id: 'crisp-product',
      name: '商品をくっきりと',
      description: 'Test preset',
      icon: '📸',
      filters: {
        brightness: 10,
        contrast: 20,
        saturation: 5,
        hue: 0,
        sharpness: 30,
        warmth: 0,
      },
    };

    return (
      <div data-testid="preset-selector">
        <button onClick={() => onPresetSelect(mockPreset)}>
          Select Preset
        </button>
      </div>
    );
  };
});

jest.mock('../ImageProcessor', () => {
  return function MockImageProcessor({ onProcessingComplete }: { onProcessingComplete: (results: unknown) => void }) {
    return (
      <div data-testid="image-processor">
        <button
          onClick={() => {
            const mockResults = [
              {
                id: 'processed-1',
                originalImage: {
                  id: 'image-1',
                  file: new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
                  originalUrl: 'blob:test1',
                  metadata: { name: 'test1.jpg', size: 1000, type: 'image/jpeg', lastModified: Date.now() },
                  status: 'completed',
                },
                processedUrl: 'blob:processed1',
                appliedPreset: 'crisp-product',
                processingTime: 1000,
                fileSize: 1200,
              },
            ];
            onProcessingComplete(mockResults);
          }}
        >
          Complete Processing
        </button>
      </div>
    );
  };
});

jest.mock('../ResultViewer', () => {
  return function MockResultViewer() {
    return <div data-testid="result-viewer">Results</div>;
  };
});

describe('EasyToneApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // URL.createObjectURLをモック
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render workflow container', () => {
    render(<EasyToneApp />);
    expect(screen.getByTestId('workflow-container')).toBeInTheDocument();
  });

  it('should render upload step initially', () => {
    render(<EasyToneApp />);
    
    expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
    expect(screen.getByText('処理したい画像を選択してください。JPG、PNG、HEIC形式に対応しています。')).toBeInTheDocument();
    expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
  });

  it('should handle image upload', async () => {
    render(<EasyToneApp />);
    
    const uploadButton = screen.getByText('Upload Images');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('2枚の画像がアップロードされました')).toBeInTheDocument();
    });
  });

  it('should show preset selection step content', async () => {
    // WorkflowContainerのモックを更新してpreset stepを返すように
    jest.doMock('../WorkflowContainer', () => {
      return function MockWorkflowContainer({ children }: { children: (props: unknown) => React.ReactNode }) {
        const mockWorkflowProps = {
          currentStep: 'preset',
          completedSteps: ['upload'],
          completeStep: jest.fn(),
          goToStep: jest.fn(),
          nextStep: jest.fn(),
          previousStep: jest.fn(),
          resetWorkflow: jest.fn(),
          canProceedToStep: jest.fn(),
        };

        return (
          <div data-testid="workflow-container">
            {children(mockWorkflowProps)}
          </div>
        );
      };
    });

    // 新しいコンポーネントインスタンスを作成
    const { default: EasyToneAppWithPreset } = await import('../EasyToneApp');
    
    render(<EasyToneAppWithPreset />);
    
    expect(screen.getByText('プリセットを選択')).toBeInTheDocument();
    expect(screen.getByText('お好みのフィルターを選んでください。選択したプリセットが全ての画像に適用されます。')).toBeInTheDocument();
  });

  it('should handle preset selection', async () => {
    render(<EasyToneApp />);
    
    // First upload images
    const uploadButton = screen.getByText('Upload Images');
    fireEvent.click(uploadButton);

    // Then select preset (assuming we're in preset step)
    const selectPresetButton = screen.getByText('Select Preset');
    fireEvent.click(selectPresetButton);

    await waitFor(() => {
      expect(screen.getByText('選択されたプリセット:')).toBeInTheDocument();
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
    });
  });

  it('should show download step with start processing button', async () => {
    // WorkflowContainerのモックを更新してdownload stepを返すように
    jest.doMock('../WorkflowContainer', () => {
      return function MockWorkflowContainer({ children }: { children: (props: unknown) => React.ReactNode }) {
        const mockWorkflowProps = {
          currentStep: 'download',
          completedSteps: ['upload', 'preset'],
          completeStep: jest.fn(),
          goToStep: jest.fn(),
          nextStep: jest.fn(),
          previousStep: jest.fn(),
          resetWorkflow: jest.fn(),
          canProceedToStep: jest.fn(),
        };

        return (
          <div data-testid="workflow-container">
            {children(mockWorkflowProps)}
          </div>
        );
      };
    });

    const { default: EasyToneAppWithDownload } = await import('../EasyToneApp');
    
    render(<EasyToneAppWithDownload />);
    
    expect(screen.getByText('結果とダウンロード')).toBeInTheDocument();
  });

  it('should handle processing completion', async () => {
    render(<EasyToneApp />);
    
    // Simulate going through the workflow
    const uploadButton = screen.getByText('Upload Images');
    fireEvent.click(uploadButton);

    const selectPresetButton = screen.getByText('Select Preset');
    fireEvent.click(selectPresetButton);

    // Start processing
    const startButton = screen.getByText('処理を開始');
    fireEvent.click(startButton);

    // Complete processing
    const completeButton = screen.getByText('Complete Processing');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByTestId('result-viewer')).toBeInTheDocument();
    });
  });

  it('should show reset button when images are uploaded', async () => {
    render(<EasyToneApp />);
    
    const uploadButton = screen.getByText('Upload Images');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('リセット')).toBeInTheDocument();
    });
  });

  it('should handle reset functionality', async () => {
    render(<EasyToneApp />);
    
    // Upload images
    const uploadButton = screen.getByText('Upload Images');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('2枚の画像がアップロードされました')).toBeInTheDocument();
    });

    // Reset
    const resetButton = screen.getByText('リセット');
    fireEvent.click(resetButton);

    // Should not show uploaded images info anymore
    expect(screen.queryByText('2枚の画像がアップロードされました')).not.toBeInTheDocument();
  });

  it('should show processing state correctly', async () => {
    render(<EasyToneApp />);
    
    // Go through workflow to processing step
    const uploadButton = screen.getByText('Upload Images');
    fireEvent.click(uploadButton);

    const selectPresetButton = screen.getByText('Select Preset');
    fireEvent.click(selectPresetButton);

    const startButton = screen.getByText('処理を開始');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('処理中...')).toBeInTheDocument();
      expect(screen.getByText('画像を処理しています。しばらくお待ちください。')).toBeInTheDocument();
    });
  });
});