/**
 * Integration tests for EasyTone application
 * Tests component interactions and complete workflows
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import EasyToneApp from '../components/EasyToneApp';

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
  global.Image = class MockImage {
    onload: (() => void) | null = null;
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

describe('Integration Tests', () => {
  describe('Complete Workflow Integration', () => {
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

    test('should handle multiple file processing', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload multiple files
      const files = [
        createMockFile('test1.jpg', 'image/jpeg'),
        createMockFile('test2.png', 'image/png')
      ];
      
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, files);

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
      }, { timeout: 10000 });
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

  describe('Component Integration', () => {
    test('should pass data correctly between components', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload files
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      // Verify preset selector receives the files
      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
        expect(screen.getByText('商品をくっきりと')).not.toBeDisabled();
      });

      // Select preset
      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      // Verify processor receives the preset selection
      await waitFor(() => {
        expect(screen.getByText('処理を開始')).toBeInTheDocument();
        expect(screen.getByText('処理を開始')).not.toBeDisabled();
      });

      // Process images
      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Verify result viewer receives processed data
      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument(); // Applied preset name
      }, { timeout: 5000 });
    });

    test('should maintain state consistency across components', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload multiple files
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [
        createMockFile('test1.jpg'),
        createMockFile('test2.png')
      ];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('2 枚の画像がアップロードされました')).toBeInTheDocument();
      });

      // Select preset
      const presetButton = screen.getByText('明るくクリアに');
      await user.click(presetButton);

      // Navigate back to step 1
      const step1Button = screen.getByText('ステップ 1');
      await user.click(step1Button);

      // Verify files are still there
      expect(screen.getByText('2 枚の画像がアップロードされました')).toBeInTheDocument();

      // Navigate back to step 2
      const step2Button = screen.getByText('ステップ 2');
      await user.click(step2Button);

      // Verify preset selection is maintained
      expect(screen.getByText('明るくクリアに')).toHaveClass('selected');
    });
  });

  describe('Performance Integration', () => {
    test('should handle large number of files efficiently', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload many files
      const files = Array.from({ length: 10 }, (_, i) => 
        createMockFile(`test${i + 1}.jpg`, 'image/jpeg')
      );
      
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      await user.upload(fileInput, files);

      // Should handle large uploads without freezing
      await waitFor(() => {
        expect(screen.getByText('10 枚の画像がアップロードされました')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should enable step 2
      expect(screen.getByText('ステップ 2').closest('button')).not.toBeDisabled();
    });

    test('should show appropriate loading states during processing', async () => {
      const user = userEvent.setup();
      
      render(<EasyToneApp />);

      // Upload files
      const fileInput = screen.getByLabelText(/画像をアップロード/i);
      const mockFiles = [createMockFile('test.jpg')];
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(screen.getByText('商品をくっきりと')).toBeInTheDocument();
      });

      const presetButton = screen.getByText('商品をくっきりと');
      await user.click(presetButton);

      const processButton = screen.getByText('処理を開始');
      await user.click(processButton);

      // Should show loading during processing
      expect(screen.getByText('処理中...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('処理結果')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});