/**
 * Integration tests for the complete file processing pipeline
 * Tests the end-to-end flow from file upload to processed output
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { EasyToneApp } from '@/components/EasyToneApp';
import { heicConverter } from '@/utils/heicConverter';
import { downloadUtils } from '@/utils/downloadUtils';
import { PRESETS } from '@/constants/presets';

// Mock external dependencies
jest.mock('@/utils/heicConverter');
jest.mock('@/utils/downloadUtils');

const mockHeicConverter = heicConverter as jest.Mocked<typeof heicConverter>;
const mockDownloadUtils = downloadUtils as jest.Mocked<typeof downloadUtils>;

// Mock file creation utilities with smaller test files
const createMockFile = (name: string, type: string = 'image/jpeg', size: number = 100): File => {
  const content = new Array(size).fill('x').join('');
  return new File([content], name, { type });
};

const createMockImageData = (width: number = 10, height: number = 10): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;     // R
    data[i + 1] = 0;   // G
    data[i + 2] = 0;   // B
    data[i + 3] = 255; // A
  }
  return new ImageData(data, width, height);
};

// Mock canvas and image processing
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => createMockImageData()),
    putImageData: jest.fn(),
    canvas: { 
      toBlob: jest.fn((callback) => {
        const blob = new Blob(['processed-image-data'], { type: 'image/jpeg' });
        callback(blob);
      }),
      width: 100,
      height: 100
    }
  })),
  width: 100,
  height: 100
};

beforeAll(() => {
  global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
  global.URL.revokeObjectURL = jest.fn();
  global.Image = class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src: string = '';
    width: number = 100;
    height: number = 100;
    
    constructor() {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 10);
    }
  } as unknown as typeof Worker;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockHeicConverter.convertHeicToJpeg.mockResolvedValue(new Blob(['converted'], { type: 'image/jpeg' }));
  mockDownloadUtils.downloadFile.mockResolvedValue();
  mockDownloadUtils.downloadZip.mockResolvedValue();
});

describe('File Processing Pipeline Integration Tests', () => {
  describe('JPEG/PNG Processing Pipeline', () => {
    test('should process JPEG files through complete pipeline', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Step 1: Upload JPEG file
      const jpegFile = createMockFile('test.jpg', 'image/jpeg', 50000);
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, [jpegFile]);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      // Step 2: Select preset and verify it's applied
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      // Step 3: Process the image
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Verify processing completes
      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify the processed image is displayed
      expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      expect(screen.getByText('個別ダウンロード')).toBeInTheDocument();
    });

    test('should process PNG files through complete pipeline', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Step 1: Upload PNG file
      const pngFile = createMockFile('test.png', 'image/png', 75000);
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, [pngFile]);

      await waitFor(() => {
        expect(screen.getByText('明るくクリアに')).toBeInTheDocument();
      });

      // Step 2: Select different preset
      const presetButton = screen.getByText('明るくクリアに');
      await user.click(presetButton);

      // Step 3: Process the image
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Verify processing completes
      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText('明るくクリアに')).toBeInTheDocument();
    });
  });

  describe('HEIC Processing Pipeline', () => {
    test('should convert HEIC files and process them', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Step 1: Upload HEIC file
      const heicFile = createMockFile('test.heic', 'image/heic', 100000);
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, [heicFile]);

      // Verify HEIC conversion was called
      await waitFor(() => {
        expect(mockHeicConverter.convertHeicToJpeg).toHaveBeenCalledWith(heicFile);
      });

      await waitFor(() => {
        expect(screen.getByText('暖かみのある雰囲気')).toBeInTheDocument();
      });

      // Step 2: Select preset
      const presetButton = screen.getByText('暖かみのある雰囲気');
      await user.click(presetButton);

      // Step 3: Process the converted image
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Verify processing completes
      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText('暖かみのある雰囲気')).toBeInTheDocument();
    });

    test('should handle HEIC conversion errors gracefully', async () => {
      const user = userEvent.setup();
      mockHeicConverter.convertHeicToJpeg.mockRejectedValue(new Error('HEIC conversion failed'));
      
      render(<EasyToneApp />);

      const heicFile = createMockFile('test.heic', 'image/heic');
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, [heicFile]);

      await waitFor(() => {
        expect(screen.getByText(/HEIC変換に失敗しました/)).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Files Processing Pipeline', () => {
    test('should process multiple files of different formats', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload multiple files
      const files = [
        createMockFile('test1.jpg', 'image/jpeg'),
        createMockFile('test2.png', 'image/png'),
        createMockFile('test3.heic', 'image/heic')
      ];
      
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, files);

      // Wait for all files to be processed (including HEIC conversion)
      await waitFor(() => {
        expect(screen.getByText('クールで都会的')).toBeInTheDocument();
      });

      // Select preset
      const presetButton = screen.getByText('クールで都会的');
      await user.click(presetButton);

      // Process all images
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Verify all images are processed
      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
        expect(screen.getByText('3 / 3 完了')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    test('should show progress during batch processing', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload multiple files
      const files = Array.from({ length: 5 }, (_, i) => 
        createMockFile(`test${i + 1}.jpg`, 'image/jpeg')
      );
      
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Verify progress is shown
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Verify completion
      await waitFor(() => {
        expect(screen.getByText('5 / 5 完了')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Filter Application Pipeline', () => {
    test('should apply correct filter settings for each preset', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      const file = createMockFile('test.jpg', 'image/jpeg');
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, [file]);

      // Test each preset
      for (const [, preset] of Object.entries(PRESETS)) {
        await waitFor(() => {
          expect(screen.getByText(preset.name)).toBeInTheDocument();
        });

        const presetButton = screen.getByText(preset.name);
        await user.click(presetButton);

        const processButton = screen.getByText('処理を開始');
        await user.click(processButton);

        await waitFor(() => {
          expect(screen.getByText('処理結果')).toBeInTheDocument();
        }, { timeout: 5000 });

        // Verify the correct preset name is displayed
        expect(screen.getByText(preset.name)).toBeInTheDocument();

        // Reset for next test
        const newUploadButton = screen.getByText('新しい画像をアップロード');
        await user.click(newUploadButton);
        
        await user.upload(fileInput, [file]);
      }
    });
  });

  describe('Download Pipeline', () => {
    test('should handle individual file downloads', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      const file = createMockFile('test.jpg', 'image/jpeg');
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, [file]);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText('個別ダウンロード')).toBeInTheDocument();
      }, { timeout: 5000 });

      const downloadButton = screen.getByText('個別ダウンロード');
      await user.click(downloadButton);

      expect(mockDownloadUtils.downloadFile).toHaveBeenCalled();
    });

    test('should handle bulk ZIP downloads', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      const files = [
        createMockFile('test1.jpg', 'image/jpeg'),
        createMockFile('test2.jpg', 'image/jpeg')
      ];
      
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText('一括ダウンロード')).toBeInTheDocument();
      }, { timeout: 5000 });

      const bulkDownloadButton = screen.getByText('一括ダウンロード');
      await user.click(bulkDownloadButton);

      expect(mockDownloadUtils.downloadZip).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Pipeline', () => {
    test('should continue processing other files when one fails', async () => {
      const user = userEvent.setup();
      
      // Mock one file to fail processing
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      let callCount = 0;
      HTMLCanvasElement.prototype.getContext = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Processing failed');
        }
        return mockCanvas.getContext();
      });

      render(<EasyToneApp />);

      const files = [
        createMockFile('test1.jpg', 'image/jpeg'),
        createMockFile('test2.jpg', 'image/jpeg')
      ];
      
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Should show partial completion
      await waitFor(() => {
        expect(screen.getByText(/1 \/ 2 完了/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Restore original function
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    test('should handle memory constraints gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock memory constraint error
      const originalGetImageData = mockCanvas.getContext().getImageData;
      mockCanvas.getContext().getImageData = jest.fn(() => {
        throw new Error('Out of memory');
      });

      render(<EasyToneApp />);

      const file = createMockFile('large-image.jpg', 'image/jpeg', 10000000); // 10MB
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, [file]);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      await waitFor(() => {
        expect(screen.getByText(/メモリ不足/)).toBeInTheDocument();
      });

      // Restore original function
      mockCanvas.getContext().getImageData = originalGetImageData;
    });
  });
});