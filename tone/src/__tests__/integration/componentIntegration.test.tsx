/**
 * Integration tests for component interactions
 * Tests the communication and data flow between components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EasyToneApp } from '@/components/EasyToneApp';
import { ImageUploader } from '@/components/ImageUploader';
import { PresetSelectorWithPreview } from '@/components/PresetSelectorWithPreview';
import { ImageProcessor } from '@/components/ImageProcessor';
import { ResultViewer } from '@/components/ResultViewer';

// Mock file for testing
const createMockFile = (name: string, type: string = 'image/jpeg'): File => {
  const content = 'mock image content';
  return new File([content], name, { type });
};

// Mock canvas and image processing
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 100,
      height: 100
    })),
    putImageData: jest.fn(),
    canvas: { toBlob: jest.fn((callback) => callback(new Blob())) }
  })),
  width: 100,
  height: 100
};

beforeAll(() => {
  global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

describe('Component Integration Tests', () => {
  describe('ImageUploader to PresetSelector Integration', () => {
    test('should pass uploaded images to preset selector', async () => {
      const user = userEvent.setup();
      const mockFiles = [
        createMockFile('test1.jpg'),
        createMockFile('test2.png')
      ];

      const onImagesSelected = jest.fn();
      const onPresetSelect = jest.fn();

      render(
        <div>
          <ImageUploader
            onImagesSelected={onImagesSelected}
            acceptedFormats={['image/jpeg', 'image/png']}
            maxFileSize={10 * 1024 * 1024}
          />
          <PresetSelectorWithPreview
            images={[]}
            selectedPreset={null}
            onPresetSelect={onPresetSelect}
          />
        </div>
      );

      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, mockFiles);

      expect(onImagesSelected).toHaveBeenCalledWith(mockFiles);
    });

    test('should enable preset selection after images are uploaded', async () => {
      const user = userEvent.setup();
      const mockImages = [
        {
          id: '1',
          file: createMockFile('test1.jpg'),
          originalUrl: 'mock-url-1',
          metadata: { width: 100, height: 100, size: 1000 },
          status: 'pending' as const
        }
      ];

      const onPresetSelect = jest.fn();

      render(
        <PresetSelectorWithPreview
          images={mockImages}
          selectedPreset={null}
          onPresetSelect={onPresetSelect}
        />
      );

      const presetButton = screen.getByText('商品をくっきりと');
      expect(presetButton).toBeEnabled();

      await user.click(presetButton);
      expect(onPresetSelect).toHaveBeenCalledWith('crisp-product');
    });
  });

  describe('PresetSelector to ImageProcessor Integration', () => {
    test('should trigger processing when preset is selected', async () => {
      const user = userEvent.setup();
      const mockImages = [
        {
          id: '1',
          file: createMockFile('test1.jpg'),
          originalUrl: 'mock-url-1',
          metadata: { width: 100, height: 100, size: 1000 },
          status: 'pending' as const
        }
      ];

      const onProcessingComplete = jest.fn();

      render(
        <div>
          <PresetSelectorWithPreview
            images={mockImages}
            selectedPreset="crisp-product"
            onPresetSelect={() => {}}
          />
          <ImageProcessor
            images={mockImages}
            selectedPreset="crisp-product"
            onProcessingComplete={onProcessingComplete}
          />
        </div>
      );

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      await waitFor(() => {
        expect(onProcessingComplete).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    test('should show processing progress during image processing', async () => {
      const user = userEvent.setup();
      const mockImages = [
        {
          id: '1',
          file: createMockFile('test1.jpg'),
          originalUrl: 'mock-url-1',
          metadata: { width: 100, height: 100, size: 1000 },
          status: 'pending' as const
        }
      ];

      render(
        <ImageProcessor
          images={mockImages}
          selectedPreset="crisp-product"
          onProcessingComplete={() => {}}
        />
      );

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      expect(screen.getByText('処理中...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('ImageProcessor to ResultViewer Integration', () => {
    test('should display processed results in result viewer', async () => {
      const mockOriginalImages = [
        {
          id: '1',
          file: createMockFile('test1.jpg'),
          originalUrl: 'mock-url-1',
          metadata: { width: 100, height: 100, size: 1000 },
          status: 'completed' as const
        }
      ];

      const mockProcessedImages = [
        {
          id: '1',
          originalImage: mockOriginalImages[0],
          processedUrl: 'processed-url-1',
          appliedPreset: 'crisp-product',
          processingTime: 1000,
          fileSize: 1200
        }
      ];

      const onDownloadSingle = jest.fn();
      const onDownloadAll = jest.fn();

      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={onDownloadSingle}
          onDownloadAll={onDownloadAll}
        />
      );

      expect(screen.getByText('処理結果')).toBeInTheDocument();
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText('個別ダウンロード')).toBeInTheDocument();
      expect(screen.getByText('一括ダウンロード')).toBeInTheDocument();
    });

    test('should handle download actions from result viewer', async () => {
      const user = userEvent.setup();
      const mockOriginalImages = [
        {
          id: '1',
          file: createMockFile('test1.jpg'),
          originalUrl: 'mock-url-1',
          metadata: { width: 100, height: 100, size: 1000 },
          status: 'completed' as const
        }
      ];

      const mockProcessedImages = [
        {
          id: '1',
          originalImage: mockOriginalImages[0],
          processedUrl: 'processed-url-1',
          appliedPreset: 'crisp-product',
          processingTime: 1000,
          fileSize: 1200
        }
      ];

      const onDownloadSingle = jest.fn();
      const onDownloadAll = jest.fn();

      render(
        <ResultViewer
          originalImages={mockOriginalImages}
          processedImages={mockProcessedImages}
          onDownloadSingle={onDownloadSingle}
          onDownloadAll={onDownloadAll}
        />
      );

      const singleDownloadButton = screen.getByText('個別ダウンロード');
      await user.click(singleDownloadButton);
      expect(onDownloadSingle).toHaveBeenCalledWith('1');

      const bulkDownloadButton = screen.getByText('一括ダウンロード');
      await user.click(bulkDownloadButton);
      expect(onDownloadAll).toHaveBeenCalled();
    });
  });

  describe('Full Application Integration', () => {
    test('should handle complete workflow from upload to download', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Step 1: Upload images
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      // Step 2: Select preset
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      await waitFor(() => {
        expect(screen.getByText('処理を開始')).toBeInTheDocument();
      });

      // Step 3: Process images
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Step 4: Verify download options are available
      expect(screen.getByText('個別ダウンロード')).toBeInTheDocument();
      expect(screen.getByText('一括ダウンロード')).toBeInTheDocument();
    });

    test('should handle workflow navigation between steps', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Initially should show step 1
      expect(screen.getByText('ステップ 1')).toBeInTheDocument();
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();

      // Upload files to proceed to step 2
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('ステップ 2')).toBeInTheDocument();
      });

      // Select preset to enable step 3
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      await waitFor(() => {
        expect(screen.getByText('ステップ 3')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle file upload errors gracefully', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Try to upload an invalid file
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      await user.upload(fileInput, [invalidFile]);

      await waitFor(() => {
        expect(screen.getByText(/サポートされていないファイル形式/)).toBeInTheDocument();
      });
    });

    test('should handle processing errors and continue with other images', async () => {
      const user = userEvent.setup();
      
      // Mock processing error for one image
      const originalConsoleError = console.error;
      console.error = jest.fn();

      render(<EasyToneApp />);

      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [
        createMockFile('test1.jpg'),
        createMockFile('test2.jpg')
      ];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Should continue processing despite errors
      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });

      console.error = originalConsoleError;
    });
  });
});